-- ========================================
-- STORED PROCEDURES - TALLER METAL CLIENTE IMÁGENES
-- ========================================

CREATE PROCEDURE insertMetalClienteImg (
IN p_idMetalCliente BIGINT
, IN p_oGetDateNow DATETIME
, IN p_nombreImgOriginal VARCHAR(5000)
, IN p_nombreImgNew VARCHAR(5000)
, IN p_urlImg VARCHAR(5000)
)
BEGIN

	DECLARE v_out_id INT DEFAULT 0;
	DECLARE v_message VARCHAR(1000) DEFAULT 0;

    INSERT INTO taller_metal_cliente_img(
        createDate,
        idMetalCliente,
        nombreImgOriginal,
        nombreImgNew,
        urlImg
    )
    SELECT
        p_oGetDateNow,
        p_idMetalCliente,
        p_nombreImgOriginal,
        p_nombreImgNew,
        p_urlImg
    ;

    SET v_out_id = LAST_INSERT_ID();
    SET v_message = 'Imagen agregada con éxito';

    SELECT v_out_id AS out_id, v_message AS message;

END;

-- ========================================

CREATE PROCEDURE getMetalClienteImgs(
	IN p_idMetalCliente BIGINT
)
BEGIN

    SELECT
        keyX,
        createDate,
        idMetalCliente,
        nombreImgOriginal,
        nombreImgNew,
        urlImg
    FROM taller_metal_cliente_img
    WHERE idMetalCliente = p_idMetalCliente
	ORDER BY createDate DESC;

END;

-- ========================================

CREATE PROCEDURE deleteMetalClienteImg (
IN p_keyX BIGINT
)
BEGIN

	DECLARE v_out_id INT DEFAULT 0;
	DECLARE v_message VARCHAR(1000) DEFAULT 0;

    DELETE FROM taller_metal_cliente_img
    WHERE keyX = p_keyX;

    IF ROW_COUNT() > 0 THEN
		SET v_out_id = 1;
		SET v_message = 'Imagen eliminada correctamente';
	ELSE
		SET v_out_id = 0;
		SET v_message = 'No se pudo eliminar la imagen';
	END IF;

	SELECT v_out_id as out_id, v_message AS message;

END;
