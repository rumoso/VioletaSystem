-- ============================================================
-- METAL DEL TALLER: PERMITIR REAPLICAR TRAS UNA REVERSA
-- (analisis/029-encargado-de-taller-y-bloqueo.md)
--
-- Al desbloquear un folio (regresarlo de Finalizado/Mostrador) se
-- reversan el metal final y, si se regresa hasta Pedido, también la
-- asignación de metal al técnico. Los dos SPs bloqueaban con un EXISTS
-- sobre el kardex, así que después de la reversa el folio ya no podía
-- volver a avanzar: "el metal ya se había movido".
--
-- Ahora la guarda mira si el movimiento SIGUE VIGENTE, comparando contra
-- sus reversas (`REVERSA_ASIGNACION` / `REVERSA_METAL_FINAL`). La reversa
-- por cancelación sigue usando `REVERSA` y no reabre nada, porque un
-- folio cancelado no avanza.
--
-- Aplica en LOCAL y PRODUCCIÓN, después de StoreProcedures_Taller.sql.
-- Idempotente (DROP + CREATE).
-- ============================================================

DROP PROCEDURE IF EXISTS `asignarMetalInventarioByTaller`;
DROP PROCEDURE IF EXISTS `entregarMetalFinalByTaller`;

DELIMITER $$

CREATE PROCEDURE `asignarMetalInventarioByTaller`(
  IN p_oGetDateNow DATETIME
, IN p_idTaller    BIGINT
, IN p_idUserLogOn BIGINT
)
proc: BEGIN

	DECLARE v_idSucursal INT;
	DECLARE v_idSale VARCHAR(100);
	DECLARE v_idCustomer BIGINT;
	DECLARE v_idTecnico BIGINT;
	DECLARE v_finoOroNecesario DECIMAL(18,2) DEFAULT 0;
	DECLARE v_finoPlataNecesario DECIMAL(18,2) DEFAULT 0;
	DECLARE v_finoOroDisponible DECIMAL(18,2) DEFAULT 0;
	DECLARE v_finoPlataDisponible DECIMAL(18,2) DEFAULT 0;
	DECLARE v_sinProducto INT DEFAULT 0;

	DECLARE done INT DEFAULT 0;
	DECLARE c_tipo VARCHAR(45);
	DECLARE c_gramos DECIMAL(18,2);
	DECLARE c_kilates DECIMAL(18,2);
	DECLARE c_idProduct BIGINT;

	DECLARE cur_agranel CURSOR FOR
		SELECT MA.tipo, MA.gramos, MA.kilates,
			( SELECT idProduct FROM products WHERE barCode = CONCAT( 'METAL-', UPPER(MA.tipo), '-', CAST(MA.kilates AS UNSIGNED) ) LIMIT 1 )
		FROM taller_metal_agranel AS MA WHERE MA.idTaller = p_idTaller;

	DECLARE cur_cliente CURSOR FOR
		SELECT MC.tipo, MC.gramos, MC.kilates,
			( SELECT idProduct FROM products WHERE barCode = CONCAT( 'METAL-', UPPER(MC.tipo), '-', CAST(MC.kilates AS UNSIGNED) ) LIMIT 1 )
		FROM taller_metal_cliente AS MC WHERE MC.idTaller = p_idTaller;

	DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

	SET @out_id = 0;
	SET @message = '';

	SELECT idSucursal, idSale, idCustomer INTO v_idSucursal, v_idSale, v_idCustomer
	FROM taller WHERE idTaller = p_idTaller LIMIT 1;

	-- Técnico que recibe el metal: el primero registrado en mano de obra
	SET v_idTecnico = (
		SELECT idUserTecnico FROM taller_mano_obra
		WHERE idTaller = p_idTaller ORDER BY createDate ASC, idManoObra ASC LIMIT 1
	);

	-- Nada que mover
	IF NOT EXISTS ( SELECT 1 FROM taller_metal_agranel WHERE idTaller = p_idTaller )
	AND NOT EXISTS ( SELECT 1 FROM taller_metal_cliente WHERE idTaller = p_idTaller ) THEN
		SET @out_id = 2;
		SET @message = 'El folio no tiene metal que mover.';
		SELECT @out_id AS out_id, @message AS message;
		LEAVE proc;
	END IF;

	-- Ya se movió antes (re-asignación tras rechazo de firma, etc.)
	-- Bloquea solo si la asignación SIGUE VIGENTE. Al desbloquear un folio
	-- (analisis/029) se reversa con tipoMovimiento 'REVERSA_ASIGNACION', y
	-- entonces el folio puede volver a asignarse al avanzar de nuevo.
	IF ( SELECT COUNT(*) FROM metal_inventario_track WHERE idTaller = p_idTaller AND tipoMovimiento = 'ASIGNACION' )
	   > ( SELECT COUNT(*) FROM metal_inventario_track WHERE idTaller = p_idTaller AND tipoMovimiento = 'REVERSA_ASIGNACION' ) THEN
		SET @out_id = 2;
		SET @message = 'El metal de este folio ya se había movido al inventario.';
		SELECT @out_id AS out_id, @message AS message;
		LEAVE proc;
	END IF;

	IF v_idTecnico IS NULL THEN
		SET @message = 'El folio no tiene técnico en mano de obra; no se puede mover el metal.';
		SELECT @out_id AS out_id, @message AS message;
		LEAVE proc;
	END IF;

	-- Productos de metal faltantes en catálogo
	SET v_sinProducto = (
		SELECT COUNT(*) FROM (
			SELECT tipo, kilates FROM taller_metal_agranel WHERE idTaller = p_idTaller
			UNION ALL
			SELECT tipo, kilates FROM taller_metal_cliente WHERE idTaller = p_idTaller
		) AS M
		WHERE NOT EXISTS (
			SELECT 1 FROM products WHERE barCode = CONCAT( 'METAL-', UPPER(M.tipo), '-', CAST(M.kilates AS UNSIGNED) )
		)
	);
	IF v_sinProducto > 0 THEN
		SET @message = 'Hay kilatajes/leyes del folio sin producto de metal en el catálogo (ejecutar insert_productos_metal.sql).';
		SELECT @out_id AS out_id, @message AS message;
		LEAVE proc;
	END IF;

	-- Fino necesario (solo metal de la empresa) vs disponible en sucursal
	SELECT
		IFNULL( SUM( CASE WHEN tipo = 'oro' THEN ROUND( gramos * kilates / 24, 2 ) ELSE 0 END ), 0 ),
		IFNULL( SUM( CASE WHEN tipo = 'plata' THEN ROUND( gramos * kilates / 1000, 2 ) ELSE 0 END ), 0 )
	INTO v_finoOroNecesario, v_finoPlataNecesario
	FROM taller_metal_agranel WHERE idTaller = p_idTaller;

	SET v_finoOroDisponible = IFNULL( ( SELECT MI.gramos FROM metal_inventario AS MI
		INNER JOIN products AS P ON P.idProduct = MI.idProduct AND P.barCode = 'METAL-ORO-24'
		WHERE MI.tipoPropietario = 'SUCURSAL' AND MI.idPropietario = v_idSucursal LIMIT 1 ), 0 );
	SET v_finoPlataDisponible = IFNULL( ( SELECT MI.gramos FROM metal_inventario AS MI
		INNER JOIN products AS P ON P.idProduct = MI.idProduct AND P.barCode = 'METAL-PLATA-1000'
		WHERE MI.tipoPropietario = 'SUCURSAL' AND MI.idPropietario = v_idSucursal LIMIT 1 ), 0 );

	IF v_finoOroDisponible < v_finoOroNecesario OR v_finoPlataDisponible < v_finoPlataNecesario THEN
		SET @message = CONCAT( 'Inventario de la sucursal insuficiente. ',
			CASE WHEN v_finoOroDisponible < v_finoOroNecesario
				THEN CONCAT( 'Oro fino: necesita ', v_finoOroNecesario, ' g y hay ', v_finoOroDisponible, ' g. ' ) ELSE '' END,
			CASE WHEN v_finoPlataDisponible < v_finoPlataNecesario
				THEN CONCAT( 'Plata fina: necesita ', v_finoPlataNecesario, ' g y hay ', v_finoPlataDisponible, ' g.' ) ELSE '' END );
		SELECT @out_id AS out_id, @message AS message;
		LEAVE proc;
	END IF;

	-- Metal de la empresa: SUCURSAL(fino) -> TECNICO(kilataje)
	OPEN cur_agranel;
	agranel_loop: LOOP
		FETCH cur_agranel INTO c_tipo, c_gramos, c_kilates, c_idProduct;
		IF done = 1 THEN LEAVE agranel_loop; END IF;
		CALL metalInventario_apply( p_oGetDateNow, 'ASIGNACION',
			'SUCURSAL', v_idSucursal, 'TECNICO', v_idTecnico,
			c_idProduct, c_gramos, p_idTaller, v_idSale,
			'Asignación de folio: metal de la empresa', p_idUserLogOn );
	END LOOP;
	CLOSE cur_agranel;
	SET done = 0;

	-- Metal del cliente: CLIENTE -> TECNICO
	OPEN cur_cliente;
	cliente_loop: LOOP
		FETCH cur_cliente INTO c_tipo, c_gramos, c_kilates, c_idProduct;
		IF done = 1 THEN LEAVE cliente_loop; END IF;
		CALL metalInventario_apply( p_oGetDateNow, 'ASIGNACION',
			'CLIENTE', v_idCustomer, 'TECNICO', v_idTecnico,
			c_idProduct, c_gramos, p_idTaller, v_idSale,
			'Asignación de folio: metal del cliente', p_idUserLogOn );
	END LOOP;
	CLOSE cur_cliente;

	SET @out_id = 1;
	SET @message = 'Metal del folio movido al inventario del técnico.';
	SELECT @out_id AS out_id, @message AS message;

END$$

CREATE PROCEDURE `entregarMetalFinalByTaller`(
  IN p_oGetDateNow DATETIME
, IN p_idTaller    BIGINT
, IN p_idUserLogOn BIGINT
)
proc: BEGIN

	DECLARE v_idSale VARCHAR(100);
	DECLARE v_idCustomer BIGINT;
	DECLARE v_faltantes VARCHAR(1000);
	DECLARE v_sinProducto INT DEFAULT 0;

	DECLARE done INT DEFAULT 0;
	DECLARE c_idTecnico BIGINT;
	DECLARE c_gramos DECIMAL(18,2);
	DECLARE c_idProduct BIGINT;

	DECLARE cur_final CURSOR FOR
		SELECT MF.idUserTecnico, MF.gramos,
			( SELECT idProduct FROM products WHERE barCode = CONCAT( 'METAL-', UPPER(MF.tipo), '-', CAST(MF.kilates AS UNSIGNED) ) LIMIT 1 )
		FROM taller_metal_final AS MF WHERE MF.idTaller = p_idTaller;

	DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

	SET @out_id = 0;
	SET @message = '';

	SELECT idSale, idCustomer INTO v_idSale, v_idCustomer
	FROM taller WHERE idTaller = p_idTaller LIMIT 1;

	IF NOT EXISTS ( SELECT 1 FROM taller_metal_final WHERE idTaller = p_idTaller ) THEN
		SET @out_id = 2;
		SET @message = 'El folio no tiene metal final que descontar.';
		SELECT @out_id AS out_id, @message AS message;
		LEAVE proc;
	END IF;

	-- Igual que en la asignación: bloquea solo si el descuento del metal
	-- final sigue vigente ('REVERSA_METAL_FINAL' lo deshace, analisis/029).
	IF ( SELECT COUNT(*) FROM metal_inventario_track WHERE idTaller = p_idTaller AND tipoMovimiento = 'METAL_FINAL' )
	   > ( SELECT COUNT(*) FROM metal_inventario_track WHERE idTaller = p_idTaller AND tipoMovimiento = 'REVERSA_METAL_FINAL' ) THEN
		SET @out_id = 2;
		SET @message = 'El metal final de este folio ya se había descontado.';
		SELECT @out_id AS out_id, @message AS message;
		LEAVE proc;
	END IF;

	SET v_sinProducto = (
		SELECT COUNT(*) FROM taller_metal_final AS MF
		WHERE MF.idTaller = p_idTaller
		AND NOT EXISTS (
			SELECT 1 FROM products WHERE barCode = CONCAT( 'METAL-', UPPER(MF.tipo), '-', CAST(MF.kilates AS UNSIGNED) )
		)
	);
	IF v_sinProducto > 0 THEN
		SET @message = 'Hay kilatajes/leyes del metal final sin producto de metal en el catálogo.';
		SELECT @out_id AS out_id, @message AS message;
		LEAVE proc;
	END IF;

	-- Validación por técnico y por producto (kilataje/ley)
	SET v_faltantes = (
		SELECT GROUP_CONCAT(
			CONCAT( IFNULL(U.name, N.idUserTecnico), ': ', P.name, ' necesita ', N.total, ' g y tiene ', IFNULL(MI.gramos, 0), ' g' )
			SEPARATOR ' | ' )
		FROM (
			SELECT MF.idUserTecnico,
				( SELECT idProduct FROM products WHERE barCode = CONCAT( 'METAL-', UPPER(MF.tipo), '-', CAST(MF.kilates AS UNSIGNED) ) LIMIT 1 ) AS idProduct,
				SUM( MF.gramos ) AS total
			FROM taller_metal_final AS MF
			WHERE MF.idTaller = p_idTaller
			GROUP BY MF.idUserTecnico, idProduct
		) AS N
		INNER JOIN products AS P ON P.idProduct = N.idProduct
		LEFT JOIN users AS U ON U.idUser = N.idUserTecnico
		LEFT JOIN metal_inventario AS MI
			ON MI.tipoPropietario = 'TECNICO' AND MI.idPropietario = N.idUserTecnico AND MI.idProduct = N.idProduct
		WHERE IFNULL( MI.gramos, 0 ) < N.total
	);

	IF v_faltantes IS NOT NULL THEN
		SET @message = CONCAT( 'Inventario del técnico insuficiente para el metal final — ', v_faltantes );
		SELECT @out_id AS out_id, @message AS message;
		LEAVE proc;
	END IF;

	-- Descuento: TECNICO -> CLIENTE por cada renglón de metal final
	OPEN cur_final;
	final_loop: LOOP
		FETCH cur_final INTO c_idTecnico, c_gramos, c_idProduct;
		IF done = 1 THEN LEAVE final_loop; END IF;
		CALL metalInventario_apply( p_oGetDateNow, 'METAL_FINAL',
			'TECNICO', c_idTecnico, 'CLIENTE', v_idCustomer,
			c_idProduct, c_gramos, p_idTaller, v_idSale,
			'Entrega a mostrador: metal final', p_idUserLogOn );
	END LOOP;
	CLOSE cur_final;

	SET @out_id = 1;
	SET @message = 'Metal final descontado del inventario del técnico.';
	SELECT @out_id AS out_id, @message AS message;

END$$

DELIMITER ;
