-- ============================================================
-- STORED PROCEDURES - TALLER (HEADER / FOLIO)
-- ============================================================

DROP PROCEDURE IF EXISTS `insertUpdateSaleTaller`;

DELIMITER $$

CREATE PROCEDURE insertUpdateSaleTaller (
  IN p_oGetDateNow      DATETIME
, IN p_idTaller         BIGINT
, IN p_idSale           VARCHAR(100)
, IN p_idSucursal       INT
, IN p_idSeller_idUser  BIGINT
, IN p_idCustomer       BIGINT
, IN p_fechaIngreso     VARCHAR(100)
, IN p_fechaPrometida   VARCHAR(100)
, IN p_descripcion      VARCHAR(5000)
, IN p_idUserC          BIGINT
)
BEGIN

    IF LENGTH( IFNULL( p_idSale ,0) ) = 0 THEN

        -- Obtiene el siguiente número secuencial por sucursal para idSaleType = 5 (Taller)
        CALL getIDs_BySucursal( p_idUserC, p_idSucursal, 5, @idSaleNew );

        SET @sig = '';

        -- Obtiene el prefijo de la tabla sales_type (ej: 'Tall')
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

        -- Folio resultante: 'Tall1-000123'
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
            , p_oGetDateNow
            , p_idSucursal
            , p_idSeller_idUser
            , p_idCustomer
            , 5
            , 1;

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
            , p_oGetDateNow
            , p_descripcion
            , IF( p_fechaIngreso  = '' , NULL, p_fechaIngreso )
            , IF( p_fechaPrometida = '' , NULL, p_fechaPrometida )
            , NULL
            , p_idCustomer
            , p_idSucursal
            , p_idSeller_idUser
            , 1
            , 1; -- idTallerStatus = 1 (Cotización)

        SET p_idTaller = LAST_INSERT_ID();

    ELSE

        UPDATE sales
        SET
            idSeller_idUser = p_idSeller_idUser
            , idCustomer    = p_idCustomer
        WHERE
            idSale = p_idSale;

        UPDATE taller
        SET
            descripcion    = p_descripcion
            , fechaIngreso  = IF( p_fechaIngreso  = '' , NULL, p_fechaIngreso )
            , fechaPrometida = IF( p_fechaPrometida = '' , NULL, p_fechaPrometida )
            , idCustomer    = p_idCustomer
            , idSucursal    = p_idSucursal
            -- , idSeller_idUser = p_idSeller_idUser
        WHERE
            idSale   = p_idSale
            AND idTaller = p_idTaller;

    END IF;

    SELECT p_idSale AS idSale, p_idTaller AS idTaller;

END$$

DELIMITER ;
