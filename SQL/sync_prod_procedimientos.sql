-- ══════════════════════════════════════════════════════════════
-- PROCEDIMIENTOS: ponerlos a la par de desarrollo
--
-- Generado el 2026-10-08. Son 11 que no existen en la
-- base del cliente y 34 que si existen pero cambiaron (login, alta y
-- edicion de usuarios, consulta de ventas, taller, inventario fisico,
-- utilidades).
--
-- Cada uno va con su DROP: se puede correr las veces que haga falta.
-- Correr DESPUES de la estructura y de `sync_prod_datos.sql`.
--
-- OJO 1: si se corre desde la linea de comandos, usar `--comments`:
--   mysql --comments -u USUARIO -p BASE < sync_prod_procedimientos.sql
-- Sin esa bandera el cliente de MySQL borra los comentarios y los
-- procedimientos quedan funcionando igual pero sin su documentacion.
-- Desde Workbench no hace falta: ahi los comentarios se conservan.
--
-- OJO 2: si Workbench ya sincronizo las rutinas del modelo, este archivo
-- sale sobrando. Correrlo de todas formas no hace daño.
-- ══════════════════════════════════════════════════════════════

DELIMITER $$


-- ───────────────────────── NUEVOS (11) ─────────────────────────
DROP PROCEDURE IF EXISTS `asignarMetalInventarioByTaller`$$
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

DROP PROCEDURE IF EXISTS `deleteMetalFinal`$$
CREATE PROCEDURE `deleteMetalFinal`(
IN p_idMetalFinal BIGINT
, IN p_oGetDateNow DATETIME
, IN p_idUserLogOn BIGINT
)
BEGIN

	DECLARE v_out_id INT DEFAULT 0;
	DECLARE v_message VARCHAR(1000) DEFAULT 0;

    INSERT INTO taller_metal_final_log (
        idMetalFinal, createDate, idTaller, idSale, idUserTecnico, descripcion,
        tipo, gramos, kilates, costoMetal, precioFinal, idCreateUser,
		tipoLog, logDate, idCreateUserLog
    )
    SELECT
        idMetalFinal, createDate, idTaller, idSale, idUserTecnico, descripcion,
        tipo, gramos, kilates, costoMetal, precioFinal, idCreateUser,
		'DELETE', p_oGetDateNow, p_idUserLogOn
    FROM taller_metal_final
    WHERE idMetalFinal = p_idMetalFinal;

    DELETE FROM taller_metal_final
    WHERE idMetalFinal = p_idMetalFinal;

    IF ROW_COUNT() > 0 THEN
		SET v_out_id = 1;
		SET v_message = 'Eliminado correctamente';
	ELSE
		SET v_out_id = 0;
		SET v_message = 'No se pudo eliminar';
	END IF;

	SELECT v_out_id as out_id, v_message AS message;

END$$

DROP PROCEDURE IF EXISTS `deletePhysicalInventory`$$
CREATE PROCEDURE `deletePhysicalInventory`(
  IN p_idPhysicalInventory  VARCHAR(100)
, IN p_idUserC              BIGINT
)
BEGIN

	SET @out_id = 0;
	SET @message = '';

	IF EXISTS (
		SELECT 1
		FROM physical_inventory
		WHERE idPhysicalInventory = p_idPhysicalInventory
	) THEN

		DELETE
			SU
		FROM sync_up AS SU
		INNER JOIN physical_inventory_detail AS PID ON SU.idRelation = PID.idPhysicalInventoryDetail
		WHERE SU.tabla = 'PhysicalInventoryDetail'
		AND PID.idPhysicalInventory = p_idPhysicalInventory;

		DELETE FROM physical_inventory_detail
		WHERE idPhysicalInventory = p_idPhysicalInventory;

		DELETE FROM sync_up
		WHERE tabla = 'PhysicalInventory' AND idRelation = p_idPhysicalInventory;

		DELETE FROM physical_inventory
		WHERE idPhysicalInventory = p_idPhysicalInventory;

		SET @out_id = 1;
		SET @message = 'Inventario físico eliminado con éxito.';

	ELSE
		SET @out_id = 0;
		SET @message = 'No se encontró el inventario físico.';
	END IF;

	SELECT @out_id AS out_id, @message AS message;

END$$

DROP PROCEDURE IF EXISTS `entregarMetalFinalByTaller`$$
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

DROP PROCEDURE IF EXISTS `getAuditPhysicalInventory`$$
CREATE PROCEDURE `getAuditPhysicalInventory`(
  IN p_sOption    VARCHAR(1)
, IN p_idSucursal INT
, IN p_startDate  VARCHAR(100)
, IN p_endDate    VARCHAR(100)
)
BEGIN

	IF p_sOption = 'G' THEN

		SELECT
			G.idGroup AS id
			, G.name
			, LI.lastInventoryDate
			, DATE_FORMAT( LI.lastInventoryDate, '%d-%m-%Y' ) AS lastInventoryDateDesc
			, CASE WHEN LIR.idGroup IS NULL THEN 0 ELSE 1 END AS bConInventario
		FROM `groups` AS G
		LEFT JOIN (
			SELECT P.idGroup, MAX( PI.createDate ) AS lastInventoryDate
			FROM physical_inventory AS PI
			INNER JOIN physical_inventory_detail AS PID ON PID.idPhysicalInventory = PI.idPhysicalInventory
			INNER JOIN products AS P ON P.idProduct = PID.idProduct
			WHERE PI.active = 1
			AND PI.idSucursal = p_idSucursal
			GROUP BY P.idGroup
		) AS LI ON LI.idGroup = G.idGroup
		LEFT JOIN (
			SELECT P.idGroup
			FROM physical_inventory AS PI
			INNER JOIN physical_inventory_detail AS PID ON PID.idPhysicalInventory = PI.idPhysicalInventory
			INNER JOIN products AS P ON P.idProduct = PID.idProduct
			WHERE PI.active = 1
			AND PI.idSucursal = p_idSucursal
			AND DATE( PI.createDate ) >= p_startDate
			GROUP BY P.idGroup
		) AS LIR ON LIR.idGroup = G.idGroup
		WHERE G.active = 1
		ORDER BY bConInventario ASC, LI.lastInventoryDate ASC, G.name ASC;

	ELSE

		SELECT
			F.idFamily AS id
			, F.name
			, LI.lastInventoryDate
			, DATE_FORMAT( LI.lastInventoryDate, '%d-%m-%Y' ) AS lastInventoryDateDesc
			, CASE WHEN LIR.idFamily IS NULL THEN 0 ELSE 1 END AS bConInventario
		FROM families AS F
		LEFT JOIN (
			SELECT P.idFamily, MAX( PI.createDate ) AS lastInventoryDate
			FROM physical_inventory AS PI
			INNER JOIN physical_inventory_detail AS PID ON PID.idPhysicalInventory = PI.idPhysicalInventory
			INNER JOIN products AS P ON P.idProduct = PID.idProduct
			WHERE PI.active = 1
			AND PI.idSucursal = p_idSucursal
			GROUP BY P.idFamily
		) AS LI ON LI.idFamily = F.idFamily
		LEFT JOIN (
			SELECT P.idFamily
			FROM physical_inventory AS PI
			INNER JOIN physical_inventory_detail AS PID ON PID.idPhysicalInventory = PI.idPhysicalInventory
			INNER JOIN products AS P ON P.idProduct = PID.idProduct
			WHERE PI.active = 1
			AND PI.idSucursal = p_idSucursal
			AND DATE( PI.createDate ) >= p_startDate
			GROUP BY P.idFamily
		) AS LIR ON LIR.idFamily = F.idFamily
		WHERE F.active = 1
		ORDER BY bConInventario ASC, LI.lastInventoryDate ASC, F.name ASC;

	END IF;

END$$

DROP PROCEDURE IF EXISTS `getMetalInventarioSaldos`$$
CREATE PROCEDURE `getMetalInventarioSaldos`(
  IN p_tipoPropietario VARCHAR(20)
, IN p_idPropietario   BIGINT
)
BEGIN

	SELECT
		MI.idMetalInventario,
		MI.tipoPropietario,
		MI.idPropietario,
		CASE WHEN MI.tipoPropietario = 'SUCURSAL' THEN S.name ELSE U.name END AS propietarioDesc,
		MI.idProduct,
		P.barCode,
		P.name AS productName,
		CASE WHEN P.barCode LIKE 'METAL-ORO-%' THEN 'oro' ELSE 'plata' END AS tipoMetal,
		CAST( SUBSTRING_INDEX( P.barCode, '-', -1 ) AS DECIMAL(18,2) ) AS medida,
		MI.gramos,
		MI.updateDate
	FROM metal_inventario AS MI
	INNER JOIN products AS P ON P.idProduct = MI.idProduct
	LEFT JOIN sucursales AS S ON MI.tipoPropietario = 'SUCURSAL' AND S.idSucursal = MI.idPropietario
	LEFT JOIN users AS U ON MI.tipoPropietario = 'TECNICO' AND U.idUser = MI.idPropietario
	WHERE ( p_tipoPropietario = '' OR MI.tipoPropietario = p_tipoPropietario )
	AND ( p_idPropietario = 0 OR MI.idPropietario = p_idPropietario )
	ORDER BY MI.tipoPropietario, propietarioDesc, tipoMetal, medida DESC;

END$$

DROP PROCEDURE IF EXISTS `getMetalInventarioTrack`$$
CREATE PROCEDURE `getMetalInventarioTrack`(
  IN p_tipoPropietario VARCHAR(20)
, IN p_idPropietario   BIGINT
, IN p_startDate       VARCHAR(100)
, IN p_endDate         VARCHAR(100)
, IN p_start           INT
, IN p_limiter         INT
)
BEGIN

	SET @iRows = (
		SELECT COUNT(*)
		FROM metal_inventario_track AS T
		WHERE ( p_tipoPropietario = '' OR
			( T.tipoOrigen = p_tipoPropietario AND ( p_idPropietario = 0 OR T.idOrigen = p_idPropietario ) )
			OR ( T.tipoDestino = p_tipoPropietario AND ( p_idPropietario = 0 OR T.idDestino = p_idPropietario ) ) )
		AND ( p_startDate = '' OR DATE(T.createDate) >= p_startDate )
		AND ( p_endDate = '' OR DATE(T.createDate) <= p_endDate )
	);

	SELECT
		T.idMetalInventarioTrack,
		T.createDate,
		DATE_FORMAT( T.createDate, '%d-%m-%Y %h:%i %p' ) AS createDateDesc,
		T.tipoMovimiento,
		T.tipoOrigen,
		T.idOrigen,
		CASE T.tipoOrigen
			WHEN 'SUCURSAL' THEN CONCAT( SO.name, ' - Sucursal' )
			WHEN 'TECNICO' THEN CONCAT( UO.name, ' - Técnico' )
			WHEN 'CLIENTE' THEN CONCAT( IFNULL(CO.name,''), ' ', IFNULL(CO.lastName,''), ' - Cliente' )
			ELSE 'Externo' END AS origenDesc,
		T.tipoDestino,
		T.idDestino,
		CASE T.tipoDestino
			WHEN 'SUCURSAL' THEN CONCAT( SD.name, ' - Sucursal' )
			WHEN 'TECNICO' THEN CONCAT( UD.name, ' - Técnico' )
			WHEN 'CLIENTE' THEN CONCAT( IFNULL(CD.name,''), ' ', IFNULL(CD.lastName,''), ' - Cliente' )
			ELSE 'Externo' END AS destinoDesc,
		T.idProduct,
		P.barCode,
		P.name AS productName,
		T.gramos,
		T.gramosFino,
		T.idTaller,
		T.idSale,
		T.referencia,
		T.idCreateUser,
		UC.name AS createUserDesc,
		@iRows AS iRows
	FROM metal_inventario_track AS T
	INNER JOIN products AS P ON P.idProduct = T.idProduct
	LEFT JOIN sucursales AS SO ON T.tipoOrigen = 'SUCURSAL' AND SO.idSucursal = T.idOrigen
	LEFT JOIN users AS UO ON T.tipoOrigen = 'TECNICO' AND UO.idUser = T.idOrigen
	LEFT JOIN customers AS CO ON T.tipoOrigen = 'CLIENTE' AND CO.idCustomer = T.idOrigen
	LEFT JOIN sucursales AS SD ON T.tipoDestino = 'SUCURSAL' AND SD.idSucursal = T.idDestino
	LEFT JOIN users AS UD ON T.tipoDestino = 'TECNICO' AND UD.idUser = T.idDestino
	LEFT JOIN customers AS CD ON T.tipoDestino = 'CLIENTE' AND CD.idCustomer = T.idDestino
	LEFT JOIN users AS UC ON UC.idUser = T.idCreateUser
	WHERE ( p_tipoPropietario = '' OR
		( T.tipoOrigen = p_tipoPropietario AND ( p_idPropietario = 0 OR T.idOrigen = p_idPropietario ) )
		OR ( T.tipoDestino = p_tipoPropietario AND ( p_idPropietario = 0 OR T.idDestino = p_idPropietario ) ) )
	AND ( p_startDate = '' OR DATE(T.createDate) >= p_startDate )
	AND ( p_endDate = '' OR DATE(T.createDate) <= p_endDate )
	ORDER BY T.createDate DESC, T.idMetalInventarioTrack DESC
	LIMIT p_start, p_limiter;

END$$

DROP PROCEDURE IF EXISTS `getTallerMetalesFinal`$$
CREATE PROCEDURE `getTallerMetalesFinal`(
	IN p_idTaller BIGINT
)
BEGIN

    SELECT
        MF.idMetalFinal,
        MF.createDate,
        MF.idTaller,
        MF.idSale,
        MF.idUserTecnico,
        U.name AS tecnicoDesc,
        MF.descripcion,
        MF.tipo,
        MF.gramos,
        MF.kilates,
        MF.costoMetal,
        MF.precioFinal
    FROM taller_metal_final AS MF
    LEFT JOIN users AS U ON U.idUser = MF.idUserTecnico
    WHERE MF.idTaller = p_idTaller
	ORDER BY MF.createDate DESC;

END$$

DROP PROCEDURE IF EXISTS `insertMetalInventarioMovimiento`$$
CREATE PROCEDURE `insertMetalInventarioMovimiento`(
  IN p_oGetDateNow    DATETIME
, IN p_tipoMovimiento VARCHAR(20)
, IN p_tipoOrigen     VARCHAR(20)
, IN p_idOrigen       BIGINT
, IN p_tipoDestino    VARCHAR(20)
, IN p_idDestino      BIGINT
, IN p_idProduct      BIGINT
, IN p_gramos         DECIMAL(18,2)
, IN p_referencia     VARCHAR(1000)
, IN p_idUserLogOn    BIGINT
)
BEGIN

	SET @out_id = 0;
	SET @message = '';

	IF p_gramos IS NULL OR p_gramos <= 0 THEN
		SET @message = 'Los gramos deben ser mayores a 0.';
	ELSEIF NOT EXISTS ( SELECT 1 FROM products WHERE idProduct = p_idProduct AND barCode LIKE 'METAL-%' AND active = 1 ) THEN
		SET @message = 'El producto no es un producto de metal válido.';
	ELSEIF p_tipoOrigen NOT IN ('SUCURSAL','TECNICO','CLIENTE','EXTERNO') OR p_tipoDestino NOT IN ('SUCURSAL','TECNICO','CLIENTE','EXTERNO') THEN
		SET @message = 'Origen o destino inválido.';
	ELSE
		CALL metalInventario_apply(
			p_oGetDateNow, p_tipoMovimiento,
			p_tipoOrigen, p_idOrigen, p_tipoDestino, p_idDestino,
			p_idProduct, p_gramos, NULL, NULL, p_referencia, p_idUserLogOn
		);
		SET @out_id = 1;
		SET @message = 'Movimiento registrado con éxito.';
	END IF;

	SELECT @out_id AS out_id, @message AS message;

END$$

DROP PROCEDURE IF EXISTS `insertUpdateTallerMetalFinal`$$
CREATE PROCEDURE `insertUpdateTallerMetalFinal`(
IN p_idMetalFinal BIGINT
, IN p_oGetDateNow DATETIME
, IN p_idTaller BIGINT
, IN p_idSale VARCHAR(100)
, IN p_idUserTecnico BIGINT
, IN p_descripcion VARCHAR(1000)
, IN p_tipo VARCHAR(45)
, IN p_gramos DECIMAL(18,2)
, IN p_kilates DECIMAL(18,2)
, IN p_costoMetal DECIMAL(18,2)
, IN p_precioFinal DECIMAL(18,2)
, IN p_idUserLogOn BIGINT
)
BEGIN

	DECLARE v_out_id INT DEFAULT 0;
	DECLARE v_message VARCHAR(1000) DEFAULT 0;

    IF p_idMetalFinal = 0 THEN

        INSERT INTO taller_metal_final(
        createDate, idTaller, idSale, idUserTecnico, descripcion,
        tipo, gramos, kilates, costoMetal, precioFinal, idCreateUser
        )
        SELECT
        p_oGetDateNow, p_idTaller, p_idSale, p_idUserTecnico, p_descripcion,
        p_tipo, p_gramos, p_kilates, IFNULL( p_costoMetal, 0 ), IFNULL( p_precioFinal, 0 ), p_idUserLogOn
        ;

        SET p_idMetalFinal = LAST_INSERT_ID();
		SET v_out_id = p_idMetalFinal;
		SET v_message = 'Metal final agregado con éxito';

    ELSE

        INSERT INTO taller_metal_final_log (
            idMetalFinal, createDate, idTaller, idSale, idUserTecnico, descripcion,
            tipo, gramos, kilates, costoMetal, precioFinal, idCreateUser,
			tipoLog, logDate, idCreateUserLog
        )
        SELECT
        idMetalFinal, createDate, idTaller, idSale, idUserTecnico, descripcion,
        tipo, gramos, kilates, costoMetal, precioFinal, idCreateUser,
		'UPDATE', p_oGetDateNow, p_idUserLogOn
        FROM taller_metal_final
        WHERE idMetalFinal = p_idMetalFinal;

        UPDATE
            taller_metal_final
        SET
            idUserTecnico = p_idUserTecnico
            , descripcion = p_descripcion
            , tipo = p_tipo
            , gramos = p_gramos
            , kilates = p_kilates
            , costoMetal = IFNULL( p_costoMetal, 0 )
            , precioFinal = IFNULL( p_precioFinal, 0 )
        WHERE
            idMetalFinal = p_idMetalFinal
        ;

		SET v_out_id = p_idMetalFinal;
		SET v_message = 'Metal final actualizado con éxito';

    END IF;

    SELECT v_out_id AS out_id, v_message AS message;

END$$

DROP PROCEDURE IF EXISTS `metalInventario_apply`$$
CREATE PROCEDURE `metalInventario_apply`(
  IN p_oGetDateNow    DATETIME
, IN p_tipoMovimiento VARCHAR(20)
, IN p_tipoOrigen     VARCHAR(20)
, IN p_idOrigen       BIGINT
, IN p_tipoDestino    VARCHAR(20)
, IN p_idDestino      BIGINT
, IN p_idProduct      BIGINT
, IN p_gramos         DECIMAL(18,2)
, IN p_idTaller       BIGINT
, IN p_idSale         VARCHAR(100)
, IN p_referencia     VARCHAR(1000)
, IN p_idUserLogOn    BIGINT
)
BEGIN

	DECLARE v_barCode VARCHAR(500);
	DECLARE v_medida DECIMAL(18,2);
	DECLARE v_gramosFino DECIMAL(18,2);
	DECLARE v_idProductFino BIGINT;

	SET v_barCode = ( SELECT barCode FROM products WHERE idProduct = p_idProduct );

	IF v_barCode IS NULL OR ( v_barCode NOT LIKE 'METAL-ORO-%' AND v_barCode NOT LIKE 'METAL-PLATA-%' ) THEN
		SIGNAL SQLSTATE '45000'
		SET MESSAGE_TEXT = 'El producto no es de metal (METAL-ORO-% / METAL-PLATA-%): no se puede mover al inventario de metal.';
	END IF;

	IF p_tipoOrigen NOT IN ('SUCURSAL','TECNICO','CLIENTE','EXTERNO') OR p_tipoDestino NOT IN ('SUCURSAL','TECNICO','CLIENTE','EXTERNO') THEN
		SIGNAL SQLSTATE '45000'
		SET MESSAGE_TEXT = 'Origen o destino inválido para el inventario de metal.';
	END IF;

	SET v_medida = CAST( SUBSTRING_INDEX( v_barCode, '-', -1 ) AS DECIMAL(18,2) );

	IF v_barCode LIKE 'METAL-ORO-%' THEN
		SET v_gramosFino = ROUND( p_gramos * v_medida / 24, 2 );
		SET v_idProductFino = ( SELECT idProduct FROM products WHERE barCode = 'METAL-ORO-24' LIMIT 1 );
	ELSE
		SET v_gramosFino = ROUND( p_gramos * v_medida / 1000, 2 );
		SET v_idProductFino = ( SELECT idProduct FROM products WHERE barCode = 'METAL-PLATA-1000' LIMIT 1 );
	END IF;

	IF v_idProductFino IS NULL AND ( p_tipoOrigen = 'SUCURSAL' OR p_tipoDestino = 'SUCURSAL' ) THEN
		SIGNAL SQLSTATE '45000'
		SET MESSAGE_TEXT = 'No existe el producto fino (METAL-ORO-24 / METAL-PLATA-1000): ejecutar insert_productos_metal.sql.';
	END IF;

	INSERT INTO metal_inventario_track (
		createDate, tipoMovimiento, tipoOrigen, idOrigen, tipoDestino, idDestino,
		idProduct, gramos, gramosFino, idTaller, idSale, referencia, idCreateUser
	)
	VALUES (
		p_oGetDateNow, p_tipoMovimiento, p_tipoOrigen, p_idOrigen, p_tipoDestino, p_idDestino,
		p_idProduct, p_gramos, v_gramosFino, p_idTaller, p_idSale, p_referencia, p_idUserLogOn
	);

	-- Efecto en el origen
	IF p_tipoOrigen = 'SUCURSAL' THEN
		INSERT INTO metal_inventario ( createDate, updateDate, tipoPropietario, idPropietario, idProduct, gramos )
		VALUES ( p_oGetDateNow, p_oGetDateNow, 'SUCURSAL', p_idOrigen, v_idProductFino, -v_gramosFino )
		ON DUPLICATE KEY UPDATE gramos = gramos - v_gramosFino, updateDate = p_oGetDateNow;
	ELSEIF p_tipoOrigen = 'TECNICO' THEN
		INSERT INTO metal_inventario ( createDate, updateDate, tipoPropietario, idPropietario, idProduct, gramos )
		VALUES ( p_oGetDateNow, p_oGetDateNow, 'TECNICO', p_idOrigen, p_idProduct, -p_gramos )
		ON DUPLICATE KEY UPDATE gramos = gramos - p_gramos, updateDate = p_oGetDateNow;
	END IF;

	-- Efecto en el destino
	IF p_tipoDestino = 'SUCURSAL' THEN
		INSERT INTO metal_inventario ( createDate, updateDate, tipoPropietario, idPropietario, idProduct, gramos )
		VALUES ( p_oGetDateNow, p_oGetDateNow, 'SUCURSAL', p_idDestino, v_idProductFino, v_gramosFino )
		ON DUPLICATE KEY UPDATE gramos = gramos + v_gramosFino, updateDate = p_oGetDateNow;
	ELSEIF p_tipoDestino = 'TECNICO' THEN
		INSERT INTO metal_inventario ( createDate, updateDate, tipoPropietario, idPropietario, idProduct, gramos )
		VALUES ( p_oGetDateNow, p_oGetDateNow, 'TECNICO', p_idDestino, p_idProduct, p_gramos )
		ON DUPLICATE KEY UPDATE gramos = gramos + p_gramos, updateDate = p_oGetDateNow;
	END IF;

END$$


-- ───────────────────────── CAMBIARON (34) ─────────────────────────
DROP PROCEDURE IF EXISTS `cbxGetSellersCombo`$$
CREATE PROCEDURE `cbxGetSellersCombo`(
IN p_idUser BIGINT
, IN p_search VARCHAR(500)
)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SELECT
	U.idUser
	, CONCAT( '#', U.idUser, ' - ' , U.name) AS name
	, ROUND( IFNULL( U.comision ,0) ,2) AS comision
	FROM users as U
	WHERE U.active = 1
	AND EXISTS (
		SELECT 1
		FROM rolesconfig AS RC
		INNER JOIN roles AS R ON RC.idRol = R.idRol
		WHERE RC.idUser = U.idUser
		AND R.active = 1
		AND R.idTipoRol = 1
	)
	AND
	(
		p_search = ''
		OR CONCAT( '#', U.idUser, ' - ' , U.name) LIKE CONCAT('%', p_search ,'%')
	)
    ORDER BY U.idUser DESC
	LIMIT 0, 5;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DROP PROCEDURE IF EXISTS `deleteMetalAgranel`$$
CREATE PROCEDURE `deleteMetalAgranel`(
IN p_idMetalAgranel BIGINT
, IN p_oGetDateNow DATETIME
, IN p_idUserLogOn BIGINT
)
BEGIN

	DECLARE v_out_id INT DEFAULT 0;
	DECLARE v_message VARCHAR(1000) DEFAULT 0;

    INSERT INTO taller_metal_agranel_log (
        idMetalAgranel,
        createDate,
        idTaller,
        idSale,
        tipo,
        gramos,
        kilates,
        valorMetal,
        costoMetal,
        idCreateUser,
		tipoLog,
		logDate,
		idCreateUserLog
    )
    SELECT
        idMetalAgranel,
        createDate,
        idTaller,
        idSale,
        tipo,
        gramos,
        kilates,
        valorMetal,
        costoMetal,
        idCreateUser,
		'DELETE' AS tipoLog,
		p_oGetDateNow,
		p_idUserLogOn
    FROM taller_metal_agranel
    WHERE idMetalAgranel = p_idMetalAgranel;

    DELETE FROM taller_metal_agranel
    WHERE idMetalAgranel = p_idMetalAgranel;

    IF ROW_COUNT() > 0 THEN
		SET v_out_id = 1;
		SET v_message = 'Eliminado correctamente';
	ELSE
		SET v_out_id = 0;
		SET v_message = 'No se pudo eliminar';
	END IF;

	SELECT v_out_id as out_id, v_message AS message;

END$$

DROP PROCEDURE IF EXISTS `deleteMetalCliente`$$
CREATE PROCEDURE `deleteMetalCliente`(
IN p_idMetalCliente BIGINT
, IN p_oGetDateNow DATETIME
, IN p_idUserLogOn BIGINT
)
BEGIN

	DECLARE v_out_id INT DEFAULT 0;
	DECLARE v_message VARCHAR(1000) DEFAULT 0;

    INSERT INTO taller_metal_cliente_log (
        idMetalCliente,
        createDate,
        idTaller,
        idSale,
        tipo,
        gramos,
        kilates,
        valorMetal,
        costoMetal,
        idCreateUser,
		tipoLog,
		logDate,
		idCreateUserLog
    )
    SELECT
        idMetalCliente,
        createDate,
        idTaller,
        idSale,
        tipo,
        gramos,
        kilates,
        valorMetal,
        costoMetal,
        idCreateUser,
		'DELETE' AS tipoLog,
		p_oGetDateNow,
		p_idUserLogOn
    FROM taller_metal_cliente
    WHERE idMetalCliente = p_idMetalCliente;

    DELETE FROM taller_metal_cliente
    WHERE idMetalCliente = p_idMetalCliente;

    IF ROW_COUNT() > 0 THEN
		SET v_out_id = 1;
		SET v_message = 'Eliminado correctamente';
	ELSE
		SET v_out_id = 0;
		SET v_message = 'No se pudo eliminar';
	END IF;

	SELECT v_out_id as out_id, v_message AS message;

END$$

DROP PROCEDURE IF EXISTS `deleteRefaccionTaller`$$
CREATE PROCEDURE `deleteRefaccionTaller`(
    IN p_idRefaccion INT,
	IN p_oGetDateNow DATETIME,
    IN p_idUserLogOn BIGINT
)
BEGIN
    DECLARE v_out_id INT DEFAULT 0;
	DECLARE v_message VARCHAR(1000) DEFAULT 0;
    
	-- GUARDO EN EL LOG PRIMERO
	INSERT INTO taller_refacciones_log (
		idRefaccion,
		createDate,
		idTaller,
		idSale,
		idProduct,
		descripcion,
		cantidad,
		costo,
		precio,
		idCreateUser,
		tipoLog,
		logDate,
		idCreateUserLog
	)
	SELECT
	idRefaccion,
	createDate,
	idTaller,
	idSale,
	idProduct,
	descripcion,
	cantidad,
	costo,
	precio,
	idCreateUser,
	'DELETE' AS tipoLog,
	p_oGetDateNow,
	p_idUserLogOn
	FROM taller_refacciones
	WHERE idRefaccion = p_idRefaccion;
	
	-- ELIMINO EL TALLER
	DELETE FROM taller_refacciones 
	WHERE idRefaccion = p_idRefaccion;
	
	IF ROW_COUNT() > 0 THEN
		SET v_out_id = 1;
		SET v_message = 'Eliminado correctamente';
	ELSE
		SET v_out_id = 0;
		SET v_message = 'No se pudo eliminar';
	END IF;
	
	SELECT v_out_id as out_id, v_message AS message;
END$$

DROP PROCEDURE IF EXISTS `disabledComision`$$
CREATE PROCEDURE `disabledComision`(
	IN p_idComision VARCHAR(100)
)
BEGIN

	-- DESHABILITO LAS ACTUALIZACIONES SEGURAS PARA QUE ME DEJE HACER UPDATE COMO EN SQLSERVER
	SET SQL_SAFE_UPDATES = 0;
	
	-- ELIMINO LOS PAGOS CANCELADOS YA DESCONTADOS
	DELETE
		SU
	FROM sync_up AS SU
	INNER JOIN pagos_desc AS PD ON PD.active = 1 AND PD.idPagoDesc = SU.idRelation
	INNER JOIN comisiones_pagos_detail AS CPD ON CPD.active = 1 AND PD.idPayment = CPD.idPayment
	INNER JOIN comisiones_detail AS CD ON  CD.active = 1 AND CD.utilidad < 0 AND CPD.idComisionDetail = CD.idComisionDetail
	WHERE
		SU.tabla = 'PagosDesc'
		AND CD.idComision = p_idComision;
	
	-- DESACTIVO LOS PAGOS CANCELADOS YA DESCONTADOS
	UPDATE
		comisiones_pagos_detail AS CPD
		INNER JOIN comisiones_detail AS CD ON CD.active = 1 AND CPD.idComisionDetail = CD.idComisionDetail
		INNER JOIN pagos_desc AS PD ON PD.active = 1 AND PD.idPayment = CPD.idPayment
	SET
		PD.active = 0
	WHERE
		CD.idComision = p_idComision
		AND CD.utilidad < 0;
	
	-- ELIMINO LOS PAGOS DETAIL DE LA TABLA DE SINCRONIZACIÓN
	DELETE
		SU
	FROM sync_up AS SU
	INNER JOIN comisiones_pagos_detail AS CPD ON CPD.idComisionesPagosDetail = SU.idRelation
	INNER JOIN comisiones_detail AS CD ON CPD.idComisionDetail = CD.idComisionDetail 
	WHERE
		SU.tabla = 'ComisionesPagosDetail'
		AND CD.idComision = p_idComision;
	
	-- DESACTIVO LOS PAGOS DETAIL
	UPDATE
		comisiones_pagos_detail AS CPD
		INNER JOIN comisiones_detail AS CD ON CPD.idComisionDetail = CD.idComisionDetail
	SET
		CPD.active = 0
	WHERE
		CD.idComision = p_idComision;
	
	-- ELIMINO EL DETALLE DE LAS COMISIONES DE LA TABLA DE SINCRONIZACIÓN
	DELETE
		SU
	FROM sync_up AS SU
	INNER JOIN comisiones_detail AS CD ON CD.idComisionDetail = SU.idRelation
	WHERE
		SU.tabla = 'ComisionesDetail'
		AND CD.idComision = p_idComision;
	
	-- DESACTIVO EL DETALLE DE LAS COMISIONES
	UPDATE
		comisiones_detail AS CD
	SET
		CD.active = 0
	WHERE
		CD.idComision = p_idComision;
	
	-- ELIMINO LAS COMISIONES DE LA TABLA DE SINCRONIZACIÓN
	DELETE
		SU
	FROM sync_up AS SU
	INNER JOIN comisiones AS C ON C.idComision = SU.idRelation
	WHERE
		SU.tabla = 'Comisiones'
		AND C.idComision = p_idComision;
	
	-- DESACTIVO LA COMISIÓN
	UPDATE
		comisiones AS C
	SET
		C.active = 0
	WHERE
		C.idComision = p_idComision;
	
	SELECT p_idComision AS id;

END$$

DROP PROCEDURE IF EXISTS `disabledComisionDetail`$$
CREATE PROCEDURE `disabledComisionDetail`(
	IN p_idComisionDetail BIGINT
)
BEGIN

	-- DESHABILITO LAS ACTUALIZACIONES SEGURAS PARA QUE ME DEJE HACER UPDATE COMO EN SQLSERVER
	SET SQL_SAFE_UPDATES = 0;
	
	-- ELIMINO LOS PAGOS CANCELADOS YA DESCONTADOS
	DELETE
		SU
	FROM sync_up AS SU
	INNER JOIN pagos_desc AS PD ON PD.active = 1 AND PD.idPagoDesc = SU.idRelation
	INNER JOIN comisiones_pagos_detail AS CPD ON CPD.active = 1 AND PD.idPayment = CPD.idPayment
	INNER JOIN comisiones_detail AS CD ON  CD.active = 1 AND CD.utilidad < 0 AND CPD.idComisionDetail = CD.idComisionDetail
	WHERE
		SU.tabla = 'PagosDesc'
		AND CD.idComisionDetail = p_idComisionDetail;
	
	-- DESACTIVO LOS PAGOS CANCELADOS YA DESCONTADOS
	UPDATE
		comisiones_pagos_detail AS CPD
		INNER JOIN comisiones_detail AS CD ON CD.active = 1 AND CPD.idComisionDetail = CD.idComisionDetail
		INNER JOIN pagos_desc AS PD ON PD.active = 1 AND PD.idPayment = CPD.idPayment
	SET
		PD.active = 0
	WHERE
		CD.idComisionDetail = p_idComisionDetail
		AND CD.utilidad < 0;
	
	-- ELIMINO LOS PAGOS DETAIL DE LA TABLA DE SINCRONIZACIÓN
	DELETE
		SU
	FROM sync_up AS SU
	INNER JOIN comisiones_pagos_detail AS CPD ON CPD.active = 1 AND CPD.idComisionesPagosDetail = SU.idRelation
	WHERE
		SU.tabla = 'ComisionesPagosDetail'
		AND CPD.idComisionDetail = p_idComisionDetail;
	
	-- DESACTIVO LOS PAGOS DETAIL
	UPDATE
		comisiones_pagos_detail AS CPD
	SET
		CPD.active = 0
	WHERE
		CPD.idComisionDetail = p_idComisionDetail;
	
	-- ELIMINO EL DETALLE DE LAS COMISIONES DE LA TABLA DE SINCRONIZACIÓN
	DELETE
		SU
	FROM sync_up AS SU
	INNER JOIN comisiones_detail AS CD ON CD.active = 0 AND CD.idComisionDetail = SU.idRelation
	WHERE
		SU.tabla = 'ComisionesDetail'
		AND CD.idComisionDetail = p_idComisionDetail;
	
	-- DESACTIVO EL DETALLE DE LAS COMISIONES
	UPDATE
		comisiones_detail AS CD
	SET
		CD.active = 0
	WHERE
		CD.idComisionDetail = p_idComisionDetail;
		
	
	
	SELECT p_idComisionDetail AS id;

END$$

DROP PROCEDURE IF EXISTS `generatePhysicInventory`$$
CREATE PROCEDURE `generatePhysicInventory`(
IN p_oGetDateNow DATETIME
, IN p_idSucursal INT
, IN p_idFamily BIGINT
, IN p_idGroup BIGINT

, IN p_idUserLogON BIGINT
)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;
	
	SET @out_id = '';
	SET @message = '';
	
	CALL haveActionPermiso (p_idUserLogON, 'invF_CreateBlock', @bBlock);
	
	DROP TABLE IF EXISTS productList;
	
	CREATE TEMPORARY TABLE productList (
		id BIGINT AUTO_INCREMENT,
		idProduct BIGINT,
		cCantidad FLOAT,
		cost FLOAT,
		price FLOAT,
		PRIMARY KEY(id)
	) ENGINE=InnoDB;
	
	INSERT INTO productList( idProduct, cCantidad, cost, price )
	SELECT DISTINCT
	P.idProduct
	, ROUND( ILL.catInventary ,2) AS cCantidad
	, ROUND( P.cost ,2) AS cost
	, ROUND( P.price ,2) AS price
	FROM products as P
	LEFT JOIN
	(
		SELECT
		IL.idProduct
		,ROUND( SUM( IL.cantidad ) ,2) AS catInventary
		FROM inventarylog AS IL
        WHERE
			IL.active = 1
			AND IL.firmaVer = 1
			AND IL.firmaMost = 1
		GROUP BY IL.idProduct
	) AS ILL ON P.idProduct = ILL.idProduct
	LEFT JOIN
	(
		SELECT
			PID.idProduct
		FROM physical_inventory_detail AS PID
		INNER JOIN physical_inventory AS PII ON PID.idPhysicalInventory = PII.idPhysicalInventory
		WHERE
			PID.active = 1
			AND PII.active = 1
			AND PII.idStatus != 4
			AND PII.bBlock = 1 -- QUE CONSIDERE SOLO LOS QUE SI BLOQUEAN
		GROUP BY PID.idProduct
	) AS PII2 ON P.idProduct = PII2.idProduct
	
	WHERE
		P.active = 1
		AND ILL.catInventary > 0
		AND P.idSucursal = p_idSucursal
		AND
		(
			p_idFamily = 0
			OR P.idFamily = p_idFamily
		)
		AND
		(
			p_idGroup = 0
			OR P.idGroup = p_idGroup
		)
		AND
		(
			-- SI LO ESTÁ CREANDO UN USUARIO QUE NO BLOQUEE, QUE NO LE IMPORTE
			@bBlock = 0 
			OR PII2.idProduct IS NULL
		)
		;
		
	IF
	(
		SELECT COUNT(*) FROM productList
	) > 0 THEN
		
		SET @idPhysicalInventory = '';

		CALL getIDs_BySucursal( p_idUserLogON, p_idSucursal, 'physical_inventory', @id );
		
		SET @idPhysicalInventory = CONCAT( 'IFM', p_idSucursal, '-', @id);
		
		INSERT INTO physical_inventory
		(
			idPhysicalInventory
			, createDate
			, idSucursal
			, idStatus
			, idUser
			, bOK
			, active
			, bBlock
		)
		SELECT
		@idPhysicalInventory
		, p_oGetDateNow
		, p_idSucursal
		, 1
		, p_idUserLogON
		, 0
		, 1
		,@bBlock;
		
		INSERT INTO physical_inventory_detail
		(
			idPhysicalInventory
			, idSucursal
			, idProduct
			, cost
			, price
			, cCantidad
			, cMostrador
			, cDiff
			, comments
			, bOK
			, active
		)
		SELECT
		@idPhysicalInventory
		, p_idSucursal
		, idProduct
		, cost
		, price
		, cCantidad
		, 0
		, cCantidad
		, ''
		, 0
		, 1
		FROM productList;
		
		SET @out_id = @idPhysicalInventory;
		SET @message = 'Inventario físico iniciado con éxito.';
	
	ELSE
	
		SET @out_id = '';
		SET @message = 'No se encontraron productos.';
		
	END IF;
	
	SELECT @out_id AS out_id, @message AS message;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DROP PROCEDURE IF EXISTS `getInfFinanciera`$$
CREATE PROCEDURE `getInfFinanciera`(
IN p_startDate VARCHAR(500)
, IN p_endDate VARCHAR(500)
, IN p_idSucursal INT
, IN idSeller_idUser BIGINT
, IN p_idGroup INT

, IN p_idUserC BIGINT
)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SET @iRows = 0;
	
	-- Crear la tabla temporal
	CREATE TEMPORARY TABLE salesListSec (
		id BIGINT AUTO_INCREMENT,
		idSale VARCHAR(100),
		idSaleDetail BIGINT,
		PRIMARY KEY (id)
	) ENGINE=InnoDB;
    
	CREATE TEMPORARY TABLE amountProseced (
		id BIGINT AUTO_INCREMENT,
		idSale VARCHAR(100),
		costSale FLOAT,
		costSaleThis FLOAT,
		impSale FLOAT,
		impSaleThis FLOAT,
		paymentsHist FLOAT,
		paymentsRange FLOAT,
		ventaDesc VARCHAR(5000),
		PRIMARY KEY (id)
	) ENGINE=InnoDB;
    
	INSERT INTO amountProseced
	(
		idSale
		, costSale
		, costSaleThis
		, impSale
		, impSaleThis
		, paymentsHist
		, paymentsRange
		, ventaDesc
	)
	-- Mostrar los datos de la tabla temporal
	SELECT

	S.idSale
	,IFNULL(
		(
			SELECT SUM( SDD.cost * SDD.cantidad )
			FROM salesdetail AS SDD
			INNER JOIN products AS PPP ON PPP.active = 1 AND SDD.idProduct = PPP.idProduct
			WHERE
				SDD.active = 1
				AND SDD.idSale = S.idSale
			GROUP BY S.idSale
		), 0) AS costSale
		
	,IFNULL(
		(
			SELECT SUM( SDD.cost * SDD.cantidad )
			FROM salesdetail AS SDD
			INNER JOIN products AS PPP ON PPP.active = 1 AND SDD.idProduct = PPP.idProduct
			WHERE
				SDD.active = 1
				AND SDD.idSale = S.idSale
				AND
				(
					p_idGroup = 0
					OR PPP.idGroup = p_idGroup
				)
			GROUP BY S.idSale
		), 0) AS costSaleThis

	,IFNULL(
		(
			SELECT SUM( SDD.importe )
			FROM salesdetail AS SDD
			INNER JOIN products AS PPP ON PPP.active = 1 AND SDD.idProduct = PPP.idProduct
			WHERE
				SDD.active = 1
				AND SDD.idSale = S.idSale
			GROUP BY S.idSale
		), 0) AS impSale

	,IFNULL(
		(
			SELECT SUM( SDD.importe )
			FROM salesdetail AS SDD
			INNER JOIN products AS PPP ON PPP.active = 1 AND SDD.idProduct = PPP.idProduct
			WHERE
				SDD.active = 1
				AND SDD.idSale = S.idSale
				AND
				(
					p_idGroup = 0
					OR PPP.idGroup = p_idGroup
				)
			GROUP BY S.idSale
		), 0) AS impSaleThis

	,IFNULL(
		(
			SELECT SUM( pago )
			FROM payments AS P2
			WHERE
				P2.active = 1
				AND P2.idRelation = S.idSale
                AND P2.idFormaPago <> 5 -- NO APLICA EL PAGO ELENCTRÓNICO
				AND
				(
					LENGTH( p_startDate ) > 0
					AND LENGTH( p_endDate ) > 0
					AND CAST( P2.createDate AS DATE ) < CAST( p_startDate AS DATE)
				)
			GROUP BY S.idSale
		), 0) AS paymentsHist

	,IFNULL(
		(
			SELECT SUM( pago )
			FROM payments AS P3
			WHERE
				P3.active = 1
				AND P3.idRelation = S.idSale
                AND P3.idFormaPago <> 5 -- NO APLICA EL PAGO ELENCTRÓNICO
				AND
				(
					p_startDate = ''
					OR CAST( P3.createDate AS DATE ) BETWEEN CAST( p_startDate AS DATE) AND CAST( p_endDate AS DATE)
				)
			GROUP BY S.idSale

		), 0) AS paymentsRange

	,IFNULL(
	(
		SELECT GROUP_CONCAT( PPP.name )
		FROM salesdetail AS SDD
		INNER JOIN products AS PPP ON PPP.active = 1 AND SDD.idProduct = PPP.idProduct
		WHERE
			SDD.active = 1
			AND SDD.idSale = S.idSale
			AND
			(
				p_idGroup = 0
				OR PPP.idGroup = p_idGroup
			)
		GROUP BY S.idSale
	), 0) AS ventaDesc

	
	FROM payments AS P
	INNER JOIN sales AS S ON S.active = 1 AND P.idRelation = S.idSale
	INNER JOIN sucursalesconfig AS SC ON S.idSucursal = SC.idSucursal
	INNER JOIN salesdetail AS SD ON SD.active = 1 AND S.idSale = SD.idSale
	INNER JOIN products AS PP ON PP.active = 1 AND SD.idProduct = PP.idProduct
	WHERE
		P.active = 1
		AND SC.idUser = p_idUserC
        AND P.idFormaPago <> 5 -- NO APLICA EL PAGO ELENCTRÓNICO
		AND S.idSaleType NOT IN( 5 ) -- NO APLICA LAS VENTAS DE TALLER
		AND
		(
			p_startDate = ''
			OR CAST( P.createDate AS DATE ) BETWEEN CAST( p_startDate AS DATE ) AND CAST( p_endDate AS DATE )
		)
		AND
		(
			p_idSucursal = 0
			OR S.idSucursal = p_idSucursal
		)
		AND
		(
			idSeller_idUser = 0
			OR S.idSeller_idUser = idSeller_idUser
		)
		AND
		(
			p_idGroup = 0
			OR PP.idGroup = p_idGroup
		)
	GROUP BY P.idRelation, S.idSale;

	SET @sumUtilidad = 0;

	SET @sumUtilidad =
	IFNULL(
	(
		SELECT
			ROUND( SUM(
							( 
								( ( paymentsHist + paymentsRange ) * ( ( impSaleThis * 100 / impSale ) / 100 ) ) - costSaleThis
							)
						) ,2)
		FROM amountProseced AS S
		WHERE ( ( ( paymentsHist + paymentsRange ) * ( ( impSaleThis * 100 / impSale ) / 100 ) ) - costSaleThis ) > 0
	), 0);
	
	SET @sumCostoDeLoVendido = 0;

	SET @sumCostoDeLoVendido =
	IFNULL(
	(
		SELECT
			ROUND( SUM(
							( 
								( ( CASE WHEN ( paymentsHist + paymentsRange ) >= costSale THEN costSale ELSE ( paymentsHist + paymentsRange ) END ) * ( ( costSaleThis * 100 / costSale ) / 100 ) )
							)
						) ,2)
		FROM amountProseced AS S
		WHERE ( ( ( paymentsHist + paymentsRange ) * ( ( impSaleThis * 100 / impSale ) / 100 ) ) - costSaleThis ) > 0
	), 0);
	
	SET @sumPriceDeLoVendido = 0;
	
	SET @sumPriceDeLoVendido =
	IFNULL(
	(
		SELECT
			ROUND( SUM(
							( 
								( ( paymentsHist + paymentsRange ) * ( ( impSaleThis * 100 / impSale ) / 100 ) )
							)
						) ,2)
		FROM amountProseced AS S
		WHERE ( ( ( paymentsHist + paymentsRange ) * ( ( impSaleThis * 100 / impSale ) / 100 ) ) - costSaleThis ) > 0
	), 0);

	SELECT
	S.idSale
	, S.costSaleThis
	, S.impSale
	, S.impSaleThis
	, S.paymentsHist
	, S.paymentsRange

	, ( ( impSaleThis * 100 / impSale ) / 100 ) AS porcentaje

	, ( ( paymentsHist + paymentsRange ) * ( ( impSaleThis * 100 / impSale ) / 100 ) ) - costSaleThis AS fUtilidad

	, ROUND( @sumUtilidad ,2) AS sumUtilidad
	, ROUND( @sumCostoDeLoVendido ,2) AS sumCostoDeLoVendido
	, ROUND( @sumPriceDeLoVendido ,2) AS sumPriceDeLoVendido
	, ROUND( ( ( @sumPriceDeLoVendido - @sumCostoDeLoVendido ) / @sumCostoDeLoVendido ) * 100 ,2) AS margenUtilidad

	, ventaDesc
	
	FROM amountProseced AS S
	WHERE ( ( ( paymentsHist + paymentsRange ) * ( ( impSaleThis * 100 / impSale ) / 100 ) ) - costSaleThis ) > 0
	;
    
    DROP TABLE salesListSec;
    DROP TABLE amountProseced;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DROP PROCEDURE IF EXISTS `getPhysicalInventoryListWithPage`$$
CREATE PROCEDURE `getPhysicalInventoryListWithPage`(
IN p_startDate VARCHAR(50)
, IN p_endDate VARCHAR(50)
, IN p_idSucursal INT
, IN p_idFamily BIGINT
, IN p_idGroup BIGINT

, IN p_search VARCHAR(500)
, IN p_start INT
, IN p_limiter INT
)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SET @iRows = 0;

	CREATE TEMPORARY TABLE ODataTemp (
		id BIGINT AUTO_INCREMENT,
		idRelation VARCHAR(100),
		PRIMARY KEY(id)
	) ENGINE=InnoDB;


	INSERT INTO ODataTemp( idRelation )
	SELECT DISTINCT
	T.idRelation
	FROM
	(
		SELECT
		PII.idPhysicalInventory AS idRelation
		FROM physical_inventory AS PII
		INNER JOIN physical_inventory_detail AS PID ON PII.idPhysicalInventory = PID.idPhysicalInventory
		INNER JOIN products AS P ON P.active = 1 AND PID.idProduct = P.idProduct
		WHERE
		(
			p_startDate = ''
			OR CAST( PII.createDate AS DATE ) BETWEEN CAST( p_startDate AS DATE ) AND CAST( p_endDate AS DATE )
		)
		AND
		(
			p_idSucursal = 0
			OR PII.idSucursal = p_idSucursal
		)
		AND
		(
			p_idFamily = 0
			OR P.idFamily = p_idFamily
		)
		AND
		(
			p_idGroup = 0
			OR P.idGroup = p_idGroup
		)
	) AS T;

	SET @iRows = ( SELECT COUNT(*) FROM ODataTemp );

	SELECT
	@iRows AS iRows
	, PII.idPhysicalInventory
	, DATE_FORMAT( PII.createDate, '%d-%m-%Y') AS createDateDate
	, DATE_FORMAT( PII.createDate, '%h:%i:%s %p') AS createDateHours
	, PIS.idStatus
	, PIS.name AS statusName
	, S.name AS sucursalName
	, U.name AS userName
	, PII.bOK
    , PII.bBlock
	, PII.active
	, (
		SELECT GROUP_CONCAT(DISTINCT G.name ORDER BY G.name SEPARATOR ', ')
		FROM physical_inventory_detail AS PIDG
		INNER JOIN products AS PG ON PG.idProduct = PIDG.idProduct
		LEFT JOIN `groups` AS G ON G.idGroup = PG.idGroup
		WHERE PIDG.idPhysicalInventory = PII.idPhysicalInventory
	) AS gruposDesc
	, (
		SELECT GROUP_CONCAT(DISTINCT F.name ORDER BY F.name SEPARATOR ', ')
		FROM physical_inventory_detail AS PIDF
		INNER JOIN products AS PF ON PF.idProduct = PIDF.idProduct
		LEFT JOIN families AS F ON F.idFamily = PF.idFamily
		WHERE PIDF.idPhysicalInventory = PII.idPhysicalInventory
	) AS familiasDesc
	FROM physical_inventory AS PII
	INNER JOIN physical_inventory_status AS PIS ON PII.idStatus = PIS.idStatus
	INNER JOIN sucursales AS S ON PII.idSucursal = S.idSucursal
	INNER JOIN users AS U ON PII.idUser = U.idUser
	INNER JOIN ODataTemp AS T ON PII.idPhysicalInventory = T.idRelation
	ORDER BY PII.keyx DESC
	LIMIT p_start, p_limiter;

	DROP TABLE ODataTemp;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DROP PROCEDURE IF EXISTS `getRolByID`$$
CREATE PROCEDURE `getRolByID`(IN p_idRol INT)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SELECT
	R.idRol
	, R.createDate
	, R.name
	, R.description
	, R.active
	, R.idTipoRol
	, IFNULL( RT.nombre, '' ) AS tipoRolDesc
	, R.bSistema
	FROM roles as R
	LEFT JOIN roles_tipo AS RT ON RT.idTipoRol = R.idTipoRol
	WHERE R.idRol = p_idRol;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DROP PROCEDURE IF EXISTS `getRolesByIdUser`$$
CREATE PROCEDURE `getRolesByIdUser`(IN p_idUser BIGINT)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SELECT
	RC.createDate
	, R.idRol
	, R.name
	, R.idTipoRol
	, R.bSistema
	FROM roles as R
	LEFT JOIN rolesconfig AS RC ON R.idRol = RC.idRol
	WHERE R.active = 1
	AND RC.idUser = p_idUser
    ORDER BY RC.idRolConfig DESC;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DROP PROCEDURE IF EXISTS `getRolesListWithPage`$$
CREATE PROCEDURE `getRolesListWithPage`(IN p_search VARCHAR(500),IN p_start INT, IN p_limiter INT)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SET @iRows = 0;

	SET @iRows = ( SELECT
					COUNT(*)
					FROM roles as R
					WHERE
					(
						p_search = ''
						OR R.name LIKE CONCAT('%', p_search ,'%')
						OR R.description LIKE CONCAT('%', p_search ,'%')
					)
	);

	SELECT
	@iRows AS iRows
	, R.idRol
	, R.createDate
	, R.name
	, R.description
	, R.active
	, R.idTipoRol
	, IFNULL( RT.nombre, '' ) AS tipoRolDesc
	, R.bSistema
	FROM roles as R
	LEFT JOIN roles_tipo AS RT ON RT.idTipoRol = R.idTipoRol
	WHERE
	(
		p_search = ''
		OR R.name LIKE CONCAT('%', p_search ,'%')
		OR R.description LIKE CONCAT('%', p_search ,'%')
	)
    ORDER BY R.bSistema DESC, R.idRol DESC
	LIMIT p_start, p_limiter;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DROP PROCEDURE IF EXISTS `getTallerMetalesAgranel`$$
CREATE PROCEDURE `getTallerMetalesAgranel`(
	IN p_idTaller BIGINT
)
BEGIN

    SELECT
        idMetalAgranel,
        createDate,
        idTaller,
        idSale,
        tipo,
        gramos,
        kilates,
        valorMetal,
        costoMetal
    FROM taller_metal_agranel
    WHERE idTaller = p_idTaller
	ORDER BY createDate DESC;

END$$

DROP PROCEDURE IF EXISTS `getTallerMetalesCliente`$$
CREATE PROCEDURE `getTallerMetalesCliente`(
	IN p_idTaller BIGINT
)
BEGIN

    SELECT
        tmc.idMetalCliente,
        tmc.createDate,
        tmc.idTaller,
        tmc.idSale,
        tmc.tipo,
        tmc.gramos,
        tmc.kilates,
        tmc.valorMetal,
        tmc.costoMetal,
        COUNT(tmci.keyX) AS imageCount
    FROM taller_metal_cliente tmc
    LEFT JOIN taller_metal_cliente_img tmci ON tmc.idMetalCliente = tmci.idMetalCliente
    WHERE tmc.idTaller = p_idTaller
	GROUP BY tmc.idMetalCliente, tmc.createDate, tmc.idTaller, tmc.idSale, tmc.tipo, tmc.gramos, tmc.kilates, tmc.valorMetal, tmc.costoMetal
	ORDER BY tmc.createDate DESC;

END$$

DROP PROCEDURE IF EXISTS `getTallerRefaccciones`$$
CREATE PROCEDURE `getTallerRefaccciones`(IN p_idTaller BIGINT)
BEGIN

	SELECT
	SD.idRefaccion
	, SD.idTaller
	, SD.createDate
	, DATE_FORMAT( SD.createDate, '%d-%m-%Y %h:%i:%s %p') AS createDateString
	, DATE_FORMAT( SD.createDate, '%d-%m-%Y') AS createDateDate
	, DATE_FORMAT( SD.createDate, '%h:%i:%s %p') AS createDateHours
	
	, SD.idSale
	, IFNULL( SD.idProduct ,0) AS idProduct
	, IF( SD.idProduct > 0, CONCAT( p.barCode, ' - ', P.name ), IFNULL( SD.descripcion ,'') ) AS productDesc
	, IFNULL( SD.cantidad ,0) AS cantidad
	, IFNULL( SD.costo ,0) AS costo
	, IFNULL( SD.precio ,0) AS precio
	, IFNULL( SD.cantidad ,0) * IFNULL( SD.precio ,0) AS total
	
	, SD.idCreateUser
	
	FROM taller_refacciones AS SD
	INNER JOIN sales AS S ON S.active = 1 AND SD.idSale = S.idSale
	INNER JOIN products AS P ON P.active = 1 AND SD.idProduct = P.idProduct
	WHERE
		SD.idTaller = p_idTaller
	;

END$$

DROP PROCEDURE IF EXISTS `getTestUtilidades`$$
CREATE PROCEDURE `getTestUtilidades`(
IN p_startDate VARCHAR(500)
, IN p_endDate VARCHAR(500)

, IN p_idSucursal INT
)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SET @iRows = 0;
	
	-- Crear la tabla temporal
	CREATE TEMPORARY TABLE salesListSec (
	  id BIGINT AUTO_INCREMENT,
	  idSale VARCHAR(100),
	  PRIMARY KEY (id)
	) ENGINE=InnoDB;

	-- Insertar datos en la tabla temporal
	INSERT INTO salesListSec (idSale)
	SELECT P.idRelation
	FROM payments AS P
	INNER JOIN sales AS S ON S.active = 1 AND P.idRelation = S.idSale
	INNER JOIN salesdetail AS SD ON SD.active = 1 AND S.idSale = SD.idSale
	WHERE
		P.active = 1
		AND CAST( P.createDate AS DATE ) BETWEEN CAST( p_startDate AS DATE ) AND CAST( p_endDate AS DATE )
	GROUP BY P.idRelation;



	CREATE TEMPORARY TABLE salesProseced (
		id BIGINT AUTO_INCREMENT,
		idSale VARCHAR(100),
		costSale FLOAT,
		impSale FLOAT,
		paymentsHist FLOAT,
		paymentsRange FLOAT,
		PRIMARY KEY (id)
	) ENGINE=InnoDB;


	INSERT INTO salesProseced
	(
		idSale
		, costSale
		, impSale
		, paymentsHist
		, paymentsRange
	)
	-- Mostrar los datos de la tabla temporal
	SELECT

	S.idSale
	,IFNULL(
		(
			SELECT SUM( cost * cantidad )
			FROM salesdetail AS SD
			WHERE
				SD.active = 1
				AND SD.idSale = S.idSale
		), 0) AS costSale

	,IFNULL(
		(
			SELECT SUM( importe )
			FROM salesdetail AS SD
			WHERE
				SD.active = 1
				AND SD.idSale = S.idSale
		), 0) AS impSale

	,IFNULL(
		(
			SELECT SUM( pago )
			FROM payments AS P
			WHERE
				P.active = 1
				AND P.idRelation = S.idSale
				AND CAST( P.createDate AS DATE ) < CAST( p_startDate AS DATE)

		), 0) AS paymentsHist

	,IFNULL(
		(
			SELECT SUM( pago )
			FROM payments AS P
			WHERE
				P.active = 1
				AND P.idRelation = S.idSale
				AND CAST( P.createDate AS DATE ) BETWEEN CAST( p_startDate AS DATE) AND CAST( p_endDate AS DATE)

		), 0) AS paymentsRange

	
	FROM sales AS S
	INNER JOIN salesListSec AS SL ON S.idSale = SL.idSale;

	SET @sumUtilidad = 0;

	SET @sumUtilidad =
	IFNULL(
	(
		SELECT
		ROUND( SUM( ( paymentsHist + paymentsRange ) - costSale ) ,2)
		FROM salesProseced AS S
	), 0);

	SELECT
	S.idSale
	, S.costSale
	, S.impSale
	, S.paymentsHist
	, S.paymentsRange

	, ( paymentsHist + paymentsRange ) - costSale AS fUtilidad

	, @sumUtilidad AS sumUtilidad

	,IFNULL(
	(
		SELECT GROUP_CONCAT( P.name )
		FROM salesdetail AS SD
		INNER JOIN products AS P ON SD.idProduct = P.idProduct
		WHERE SD.idSale = S.idSale
		AND SD.active = 1
	), 0) AS ventaDesc
	
	FROM salesProseced AS S
	WHERE ( ( paymentsHist + paymentsRange ) - costSale ) > 0
	;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DROP PROCEDURE IF EXISTS `getUserByID`$$
CREATE PROCEDURE `getUserByID`(IN p_idUser BIGINT)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SELECT
	U.idUser
	, U.createDate
	, U.name
	, U.userName
	, U.pwd
	, IFNULL( U.authorizationCode ,'') AS authorizationCode
	, U.comision
	, U.active
    , IFNULL( U.destajo, 0) AS destajo
	, U.bAcceso
	, IFNULL( U.nombre, '' ) AS nombre
	, IFNULL( U.apellidoPaterno, '' ) AS apellidoPaterno
	, IFNULL( U.apellidoMaterno, '' ) AS apellidoMaterno
	, IF( IFNULL(U.nombre, '') = '', 1, 0 ) AS bNombrePendiente
	FROM users as U
	WHERE U.idUser = p_idUser;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DROP PROCEDURE IF EXISTS `getUserByUserName`$$
CREATE PROCEDURE `getUserByUserName`(IN p_userName VARCHAR(45) )
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SELECT
	idUser
	,createDate
	,name
	,username
	,pwd
	,active
    ,IFNULL(
    (
        SELECT GROUP_CONCAT(r.idRol)
        FROM rolesconfig r
        WHERE r.idUser = u.idUser
    )
    ,'') AS roles
	FROM users AS u
	WHERE active = 1
	AND bAcceso = 1
	AND username = p_userName;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DROP PROCEDURE IF EXISTS `getUsersListWithPage`$$
CREATE PROCEDURE `getUsersListWithPage`(
    IN p_search VARCHAR(500)
    , IN p_start INT
    , IN p_limiter INT
    , IN p_filterFaceID VARCHAR(10)
    , IN p_idRol BIGINT
    , IN p_idTipoRol INT
    , IN p_filterAcceso VARCHAR(10)
    , IN p_filterActive VARCHAR(10)
)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SET @iRows = 0;

	SET @iRows = ( SELECT
					COUNT(*)
					FROM users as U
					LEFT JOIN face_reference AS FR ON FR.tipoPersona = 'USUARIO' AND FR.idPersona = U.idUser
					WHERE
					(
						p_search = ''
						OR U.name LIKE CONCAT('%', p_search ,'%')
						OR U.userName LIKE CONCAT('%', p_search ,'%')
					)
					AND
					(
						p_filterFaceID = ''
						OR ( p_filterFaceID = 'CON' AND FR.idFaceReference IS NOT NULL )
						OR ( p_filterFaceID = 'SIN' AND FR.idFaceReference IS NULL )
					)
					AND
					(
						p_idRol = 0
						OR EXISTS ( SELECT 1 FROM rolesconfig AS RC WHERE RC.idUser = U.idUser AND RC.idRol = p_idRol )
					)
					AND
					(
						p_idTipoRol = 0
						OR EXISTS ( SELECT 1 FROM rolesconfig AS RC INNER JOIN roles AS R ON R.idRol = RC.idRol
									WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = p_idTipoRol )
					)
					AND
					(
						p_filterAcceso = ''
						OR ( p_filterAcceso = 'CON' AND U.bAcceso = 1 )
						OR ( p_filterAcceso = 'SIN' AND U.bAcceso = 0 )
					)
					AND
					(
						p_filterActive = ''
						OR ( p_filterActive = 'ACTIVOS' AND U.active = 1 )
						OR ( p_filterActive = 'INACTIVOS' AND IFNULL(U.active, 0) = 0 )
					)
	);

	SELECT
	@iRows AS iRows
	, U.idUser
	, U.createDate
	, U.name
	, U.userName
	,IFNULL(
	(
		SELECT GROUP_CONCAT( R.name )
		FROM rolesconfig AS RC
		INNER JOIN roles AS R ON RC.idRol = R.idRol
		WHERE RC.idUser = U.idUser
	), 0) AS roles
	,IFNULL(
	(
		SELECT GROUP_CONCAT( R.name ORDER BY R.bSistema DESC, R.name SEPARATOR '|' )
		FROM rolesconfig AS RC
		INNER JOIN roles AS R ON RC.idRol = R.idRol
		WHERE RC.idUser = U.idUser
		AND R.active = 1
	), '') AS puestosDesc
	, U.active
	, U.bAcceso
	, IF(FR.idFaceReference IS NULL, 0, 1) AS bTieneFaceID
	, E.idEmpleado
	, IFNULL( E.idSucursal, 0 ) AS idSucursalBase
	, IFNULL( S.name, '' ) AS sucursalBaseDesc
	, E.fechaBaja
	, IF( IFNULL(U.nombre, '') = '', 1, 0 ) AS bNombrePendiente
	FROM users as U
	LEFT JOIN face_reference AS FR ON FR.tipoPersona = 'USUARIO' AND FR.idPersona = U.idUser
	LEFT JOIN empleados AS E ON E.idUser = U.idUser
	LEFT JOIN sucursales AS S ON S.idSucursal = E.idSucursal
	WHERE
	(
		p_search = ''
		OR U.name LIKE CONCAT('%', p_search ,'%')
		OR U.userName LIKE CONCAT('%', p_search ,'%')
	)
	AND
	(
		p_filterFaceID = ''
		OR ( p_filterFaceID = 'CON' AND FR.idFaceReference IS NOT NULL )
		OR ( p_filterFaceID = 'SIN' AND FR.idFaceReference IS NULL )
	)
	AND
	(
		p_idRol = 0
		OR EXISTS ( SELECT 1 FROM rolesconfig AS RC WHERE RC.idUser = U.idUser AND RC.idRol = p_idRol )
	)
	AND
	(
		p_idTipoRol = 0
		OR EXISTS ( SELECT 1 FROM rolesconfig AS RC INNER JOIN roles AS R ON R.idRol = RC.idRol
					WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = p_idTipoRol )
	)
	AND
	(
		p_filterAcceso = ''
		OR ( p_filterAcceso = 'CON' AND U.bAcceso = 1 )
		OR ( p_filterAcceso = 'SIN' AND U.bAcceso = 0 )
	)
	AND
	(
		p_filterActive = ''
		OR ( p_filterActive = 'ACTIVOS' AND U.active = 1 )
		OR ( p_filterActive = 'INACTIVOS' AND IFNULL(U.active, 0) = 0 )
	)
    ORDER BY U.idUser DESC
	LIMIT p_start, p_limiter;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DROP PROCEDURE IF EXISTS `getVentasListWithPage`$$
CREATE PROCEDURE `getVentasListWithPage`(
IN p_idUser BIGINT
, IN p_createDateStart VARCHAR(500)
, IN p_createDateEnd VARCHAR(500)
, IN p_idCustomer BIGINT
, IN p_idSaleType INT

, IN p_bCancel SMALLINT
, IN p_bPending SMALLINT
, IN p_bPagada SMALLINT

, IN p_search VARCHAR(500)
, IN p_start INT
, IN p_limiter INT

, IN p_idSucursal INT
)
BEGIN
SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

	SET @iRows = 0;

	CREATE TEMPORARY TABLE salesListSec (
		id BIGINT AUTO_INCREMENT,
		idSale VARCHAR(100),
		total FLOAT,
		abonado FLOAT,
		PRIMARY KEY(id)
	) ENGINE=InnoDB;

	INSERT INTO salesListSec( idSale, total, abonado )
	SELECT
	S.idSale
	, ROUND( IFNULL( SDD.total ,0) ,2)
	, ROUND( IFNULL( AAA.abonado ,0) ,2)
	FROM sales AS S
	INNER JOIN sucursalesconfig AS SC ON S.idSucursal = SC.idSucursal
	LEFT JOIN
	(
		SELECT
		idRelation
		,ROUND( SUM( PP.pago ) ,2) AS abonado
		FROM payments AS PP
		WHERE PP.relationType IN('V','A')
		AND
		(
			(
				p_bCancel = 1
				AND PP.active = 0
			)
			OR
			(
				p_bCancel = 0
				AND PP.active = 1
			)
		)
		GROUP BY PP.idRelation
	) AS AAA ON AAA.idRelation = S.idSale
	LEFT JOIN
	(
		SELECT
		SD.idSale
		,ROUND( SUM( SD.importe ) ,2) AS total
		FROM salesdetail AS SD
		WHERE
		(
			(
				p_bCancel = 1
				AND SD.active = 0
			)
			OR
			(
				p_bCancel = 0
				AND SD.active = 1
			)
		)
		GROUP BY SD.idSale
	) AS SDD ON S.idSale = SDD.idSale
	WHERE SC.idUser = p_idUser
    -- Talleres: aquí solo se ven los ANTERIORES al módulo nuevo, es decir
    -- los que NO tienen renglón en `taller` (analisis/024). Los folios que
    -- ya nacieron con el módulo nuevo se trabajan en la pantalla de Taller
    -- y no se repiten en esta consulta.
    AND NOT EXISTS ( SELECT 1 FROM taller AS TT WHERE TT.idSale = S.idSale )
	AND
	(
		(
			p_bCancel = 1
			AND S.active = 0
		)
		OR
		(
			p_bCancel = 0
			AND S.active = 1
		)
	)
	AND
	(
		p_idSucursal = 0
		OR S.idSucursal = p_idSucursal
	)
	AND
	(
		p_search = ''
		OR S.idSale LIKE CONCAT('%', p_search ,'%')
	)
	AND
	(
		p_createDateStart = ''
		OR CAST( S.createDate AS DATE ) BETWEEN CAST( p_createDateStart AS DATE ) AND CAST( p_createDateEnd AS DATE )
	)
	AND
	(
		p_idCustomer = 0
		OR S.idCustomer = p_idCustomer
	)
	AND
	(
		p_idSaleType = 0
		OR S.idSaleType = p_idSaleType
	)
	AND
	(
		p_bPending = 0
		OR ( ( ROUND( IFNULL( SDD.total ,0) - IFNULL( AAA.abonado ,0) , 2) ) > 0 AND S.idSaleType <> 6 )
	)
	AND
	(
		p_bPagada = 0
		OR ( ROUND( IFNULL( SDD.total ,0) - IFNULL( AAA.abonado ,0) ,2) ) = 0
	);

    SET @iRows = ( SELECT COUNT(*) FROM salesListSec );

    SELECT
	@iRows AS iRows
	, S.idSale
	, S.createDate
	, DATE_FORMAT( S.createDate, '%d-%m-%Y') AS createDateDate
	, DATE_FORMAT( S.createDate, '%h:%i:%s %p') AS createDateHours

	, S.idSucursal
	, SS.name AS sucursalDesc

	, S.idSeller_idUser
	, U.name AS sellerName

	, S.idCustomer
	, CONCAT( C.lastName, ' ',C.name ) AS customerName

	, S.idSaleType
	, CASE
        WHEN S.idSaleType = 5 AND STS.fechaEntrega IS NULL THEN CONCAT( ST.name, ' (', SSC.nombre, ')' )
        WHEN S.idSaleType = 5 AND STS.fechaEntrega IS NOT NULL THEN CONCAT( ST.name, ' (', SSC.nombre, ')' , ' FE: ' , DATE_FORMAT( STS.fechaEntrega, '%d-%m-%Y') )
        WHEN S.idSaleType = 3 AND S.fechaEntrega IS NOT NULL THEN CONCAT( ST.name, ' - Entregado ', DATE_FORMAT( S.fechaEntrega, '%d-%m-%Y') )
        ELSE ST.name END AS saleTypeDesc

	, ROUND( IFNULL( temp.total ,0) ,2) AS total
	, ROUND( IFNULL( temp.abonado ,0) ,2) AS abonado
	, CASE
        WHEN S.idSaleType = 6 THEN 0
        ELSE ROUND( IFNULL( temp.total ,0) - IFNULL( temp.abonado ,0) ,2) END AS pendingAmount

	,IFNULL(
	(
		SELECT
		CASE WHEN S.idSaleType <> 5 THEN GROUP_CONCAT( P.name )
				ELSE SD.descriptionTaller END
		FROM salesdetail AS SD
		INNER JOIN products AS P ON SD.idProduct = P.idProduct
		WHERE SD.idSale = S.idSale
		AND
		(
			(
				p_bCancel = 1
				AND SD.active = 0
			)
			OR
			(
				p_bCancel = 0
				AND SD.active = 1
			)
		)
        GROUP BY SD.idSale, S.idSaleType, SD.descriptionTaller
        LIMIT 1
	), 0) AS ventaDesc

	,IFNULL(
	(
		SELECT
		ROUND( SUM( PP.pago ) ,2)
		FROM payments AS PP
		INNER JOIN corte_caja_ingresos AS CCI ON PP.idPayment = CCI.idPayment
		WHERE
			PP.active = 1
			AND PP.relationType IN('V','A')
			AND PP.idRelation = S.idSale
            AND PP.idFormaPago <> 5
		GROUP BY PP.idRelation
	)
	,0) AS pagosYaEnCorte

	, S.active
	, S.fechaEntrega
	, S.idUserEntrega
	, UE.name AS userEntregaName

	FROM sales AS S
	INNER JOIN sucursales AS SS ON S.idSucursal = SS.idSucursal
	INNER JOIN salesListSec AS temp ON S.idSale = temp.idSale
	INNER JOIN users AS U ON S.idSeller_idUser = U.idUser
	LEFT JOIN users AS UE ON S.idUserEntrega = UE.idUser
	INNER JOIN customers AS C ON S.idCustomer = C.idCustomer
	INNER JOIN sales_type AS ST ON S.idSaleType = ST.idSaleType
	LEFT JOIN sobre_taller_status AS STS ON S.idSale = STS.idSale AND S.idSucursal = STS.idSucursal
	LEFT JOIN sobre_status_cat AS SSC ON STS.idStatusSobre = SSC.idStatusSobre
    ORDER BY S.keyx DESC
	LIMIT p_start, p_limiter;

    DROP TABLE salesListSec;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DROP PROCEDURE IF EXISTS `insertRol`$$
CREATE PROCEDURE `insertRol`(
IN p_oGetDateNow DATETIME
, IN p_name VARCHAR(500)
, IN p_description VARCHAR(500)
, IN p_idTipoRol INT

, IN p_idUserC BIGINT
)
BEGIN

	SET @idRol = 0;
	SET @out_id = 0;
	SET @message = '';

	SET @idRol = IFNULL(
	(
		SELECT
		idRol
		FROM roles
		WHERE name = p_name
		LIMIT 1
	)
	,0);

	IF IFNULL( p_idTipoRol, 0 ) = 3 THEN
		SET @out_id = 0;
		SET @message = 'El tipo Empleados es exclusivo del puesto del sistema "Empleado".';

	ELSEIF p_idTipoRol IS NOT NULL AND NOT EXISTS ( SELECT 1 FROM roles_tipo WHERE idTipoRol = p_idTipoRol ) THEN
		SET @out_id = 0;
		SET @message = 'El tipo de puesto no existe.';

	ELSEIF @idRol = 0 THEN

		CALL getIDKeyByUserWithOUT( p_idUserC, @idNew );

		INSERT INTO roles(
		idRol
		, createDate
		, name
		, description
		, idTipoRol
		, bSistema
		, active
		)
		SELECT
		@idNew
		, p_oGetDateNow
		, p_name
		, p_description
		, p_idTipoRol
		, 0
		, 1;

		SET @out_id = @idNew;
		SET @message = 'Puesto guardado con éxito.';

	ELSE
		SET @out_id = 0;
		SET @message = 'El nombre del puesto ya se está utilizando.';
	END IF;

	SELECT @out_id AS out_id, @message AS message;

END$$

DROP PROCEDURE IF EXISTS `insertSaleConsDetail`$$
CREATE PROCEDURE `insertSaleConsDetail`(
IN p_oGetDateNow DATETIME
, IN p_idSaleOld VARCHAR(100)
, IN p_idSale VARCHAR(100)
, IN p_idProduct BIGINT
, IN p_cantidad FLOAT
, IN p_cost FLOAT
, IN p_precioUnitario FLOAT
, IN p_descuento FLOAT
, IN p_precio FLOAT
, IN p_importe FLOAT
, IN p_descriptionTaller VARCHAR(5000)
, IN p_idSaleDetail BIGINT
, IN p_descriptionConsHistory VARCHAR(1000)

, IN p_idUserC BIGINT
, IN p_idSucursal INT
)
BEGIN

	INSERT INTO salesdetail(
	createDate
	, idSale
	, idProduct
	, cantidad
	, cost
	, precioUnitario
	, descuento
	, precio
	, importe
	, active
	, descriptionTaller
    , idSucursal
	)
	SELECT
	p_oGetDateNow
	,p_idSale
	,p_idProduct
	,p_cantidad
	,p_cost
	,p_precioUnitario
	,p_descuento
	,p_precio
	,p_importe
	,1
	,p_descriptionTaller
    , p_idSucursal;
	
	-- **********************************************************************
	-- restarSalesDetailByConsignacion
	IF
	(
		SELECT
		cantidad - p_cantidad
		FROM salesdetail AS SD
		WHERE idSaleDetail = p_idSaleDetail
		AND active = 1
	) >= 0
	THEN
	
		UPDATE
			salesdetail
		SET
			cantidad = cantidad - p_cantidad
		WHERE
			idSaleDetail = p_idSaleDetail;
		
		UPDATE
			salesdetail
		SET
			importe = cantidad * precio
		WHERE
			idSaleDetail = p_idSaleDetail;
	
	END IF;
	
	-- **********************************************************************
	
	-- **********************************************************************
	-- insertConsHistory
	
	INSERT INTO cons_history( createDate, idSale, idSaleDetail, description, consCantidad, active, idSucursal )
	SELECT
	p_oGetDateNow
	, p_idSaleOld
	, p_idSaleDetail
	, p_descriptionConsHistory
	, p_cantidad
	, 1
    , p_idSucursal;
	
	-- **********************************************************************
	-- **********************************************************************
	-- insertConsHistory
	
	INSERT INTO inventarylog(
	createDate
	, idUser
	, idProduct
	, cantidad
	, description
	, active
	, firmaVer
	, firmaMost
	, noEntrada
	, firmaVerNoUser
	, firmaMostNoUser
	, idUserAutorizante
	)
	SELECT
	p_oGetDateNow
	,p_idUserC
	,p_idProduct
	,ROUND( p_cantidad ,2)
	,CONCAT( 'Cambio de ', p_idSaleOld, ' a ', p_idSale )
	,1
    
    ,1
    ,1
    ,''
    ,0
    ,0
    ,0
    ;
	
	INSERT INTO inventarylog(
	createDate
	, idUser
	, idProduct
	, cantidad
	, description
	, active
	, firmaVer
	, firmaMost
	, noEntrada
	, firmaVerNoUser
	, firmaMostNoUser
	, idUserAutorizante
	)
	SELECT
	p_oGetDateNow
	,p_idUserC
	,p_idProduct
	,ROUND( -p_cantidad ,2)
	,CONCAT( 'Cambio de ', p_idSaleOld, ' a ', p_idSale )
	,1
    
    ,1
    ,1
    ,''
    ,0
    ,0
    ,0;
	
	-- **********************************************************************
	
	SELECT 1 AS out_id;

END$$

DROP PROCEDURE IF EXISTS `insertUpdateActionsConf`$$
CREATE PROCEDURE `insertUpdateActionsConf`(
    IN p_relationType VARCHAR(10),
    IN p_idRelation INT,
    IN p_jsonList JSON,
    IN p_idUserLogON INT
)
BEGIN
    DECLARE totalRows INT DEFAULT 0;
    DECLARE i INT DEFAULT 0;
    DECLARE v_idAction INT;
    DECLARE v_bPermissionAction INT;
	
	DECLARE mensaje_error TEXT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- Capturar el mensaje de error
        GET DIAGNOSTICS CONDITION 1 mensaje_error = MESSAGE_TEXT;
		SELECT 0 AS out_id, mensaje_error AS message;
    END;

    SET totalRows = IFNULL(JSON_LENGTH(p_jsonList), 0);
	
	SET @out_id = 0;
    SET @message = '';
	
	IF p_idRelation > 0 AND LENGTH(p_relationType) > 0 AND p_relationType IN('R','U') THEN

		WHILE i < totalRows DO
			SET v_idAction = IFNULL(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_jsonList, CONCAT('$[', i, '].idAction'))) AS UNSIGNED), 0);
			SET v_bPermissionAction = IFNULL(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_jsonList, CONCAT('$[', i, '].bPermissionAction'))) AS UNSIGNED), 0);

			IF v_bPermissionAction = 1 THEN
				-- Insertar si no existe
				IF NOT EXISTS (
					SELECT 1 FROM actionsconf
					WHERE relationType = p_relationType
					  AND idRelation = p_idRelation
					  AND idAction = v_idAction
					  AND active = 1
				) THEN
					INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
					VALUES (NOW(), p_relationType, p_idRelation, v_idAction, 1);
				END IF;
			ELSE
				-- Eliminar si existe y está activo
				DELETE FROM actionsconf
				WHERE relationType = p_relationType
				  AND idRelation = p_idRelation
				  AND idAction = v_idAction
				  AND active = 1;
			END IF;

			SET i = i + 1;
		END WHILE;
		
		SET @out_id = 1;
		SET @message = 'Guardado con éxito.';
	ELSE
		SET @out_id = 0;
		SET @message = 'No se pudo guardar.';
	END IF;
	
	SELECT @out_id AS out_id, @message AS message;
END$$

DROP PROCEDURE IF EXISTS `insertUpdateSaleTaller`$$
CREATE PROCEDURE `insertUpdateSaleTaller`(
IN p_oGetDateNow DATETIME
, IN p_idTaller BIGINT
, IN p_idSale VARCHAR(100)
, IN p_idSucursal INT
, IN p_idSeller_idUser BIGINT
, IN p_idCustomer BIGINT
, IN p_fechaIngreso VARCHAR(100)
, IN p_fechaPrometida VARCHAR(100)
, IN p_descripcion VARCHAR(5000)

, IN p_idUserC BIGINT
)
BEGIN

	IF LENGTH( IFNULL( p_idSale ,0) ) = 0 THEN
	
		CALL getIDs_BySucursal( p_idUserC, p_idSucursal, 5, @idSaleNew );
	
		SET @sig = '';
		
		SET @sig = IFNULL(
		(
			SELECT
				CONCAT( sig, p_idSucursal, '-')
			FROM sales_type
			WHERE
				idSaleType = 5 -- TALLER
			LIMIT 1
		)
		,'V');
		
		SET p_idSale = CONCAT( @sig, @idSaleNew );

		INSERT INTO sales(
		idSale
		, createDate
		, idSucursal
		, idSeller_idUser
		, idCustomer
		, idSaleType
		, active
		)
		SELECT
		p_idSale
		,p_oGetDateNow
		,p_idSucursal
		,p_idSeller_idUser
		,p_idCustomer
		,5
		,1;
		
		INSERT INTO taller(
		idSale
		, createDate
		, descripcion
		, fechaIngreso
		, fechaPrometida
		, fechaEntrega
		, idCustomer
		, idSucursal
		, idSeller_idUser
		, active
		, idTallerStatus
		)
		SELECT
		p_idSale
		,p_oGetDateNow
		,p_descripcion
		,IF( p_fechaIngreso = '' , NULL, p_fechaIngreso )
		,IF( p_fechaPrometida = '' , NULL, p_fechaPrometida )
		,null
		,p_idCustomer
		,p_idSucursal
		,p_idSeller_idUser
		,1
		,1;
		
		SET p_idTaller = LAST_INSERT_ID();
		
	ELSE
	
		UPDATE
			sales
		SET
			idSeller_idUser = p_idSeller_idUser
			, idCustomer = p_idCustomer
		WHERE
			idSale = p_idSale
		;
		
		UPDATE
			taller
		SET
			descripcion = p_descripcion
			, fechaIngreso = IF( p_fechaIngreso = '' , NULL, p_fechaIngreso )
			, fechaPrometida = IF( p_fechaPrometida = '' , NULL, p_fechaPrometida )
			, idCustomer = p_idCustomer
			, idSucursal = p_idSucursal
			-- , idSeller_idUser = p_idSeller_idUser
		WHERE
			idSale = p_idSale
            AND idTaller = p_idTaller
		;
		
	END IF;

	SELECT p_idSale AS idSale, p_idTaller AS idTaller;

END$$

DROP PROCEDURE IF EXISTS `insertUpdateTallerMetalAgranel`$$
CREATE PROCEDURE `insertUpdateTallerMetalAgranel`(
IN p_idMetalAgranel BIGINT
, IN p_oGetDateNow DATETIME
, IN p_idTaller BIGINT
, IN p_idSale VARCHAR(100)
, IN p_tipo VARCHAR(45)
, IN p_gramos DECIMAL(18,2)
, IN p_kilates DECIMAL(18,2)
, IN p_valorMetal DECIMAL(18,2)
, IN p_costoMetal DECIMAL(18,2)
, IN p_idUserLogOn BIGINT
)
BEGIN

	DECLARE v_out_id INT DEFAULT 0;
	DECLARE v_message VARCHAR(1000) DEFAULT 0;

    IF p_idMetalAgranel = 0 THEN

        INSERT INTO taller_metal_agranel(
        createDate
        , idTaller
        , idSale
        , tipo
        , gramos
        , kilates
        , valorMetal
        , costoMetal
        , idCreateUser
        )
        SELECT
        p_oGetDateNow
        , p_idTaller
        , p_idSale
        , p_tipo
        , p_gramos
        , p_kilates
        , p_valorMetal
        , IFNULL( p_costoMetal, 0 )
        , p_idUserLogOn
        ;

        SET p_idMetalAgranel = LAST_INSERT_ID();
		SET v_out_id = p_idMetalAgranel;
		SET v_message = 'Metal Agranel agregado con éxito';

    ELSE

        INSERT INTO taller_metal_agranel_log (
            idMetalAgranel,
            createDate,
            idTaller,
            idSale,
            tipo,
            gramos,
            kilates,
            valorMetal,
            costoMetal,
            idCreateUser,
			tipoLog,
			logDate,
			idCreateUserLog
        )
        SELECT
        idMetalAgranel,
        createDate,
        idTaller,
        idSale,
        tipo,
        gramos,
        kilates,
        valorMetal,
        costoMetal,
        idCreateUser,
		'UPDATE' AS tipoLog,
		p_oGetDateNow,
		p_idUserLogOn
        FROM taller_metal_agranel
        WHERE idMetalAgranel = p_idMetalAgranel;

        UPDATE
            taller_metal_agranel
        SET
            tipo = p_tipo
            , gramos = p_gramos
            , kilates = p_kilates
            , valorMetal = p_valorMetal
            , costoMetal = IFNULL( p_costoMetal, 0 )
        WHERE
            idMetalAgranel = p_idMetalAgranel
        ;

		SET v_out_id = p_idMetalAgranel;
		SET v_message = 'Metal Agranel actualizado con éxito';

    END IF;

    SELECT v_out_id AS out_id, v_message AS message;

END$$

DROP PROCEDURE IF EXISTS `insertUpdateTallerMetalCliente`$$
CREATE PROCEDURE `insertUpdateTallerMetalCliente`(
IN p_idMetalCliente BIGINT
, IN p_oGetDateNow DATETIME
, IN p_idTaller BIGINT
, IN p_idSale VARCHAR(100)
, IN p_tipo VARCHAR(45)
, IN p_gramos DECIMAL(18,2)
, IN p_kilates DECIMAL(18,2)
, IN p_valorMetal DECIMAL(18,2)
, IN p_costoMetal DECIMAL(18,2)
, IN p_idUserLogOn BIGINT
)
BEGIN

	DECLARE v_out_id INT DEFAULT 0;
	DECLARE v_message VARCHAR(1000) DEFAULT 0;

    IF p_idMetalCliente = 0 THEN

        INSERT INTO taller_metal_cliente(
        createDate
        , idTaller
        , idSale
        , tipo
        , gramos
        , kilates
        , valorMetal
        , costoMetal
        , idCreateUser
        )
        SELECT
        p_oGetDateNow
        , p_idTaller
        , p_idSale
        , p_tipo
        , p_gramos
        , p_kilates
        , p_valorMetal
        , IFNULL( p_costoMetal, 0 )
        , p_idUserLogOn
        ;

        SET p_idMetalCliente = LAST_INSERT_ID();
		SET v_out_id = p_idMetalCliente;
		SET v_message = 'Activo del Cliente agregado con éxito';

    ELSE

        INSERT INTO taller_metal_cliente_log (
            idMetalCliente,
            createDate,
            idTaller,
            idSale,
            tipo,
            gramos,
            kilates,
            valorMetal,
            costoMetal,
            idCreateUser,
			tipoLog,
			logDate,
			idCreateUserLog
        )
        SELECT
        idMetalCliente,
        createDate,
        idTaller,
        idSale,
        tipo,
        gramos,
        kilates,
        valorMetal,
        costoMetal,
        idCreateUser,
		'UPDATE' AS tipoLog,
		p_oGetDateNow,
		p_idUserLogOn
        FROM taller_metal_cliente
        WHERE idMetalCliente = p_idMetalCliente;

        UPDATE
            taller_metal_cliente
        SET
            tipo = p_tipo
            , gramos = p_gramos
            , kilates = p_kilates
            , valorMetal = p_valorMetal
            , costoMetal = IFNULL( p_costoMetal, 0 )
        WHERE
            idMetalCliente = p_idMetalCliente
        ;

		SET v_out_id = p_idMetalCliente;
		SET v_message = 'Activo del Cliente actualizado con éxito';

    END IF;

    SELECT v_out_id AS out_id, v_message AS message;

END$$

DROP PROCEDURE IF EXISTS `insertUpdateTallerRefacciones`$$
CREATE PROCEDURE `insertUpdateTallerRefacciones`(
IN p_idRefaccion BIGINT
, IN p_oGetDateNow DATETIME
, IN p_idTaller BIGINT
, IN p_idSale VARCHAR(100)
, IN p_idProduct INT
, IN p_descripcion VARCHAR(500)
, IN p_cantidad DECIMAL( 18,2 )
, IN p_costo DECIMAL( 18,2 )
, IN p_precio DECIMAL( 18,2 )

, IN p_idUserLogOn BIGINT
)
BEGIN

	IF p_idRefaccion = 0 THEN
	
		-- ELIMINO EL ITEM EN CASO DE QUE YA EXISTIA EN LA LISTA
		DELETE FROM taller_refacciones
		WHERE
			idTaller = p_idTaller
			AND idProduct = p_idProduct
			;
	
		INSERT INTO taller_refacciones(
		createDate
		, idTaller
		, idSale
		, idProduct
		, descripcion
		, cantidad
		, costo
		, precio
		, idCreateUser
		)
		SELECT
		p_oGetDateNow
		,p_idTaller
		,p_idSale
		,p_idProduct
		,p_descripcion
		,p_cantidad
		,p_costo
		,p_precio
		,p_idUserLogOn
		;
		
		SET p_idRefaccion = LAST_INSERT_ID();
		
	ELSE
	
		INSERT INTO taller_refacciones_log (
			idRefaccion,
			createDate,
			idTaller,
			idSale,
			idProduct,
			descripcion,
			cantidad,
			costo,
			precio,
			idCreateUser,
            tipoLog,
			logDate,
			idCreateUserLog
		)
		SELECT
		idRefaccion,
		createDate,
		idTaller,
		idSale,
		idProduct,
		descripcion,
		cantidad,
		costo,
		precio,
		idCreateUser,
		'UPDATE' AS tipoLog,
		p_oGetDateNow,
		p_idUserLogOn
		FROM taller_refacciones
		WHERE idRefaccion = p_idRefaccion;
	
		UPDATE
			taller_refacciones
		SET
			idProduct = p_idProduct
			, descripcion = p_descripcion
			, cantidad = p_cantidad
			, costo = p_costo
			, precio = p_precio
		WHERE
			idRefaccion = p_idRefaccion
		;
		
	END IF;

	SELECT p_idRefaccion AS out_id;

END$$

DROP PROCEDURE IF EXISTS `insertUpdateTallerServiciosExternos`$$
CREATE PROCEDURE `insertUpdateTallerServiciosExternos`(
IN p_idServicioExternoDetalle BIGINT
, IN p_oGetDateNow DATETIME
, IN p_idTaller BIGINT
, IN p_idSale VARCHAR(100)
, IN p_idServicioExterno INT
, IN p_cantidad DECIMAL(18,2)
, IN p_costo DECIMAL(18,2)
, IN p_precio DECIMAL(18,2)
, IN p_idUserLogOn BIGINT
)
BEGIN

	DECLARE v_out_id BIGINT DEFAULT 0;
	DECLARE v_message VARCHAR(1000) DEFAULT 0;

    IF p_idServicioExternoDetalle = 0 THEN
	
		-- ELIMINO EL ITEM EN CASO DE QUE YA EXISTIA EN LA LISTA
		DELETE FROM taller_servicios_externos
		WHERE
			idTaller = p_idTaller
			AND idServicioExterno = p_idServicioExterno
			;
    
        INSERT INTO taller_servicios_externos(
        createDate
        , idTaller
        , idSale
        , idServicioExterno
        , cantidad
        , costo
        , precio
        , idCreateUser
        )
        SELECT
        p_oGetDateNow
        , p_idTaller
        , p_idSale
        , p_idServicioExterno
        , p_cantidad
        , p_costo
        , p_precio
        , p_idUserLogOn
        ;
        
        SET p_idServicioExternoDetalle = LAST_INSERT_ID();
		SET v_out_id = p_idServicioExternoDetalle;
		SET v_message = 'Servicio Externo agregado con éxito';
        
    ELSE
    
        INSERT INTO taller_servicios_externos_log (
            idServicioExternoDetalle,
            createDate,
            idTaller,
            idSale,
            idServicioExterno,
            cantidad,
            costo,
            precio,
            idCreateUser,
			tipoLog,
			logDate,
			idCreateUserLog
        )
        SELECT
        idServicioExternoDetalle,
        createDate,
        idTaller,
        idSale,
        idServicioExterno,
        cantidad,
        costo,
        precio,
        idCreateUser,
		'UPDATE' AS tipoLog,
		p_oGetDateNow,
		p_idUserLogOn
        FROM taller_servicios_externos
        WHERE idServicioExternoDetalle = p_idServicioExternoDetalle;
    
        UPDATE
            taller_servicios_externos
        SET
            idServicioExterno = p_idServicioExterno
            , cantidad = p_cantidad
            , costo = p_costo
            , precio = p_precio
        WHERE
            idServicioExternoDetalle = p_idServicioExternoDetalle
        ;
		
		SET v_out_id = p_idServicioExternoDetalle;
		SET v_message = 'Servicio Externo actualizado con éxito';
        
    END IF;

    SELECT v_out_id AS out_id, v_message AS message;

END$$

DROP PROCEDURE IF EXISTS `insertUser`$$
CREATE PROCEDURE `insertUser`(
IN p_nombre VARCHAR(150)
, IN p_apellidoPaterno VARCHAR(100)
, IN p_apellidoMaterno VARCHAR(100)
, IN p_userName VARCHAR(500)
, IN p_pwd TEXT
, IN p_authorizationCode VARCHAR(45)
, IN p_comision FLOAT
, IN p_destajo DECIMAL( 18,2 )
, IN p_active SMALLINT
, IN p_bAcceso TINYINT

, IN p_idUserC BIGINT
)
BEGIN

	SET @idUserAuthorizationCode = 0;
	SET @idUserUserName = 0;
	SET @out_id = 0;
	SET @message = '';

	-- Nombre completo que lee el resto del sistema: apellidos primero.
	SET @nombre = TRIM( IFNULL(p_nombre, '') );
	SET @apellidos = TRIM( CONCAT_WS( ' ', NULLIF(TRIM(p_apellidoPaterno), ''), NULLIF(TRIM(p_apellidoMaterno), '') ) );
	SET @nameCompleto = IF( @apellidos = '', @nombre, CONCAT( @apellidos, ', ', @nombre ) );

	SET @idUserAuthorizationCode = IFNULL(
	(
		SELECT
		idUser
		FROM users
		WHERE authorizationCode = p_authorizationCode
		AND LENGTH( p_authorizationCode ) > 0
		LIMIT 1
	)
	,0);

	SET @idUserUserName = IFNULL(
	(
		SELECT
		idUser
		FROM users
		WHERE userName = p_userName
		AND bAcceso = 1
		AND p_bAcceso = 1
		AND LENGTH( p_userName ) > 0
		LIMIT 1
	)
	,0);

	IF LENGTH( @nombre ) = 0 THEN
		SET @out_id = 0;
		SET @message = 'El nombre es obligatorio.';

	ELSEIF p_bAcceso = 1 AND ( LENGTH( IFNULL(p_userName, '') ) = 0 OR LENGTH( IFNULL(p_pwd, '') ) = 0 ) THEN
		SET @out_id = 0;
		SET @message = 'Con acceso al sistema, el usuario y la contraseña son obligatorios.';

	ELSEIF @idUserAuthorizationCode > 0 THEN
		SET @out_id = 0;
		SET @message = 'Ese código de autorización ya se está utilizando.';

	ELSEIF @idUserUserName > 0 THEN
		SET @out_id = 0;
		SET @message = 'Ese usuario ya se está utilizando.';

	ELSE

		CALL getIDKeyByUserWithOUT( p_idUserC, @idNew );

		INSERT INTO users(
		idUser
		, createDate
		, name
		, nombre
		, apellidoPaterno
		, apellidoMaterno
		, userName
		, pwd
		, authorizationCode
		, comision
		, active
        , destajo
		, bAcceso
		)
		SELECT
		@idNew
		, NOW()
		, @nameCompleto
		, @nombre
		, NULLIF( TRIM(p_apellidoPaterno), '' )
		, NULLIF( TRIM(p_apellidoMaterno), '' )
		, p_userName
		, p_pwd
		, p_authorizationCode
		, p_comision
		, p_active
        , p_destajo
		, p_bAcceso;

		IF EXISTS ( SELECT 1 FROM roles WHERE idRol = 7 ) THEN
			INSERT INTO rolesconfig ( createDate, idUser, idRol )
			VALUES ( NOW(), @idNew, 7 );
		END IF;

		SET @out_id = @idNew;
		SET @message = 'Empleado guardado con éxito.';

	END IF;

	SELECT @out_id AS out_id, @message AS message;

END$$

DROP PROCEDURE IF EXISTS `rep_getUtilidades`$$
CREATE PROCEDURE `rep_getUtilidades`(
IN p_startDate VARCHAR(500)
, IN p_endDate VARCHAR(500)
, IN p_idSucursal INT
, IN idSeller_idUser BIGINT
, IN p_idGroup INT

, IN p_idUserC BIGINT
)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SET @iRows = 0;
	
	-- Crear la tabla temporal
	CREATE TEMPORARY TABLE salesListSec (
		id BIGINT AUTO_INCREMENT,
		idSale VARCHAR(100),
		idSaleDetail BIGINT,
		PRIMARY KEY (id)
	) ENGINE=InnoDB;
    
	CREATE TEMPORARY TABLE amountProseced (
		id BIGINT AUTO_INCREMENT,
		idSale VARCHAR(100),
		costSale FLOAT,
		impSale FLOAT,
		impSaleThis FLOAT,
		paymentsHist FLOAT,
		paymentsRange FLOAT,
		ventaDesc VARCHAR(5000),
		PRIMARY KEY (id)
	) ENGINE=InnoDB;
    
	INSERT INTO amountProseced
	(
		idSale
		, costSale
		, impSale
		, impSaleThis
		, paymentsHist
		, paymentsRange
		, ventaDesc
	)
	-- Mostrar los datos de la tabla temporal
	SELECT

	S.idSale
	,IFNULL(
		(
			SELECT SUM( SDD.cost * SDD.cantidad )
			FROM salesdetail AS SDD
			INNER JOIN products AS PPP ON SDD.idProduct = PPP.idProduct
			WHERE
				SDD.active = 1
				AND SDD.idSale = S.idSale
				AND
				(
					p_idGroup = 0
					OR PPP.idGroup = p_idGroup
				)
			GROUP BY S.idSale
		), 0) AS costSale

	,IFNULL(
		(
			SELECT SUM( SDD.importe )
			FROM salesdetail AS SDD
			INNER JOIN products AS PPP ON SDD.idProduct = PPP.idProduct
			WHERE
				SDD.active = 1
				AND SDD.idSale = S.idSale
			GROUP BY S.idSale
		), 0) AS impSale

	,IFNULL(
		(
			SELECT SUM( SDD.importe )
			FROM salesdetail AS SDD
			INNER JOIN products AS PPP ON SDD.idProduct = PPP.idProduct
			WHERE
				SDD.active = 1
				AND SDD.idSale = S.idSale
				AND
				(
					p_idGroup = 0
					OR PPP.idGroup = p_idGroup
				)
			GROUP BY S.idSale
		), 0) AS impSaleThis

	,IFNULL(
		(
			SELECT SUM( pago )
			FROM payments AS P2
			WHERE
				P2.active = 1
				AND P2.idRelation = S.idSale
				AND
				(
					LENGTH( p_startDate ) > 0
					AND LENGTH( p_endDate ) > 0
					AND CAST( P2.createDate AS DATE ) < CAST( p_startDate AS DATE)
				)
			GROUP BY S.idSale
		), 0) AS paymentsHist

	,IFNULL(
		(
			SELECT SUM( pago )
			FROM payments AS P3
			WHERE
				P3.active = 1
				AND P3.idRelation = S.idSale
				AND
				(
					p_startDate = ''
					OR CAST( P3.createDate AS DATE ) BETWEEN CAST( p_startDate AS DATE) AND CAST( p_endDate AS DATE)
				)
			GROUP BY S.idSale

		), 0) AS paymentsRange

	,IFNULL(
	(
		SELECT GROUP_CONCAT( PPP.name )
		FROM salesdetail AS SDD
		INNER JOIN products AS PPP ON SDD.idProduct = PPP.idProduct
		WHERE
			SDD.active = 1
			AND SDD.idSale = S.idSale
			AND
			(
				p_idGroup = 0
				OR PPP.idGroup = p_idGroup
			)
		GROUP BY S.idSale
	), 0) AS ventaDesc

	
	FROM payments AS P
	INNER JOIN sales AS S ON S.active = 1 AND P.idRelation = S.idSale
	INNER JOIN sucursalesconfig AS SC ON S.idSucursal = SC.idSucursal
	INNER JOIN salesdetail AS SD ON SD.active = 1 AND S.idSale = SD.idSale
	INNER JOIN products AS PP ON SD.idProduct = PP.idProduct
	WHERE
		P.active = 1
		AND SC.idUser = p_idUserC
		AND
		(
			p_startDate = ''
			OR CAST( P.createDate AS DATE ) BETWEEN CAST( p_startDate AS DATE ) AND CAST( p_endDate AS DATE )
		)
		AND
		(
			p_idSucursal = 0
			OR S.idSucursal = p_idSucursal
		)
		AND
		(
			idSeller_idUser = 0
			OR S.idSeller_idUser = idSeller_idUser
		)
		AND
		(
			p_idGroup = 0
			OR PP.idGroup = p_idGroup
		)
	GROUP BY P.idRelation, S.idSale;

	SET @sumUtilidad = 0;

	SET @sumUtilidad =
	IFNULL(
	(
		SELECT
			ROUND( SUM(
							( 
								( ( paymentsHist + paymentsRange ) * ( ( impSaleThis * 100 / impSale ) / 100 ) ) - costSale
							)
						) ,2)
		FROM amountProseced AS S
		WHERE ( ( ( paymentsHist + paymentsRange ) * ( ( impSaleThis * 100 / impSale ) / 100 ) ) - costSale ) > 0
	), 0);

	SELECT
	S.idSale
	, S.costSale
	, S.impSale
	, S.impSaleThis
	, S.paymentsHist
	, S.paymentsRange

	, ( ( impSaleThis * 100 / impSale ) / 100 ) AS porcentaje

	, ( ( paymentsHist + paymentsRange ) * ( ( impSaleThis * 100 / impSale ) / 100 ) ) - costSale AS fUtilidad

	, @sumUtilidad AS sumUtilidad

	, ventaDesc
	
	FROM amountProseced AS S
	WHERE ( ( ( paymentsHist + paymentsRange ) * ( ( impSaleThis * 100 / impSale ) / 100 ) ) - costSale ) > 0
	;
    
    DROP TABLE salesListSec;
    DROP TABLE amountProseced;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DROP PROCEDURE IF EXISTS `updateFirmaEntradaInventario`$$
CREATE PROCEDURE `updateFirmaEntradaInventario`(
IN p_iOption INT
, IN p_idProduct BIGINT
, IN p_startDate VARCHAR(500)
, IN p_endDate VARCHAR(500)
, IN p_noEntrada VARCHAR(500)
, IN p_auth_idUser BIGINT

, IN p_idUserC BIGINT
)
BEGIN

	DECLARE mensaje_error TEXT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- Capturar el mensaje de error
        GET DIAGNOSTICS CONDITION 1 mensaje_error = MESSAGE_TEXT;
        SELECT 0 AS out_id, mensaje_error AS message;
    END;

	SET @out_id = 0;
	SET @message = '';
	
	IF p_iOption = 1 THEN
	
		UPDATE
			inventarylog AS IL
			INNER JOIN products AS P ON P.active = 1 AND IL.idProduct = P.idProduct
			INNER JOIN users AS U ON IL.idUser = U.idUser
		SET
			IL.firmaVer = 1
			, IL.firmaVerNoUser = p_auth_idUser
			, P.price = IF( IFNULL( IL.newPrice, 0 ) > 0 , IFNULL( IL.newPrice, 0 ), P.price )
			, P.cost = IF( IFNULL( IL.newCost, 0 ) > 0 , IFNULL( IL.newCost, 0 ), P.cost )
		WHERE
			IL.active = 1
            AND IL.cantidad > 0
			AND IL.firmaVer = 0
			AND
			(
				p_idProduct = 0
				OR P.idProduct = p_idProduct
			)
			AND
			(
				p_startDate = ''
				OR CAST( IL.createDate AS DATE ) BETWEEN CAST( p_startDate AS DATE ) AND CAST( p_endDate AS DATE )
			)
			AND
			(
				p_noEntrada = ''
				OR IL.noEntrada = p_noEntrada
			);
		
		SET @out_id = 1;
		SET @message = 'Verificada con éxito.';
	
	ELSEIF p_iOption = 2 THEN
	
		UPDATE
			inventarylog AS IL
			INNER JOIN products AS P ON P.active = 1 AND IL.idProduct = P.idProduct
			INNER JOIN users AS U ON IL.idUser = U.idUser
		SET
			IL.firmaMost = 1
			, IL.firmaMostNoUser = p_auth_idUser
		WHERE
			IL.active = 1
            AND IL.cantidad > 0
			AND IL.firmaVer = 1
			AND IL.firmaMost = 0
			AND
			(
				p_idProduct = 0
				OR P.idProduct = p_idProduct
			)
			AND
			(
				p_startDate = ''
				OR CAST( IL.createDate AS DATE ) BETWEEN CAST( p_startDate AS DATE ) AND CAST( p_endDate AS DATE )
			)
			AND
			(
				p_noEntrada = ''
				OR IL.noEntrada = p_noEntrada
			);
		
		SET @out_id = 1;
		SET @message = 'Recibida con éxito.';
	
	END IF;

	SELECT @out_id AS out_id, @message AS message;

END$$

DROP PROCEDURE IF EXISTS `updateFirmaEntradaInventarioByidInventarylog`$$
CREATE PROCEDURE `updateFirmaEntradaInventarioByidInventarylog`(
IN p_iOption INT
, IN p_idInventarylog BIGINT
, IN p_auth_idUser BIGINT

, IN p_idUserC BIGINT
)
BEGIN

	DECLARE mensaje_error TEXT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- Capturar el mensaje de error
        GET DIAGNOSTICS CONDITION 1 mensaje_error = MESSAGE_TEXT;
        SELECT 0 AS out_id, mensaje_error AS message;
    END;

	SET @out_id = 0;
	SET @message = '';
	
	IF p_iOption = 1 THEN
	
		UPDATE
			inventarylog AS IL
			INNER JOIN products AS P ON P.active = 1 AND IL.idProduct = P.idProduct
		SET
			IL.firmaVer = 1
			, IL.firmaVerNoUser = p_auth_idUser
			, P.price = IF( IFNULL( IL.newPrice, 0 ) > 0 , IFNULL( IL.newPrice, 0 ), P.price )
			, P.cost = IF( IFNULL( IL.newCost, 0 ) > 0 , IFNULL( IL.newCost, 0 ), P.cost )
		WHERE
			IL.active = 1
			AND IL.firmaVer = 0
			AND IL.idInventarylog = p_idInventarylog;
		
		SET @out_id = 1;
		SET @message = 'Verificada con éxito.';
	
	ELSEIF p_iOption = 2 THEN
	
		UPDATE
			inventarylog AS IL
		SET
			IL.firmaMost = 1
			, IL.firmaMostNoUser = p_auth_idUser
		WHERE
			IL.active = 1
			AND IL.firmaVer = 1
			AND IL.firmaMost = 0
			AND IL.idInventarylog = p_idInventarylog;
		
		SET @out_id = 1;
		SET @message = 'Recibida con éxito.';
	
	END IF;

	SELECT @out_id AS out_id, @message AS message;

END$$

DROP PROCEDURE IF EXISTS `updateRol`$$
CREATE PROCEDURE `updateRol`(
IN p_idRol INT
, IN p_name VARCHAR(500)
, IN p_description VARCHAR(500)
, IN p_active SMALLINT
, IN p_idTipoRol INT
)
BEGIN

	SET @idRol = 0;
	SET @out_id = 0;
	SET @message = '';
	SET @bSistema = IFNULL( ( SELECT bSistema FROM roles WHERE idRol = p_idRol ), 0 );

	SET @idRol = IFNULL(
	(
		SELECT
		idRol
		FROM roles
		WHERE name = p_name
		AND idRol <> p_idRol
		LIMIT 1
	)
	,0);

	IF @bSistema = 1 AND EXISTS (
		SELECT 1 FROM roles
		WHERE idRol = p_idRol
		AND (
			name <> p_name
			OR NOT ( idTipoRol <=> p_idTipoRol )
			OR IFNULL(active, 0) <> IFNULL(p_active, 0)
		)
	) THEN
		SET @out_id = 0;
		SET @message = 'Es un puesto del sistema: no se puede cambiar el nombre, el tipo ni el estatus.';

	ELSEIF @bSistema = 0 AND IFNULL( p_idTipoRol, 0 ) = 3 THEN
		SET @out_id = 0;
		SET @message = 'El tipo Empleados es exclusivo del puesto del sistema "Empleado".';

	ELSEIF p_idTipoRol IS NOT NULL AND NOT EXISTS ( SELECT 1 FROM roles_tipo WHERE idTipoRol = p_idTipoRol ) THEN
		SET @out_id = 0;
		SET @message = 'El tipo de puesto no existe.';

	ELSEIF @idRol > 0 THEN
		SET @out_id = 0;
		SET @message = 'El nombre del puesto ya se está utilizando.';

	ELSE

		UPDATE
			roles
		SET
			name = p_name
			, description = p_description
			, active = p_active
			, idTipoRol = p_idTipoRol
		WHERE
			idRol = p_idRol;

		SET @out_id = p_idRol;

		SET @message = 'Puesto actualizado con éxito.';

		DELETE FROM sync_up WHERE tabla = 'Roles' AND idRelation = p_idRol;

	END IF;

	SELECT @out_id AS out_id, @message AS message;

END$$

DROP PROCEDURE IF EXISTS `updateUser`$$
CREATE PROCEDURE `updateUser`(
IN p_idUser BIGINT
, IN p_nombre VARCHAR(150)
, IN p_apellidoPaterno VARCHAR(100)
, IN p_apellidoMaterno VARCHAR(100)
, IN p_userName VARCHAR(500)
, IN p_authorizationCode VARCHAR(45)
, IN p_comision FLOAT
, IN p_destajo DECIMAL( 18,2 )
, IN p_active SMALLINT
, IN p_bAcceso TINYINT
, IN p_pwd TEXT
)
BEGIN

	-- p_pwd: hash ya calculado por el controller; '' = no cambia la
	-- contraseña actual.
	SET @idUserAuthorizationCode = 0;
	SET @idUserUserName = 0;
	SET @out_id = 0;
	SET @message = '';

	-- Nombre completo que lee el resto del sistema: apellidos primero.
	SET @nombre = TRIM( IFNULL(p_nombre, '') );
	SET @apellidos = TRIM( CONCAT_WS( ' ', NULLIF(TRIM(p_apellidoPaterno), ''), NULLIF(TRIM(p_apellidoMaterno), '') ) );
	SET @nameCompleto = IF( @apellidos = '', @nombre, CONCAT( @apellidos, ', ', @nombre ) );

	SET @idUserAuthorizationCode = IFNULL(
	(
		SELECT
		idUser
		FROM users
		WHERE authorizationCode = p_authorizationCode
		AND idUser <> p_idUser
		AND LENGTH( p_authorizationCode ) > 0
		LIMIT 1
	)
	,0);

	SET @idUserUserName = IFNULL(
	(
		SELECT
		idUser
		FROM users
		WHERE userName = p_userName
		AND idUser <> p_idUser
		AND bAcceso = 1
		AND p_bAcceso = 1
		AND LENGTH( p_userName ) > 0
		LIMIT 1
	)
	,0);

	IF LENGTH( @nombre ) = 0 THEN
		SET @out_id = 0;
		SET @message = 'El nombre es obligatorio.';

	ELSEIF p_bAcceso = 1 AND LENGTH( IFNULL(p_userName, '') ) = 0 THEN
		SET @out_id = 0;
		SET @message = 'Con acceso al sistema, el usuario es obligatorio.';

	ELSEIF p_bAcceso = 1 AND LENGTH( IFNULL(p_pwd, '') ) = 0
		AND LENGTH( IFNULL( ( SELECT pwd FROM users WHERE idUser = p_idUser ), '' ) ) = 0 THEN
		SET @out_id = 0;
		SET @message = 'Para darle acceso al sistema captura una contraseña.';

	ELSEIF @idUserAuthorizationCode > 0 THEN
		SET @out_id = 0;
		SET @message = 'Ese código de autorización ya se está utilizando.';

	ELSEIF @idUserUserName > 0 THEN
		SET @out_id = 0;
		SET @message = 'Ese usuario ya se está utilizando.';

	ELSE

		UPDATE
			users
		SET
			name = @nameCompleto
			, nombre = @nombre
			, apellidoPaterno = NULLIF( TRIM(p_apellidoPaterno), '' )
			, apellidoMaterno = NULLIF( TRIM(p_apellidoMaterno), '' )
			, userName = p_userName
			, authorizationCode = p_authorizationCode
			, comision = p_comision
			, active = p_active
            , destajo = p_destajo
			, bAcceso = p_bAcceso
			, pwd = IF( LENGTH( IFNULL(p_pwd, '') ) > 0, p_pwd, pwd )
		WHERE
			idUser = p_idUser;

		SET @out_id = p_idUser;

		SET @message = 'Empleado actualizado con éxito.';

		DELETE FROM sync_up WHERE tabla = 'Users' AND idRelation = p_idUser;

	END IF;

	SELECT @out_id AS out_id, @message AS message;

END$$


DELIMITER ;