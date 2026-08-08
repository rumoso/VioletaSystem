-- ============================================================
-- COSTO DEL METAL EN TALLER (metal a granel y metal cliente)
-- Agrega costoMetal a las tablas y lo integra en los SPs.
-- El costo se calcula/guarda siempre; el Front solo lo muestra
-- con el permiso tall_verCostos.
-- ============================================================

-- ---------- Columnas (idempotente) ----------

SET @stmt = (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller_metal_agranel' AND COLUMN_NAME = 'costoMetal'),
  'ALTER TABLE taller_metal_agranel ADD COLUMN costoMetal DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER valorMetal',
  'SELECT 1'));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller_metal_agranel_log' AND COLUMN_NAME = 'costoMetal'),
  'ALTER TABLE taller_metal_agranel_log ADD COLUMN costoMetal DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER valorMetal',
  'SELECT 1'));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller_metal_cliente' AND COLUMN_NAME = 'costoMetal'),
  'ALTER TABLE taller_metal_cliente ADD COLUMN costoMetal DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER valorMetal',
  'SELECT 1'));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller_metal_cliente_log' AND COLUMN_NAME = 'costoMetal'),
  'ALTER TABLE taller_metal_cliente_log ADD COLUMN costoMetal DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER valorMetal',
  'SELECT 1'));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ---------- Stored procedures ----------

DROP PROCEDURE IF EXISTS `insertUpdateTallerMetalAgranel`;

DELIMITER $$

CREATE PROCEDURE insertUpdateTallerMetalAgranel (
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

DELIMITER ;

DROP PROCEDURE IF EXISTS `insertUpdateTallerMetalCliente`;

DELIMITER $$

CREATE PROCEDURE insertUpdateTallerMetalCliente (
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

DELIMITER ;

DROP PROCEDURE IF EXISTS `getTallerMetalesAgranel`;

DELIMITER $$

CREATE PROCEDURE getTallerMetalesAgranel (
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

DELIMITER ;

DROP PROCEDURE IF EXISTS `getTallerMetalesCliente`;

DELIMITER $$

CREATE PROCEDURE getTallerMetalesCliente (
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

DELIMITER ;

DROP PROCEDURE IF EXISTS `deleteMetalAgranel`;

DELIMITER $$

CREATE PROCEDURE deleteMetalAgranel (
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

DELIMITER ;

DROP PROCEDURE IF EXISTS `deleteMetalCliente`;

DELIMITER $$

CREATE PROCEDURE deleteMetalCliente (
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

DELIMITER ;
