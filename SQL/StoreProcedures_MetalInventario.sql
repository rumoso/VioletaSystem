-- ============================================================
-- STORED PROCEDURES - INVENTARIO DE METAL
-- (analisis/001-control-inventario-metal.md)
-- Convenciones:
--  - La sucursal SIEMPRE opera en fino (METAL-ORO-24 / METAL-PLATA-1000):
--    todo efecto a sucursal usa gramosFino sobre el producto fino.
--  - El técnico opera en el producto capturado (gramos del kilataje/ley).
--  - El equivalente fino SIEMPRE se calcula en servidor:
--    oro: gramos * kilataje / 24 ; plata: gramos * ley / 1000.
--  - El kardex es inmutable: correcciones = REVERSA + movimiento nuevo.
-- ============================================================

-- ------------------------------------------------------------
-- Worker interno: registra el movimiento en el track y aplica el
-- efecto en los saldos. No emite result set. No valida saldos (las
-- validaciones las hacen los SPs públicos que lo llaman).
--
-- Guardián de integridad (reemplaza a los triggers de
-- alter_metal_inventario_guard.sql, retirados 2026-09-12): TODA
-- escritura a metal_inventario pasa por este SP, así que las reglas
-- viven aquí y abortan con SIGNAL para que el que llama haga ROLLBACK:
--   1) El producto debe ser METAL-ORO-% o METAL-PLATA-% — nunca una
--      joya. Antes el ELSE trataba cualquier otro producto como plata.
--   2) La sucursal SOLO guarda fino (METAL-ORO-24 / METAL-PLATA-1000):
--      se garantiza por diseño, porque su efecto siempre usa
--      v_idProductFino; aquí se valida que ese producto exista.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `metalInventario_apply`;

DELIMITER $$

CREATE PROCEDURE metalInventario_apply (
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

DELIMITER ;

-- ------------------------------------------------------------
-- Movimiento manual (entrada / traspaso / ajuste) — pantalla de
-- transferencias. Permiso tall_MetalInvTransferir (valida el Front;
-- patrón del proyecto).
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `insertMetalInventarioMovimiento`;

DELIMITER $$

CREATE PROCEDURE insertMetalInventarioMovimiento (
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

DELIMITER ;

-- ------------------------------------------------------------
-- Saldos por propietario. p_tipoPropietario '' = todos.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `getMetalInventarioSaldos`;

DELIMITER $$

CREATE PROCEDURE getMetalInventarioSaldos (
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

DELIMITER ;

-- ------------------------------------------------------------
-- Kardex paginado. Filtros opcionales: propietario (matchea origen
-- o destino), rango de fechas.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `getMetalInventarioTrack`;

DELIMITER $$

CREATE PROCEDURE getMetalInventarioTrack (
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

DELIMITER ;

-- ------------------------------------------------------------
-- Asignación: al pasar el folio a Asignado se mueve el metal.
-- Valida fino de sucursal ANTES de mover (atómico).
-- out_id: 1 = movido, 2 = ya estaba movido / nada que mover, 0 = error.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `asignarMetalInventarioByTaller`;

DELIMITER $$

CREATE PROCEDURE asignarMetalInventarioByTaller (
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
	IF EXISTS ( SELECT 1 FROM metal_inventario_track WHERE idTaller = p_idTaller AND tipoMovimiento = 'ASIGNACION' ) THEN
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

DELIMITER ;

-- ------------------------------------------------------------
-- METAL FINAL: CRUD
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `insertUpdateTallerMetalFinal`;

DELIMITER $$

CREATE PROCEDURE insertUpdateTallerMetalFinal (
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

DELIMITER ;

DROP PROCEDURE IF EXISTS `deleteMetalFinal`;

DELIMITER $$

CREATE PROCEDURE deleteMetalFinal (
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

DELIMITER ;

DROP PROCEDURE IF EXISTS `getTallerMetalesFinal`;

DELIMITER $$

CREATE PROCEDURE getTallerMetalesFinal (
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

DELIMITER ;

-- ------------------------------------------------------------
-- Entrega a mostrador: valida que cada técnico cubra su Metal
-- final por kilataje/ley y descuenta del inventario (atómico).
-- out_id: 1 = descontado, 2 = nada que descontar / ya descontado,
-- 0 = no cubre (mensaje con el detalle).
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `entregarMetalFinalByTaller`;

DELIMITER $$

CREATE PROCEDURE entregarMetalFinalByTaller (
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

	IF EXISTS ( SELECT 1 FROM metal_inventario_track WHERE idTaller = p_idTaller AND tipoMovimiento = 'METAL_FINAL' ) THEN
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
