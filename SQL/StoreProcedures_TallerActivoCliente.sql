-- ========================================
-- STORED PROCEDURES - TALLER ACTIVO CLIENTE
-- ========================================

CREATE PROCEDURE insertUpdateTallerMetalCliente (
IN p_idMetalCliente BIGINT
, IN p_oGetDateNow DATETIME
, IN p_idTaller BIGINT
, IN p_idSale VARCHAR(100)
, IN p_tipo VARCHAR(45)
, IN p_gramos DECIMAL(18,2)
, IN p_kilates DECIMAL(18,2)
, IN p_valorMetal DECIMAL(18,2)
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
        WHERE
            idMetalCliente = p_idMetalCliente
        ;

		SET v_out_id = p_idMetalCliente;
		SET v_message = 'Activo del Cliente actualizado con éxito';

    END IF;

    SELECT v_out_id AS out_id, v_message AS message;

END;

-- ========================================

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

END;

-- ========================================

CREATE PROCEDURE getTallerMetalesCliente(
	IN p_idTaller BIGINT
)
BEGIN

    SELECT
        idMetalCliente,
        createDate,
        idTaller,
        idSale,
        tipo,
        gramos,
        kilates,
        valorMetal
    FROM taller_metal_cliente
    WHERE idTaller = p_idTaller
	ORDER BY createDate DESC;

END;
