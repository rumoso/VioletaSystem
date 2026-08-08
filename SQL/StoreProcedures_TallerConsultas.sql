-- ============================================================
-- STORED PROCEDURES - TALLER (consultas, refacciones, servicios
-- externos y sobre). Extraidos de la BD local el 2026-08-07 para
-- poder desplegarlos en otros ambientes.
-- ============================================================

DROP PROCEDURE IF EXISTS `getTallerByID`;

DELIMITER $$

CREATE PROCEDURE `getTallerByID`(IN p_idTaler VARCHAR(100))
BEGIN

	SET @v_idSale = '';
	
	SELECT
		T.idSale
	INTO
		@v_idSale
	FROM taller AS T
	WHERE T.idTaller = p_idTaler;

	SELECT
	T.idTaller
	, T.idSale
	, T.createDate
	, DATE_FORMAT( DATE_SUB( T.createDate , INTERVAL @iHours HOUR ), '%d-%m-%Y %h:%i:%s %p') AS createDateString
	, DATE_FORMAT( T.createDate, '%d-%m-%Y') AS createDateDate
	, DATE_FORMAT( T.createDate, '%h:%i:%s %p') AS createDateHours
	, IFNULL( T.descripcion ,'') AS descripcion
	, IFNULL( DATE_FORMAT( T.fechaIngreso, '%Y-%m-%d') ,'') AS fechaIngreso
	, IFNULL( DATE_FORMAT( T.fechaPrometida, '%Y-%m-%d') ,'') AS fechaPrometida
	, IFNULL( DATE_FORMAT( T.fechaEntrega, '%Y-%m-%d %h:%i:%s %p') ,'') AS fechaEntrega
	
	, T.idCustomer
	, CONCAT( C.lastName, ' ', C.name, ' - ', C.tel, ' - ' , C.address) AS customerDesc

	, T.idSucursal
	, SS.name AS sucursalDesc
	
	, T.idSeller_idUser
	, CONCAT( '#', U.idUser, ' - ' , U.name) AS sellerDesc
	
    , T.`active`
	, T.idTallerStatus
    , IFNULL( T.manoObraPrecio ,0) AS manoObraPrecio
	
	, ROUND( IFNULL( AAA.pagado ,0) ,2) AS pagado
	, ROUND( IFNULL( T.precioTotal ,0) - IFNULL( AAA.pagado ,0) ,2) AS pendingAmount
	
	, ROUND( IFNULL( T.precioTotal ,0) ,2) AS saleTotal
    
	FROM taller AS T
	INNER JOIN sucursales AS SS ON T.idSucursal = SS.idSucursal
	INNER JOIN users AS U ON T.idSeller_idUser = U.idUser
	INNER JOIN customers AS C ON T.idCustomer = C.idCustomer
	LEFT JOIN
	(
		SELECT
		idRelation
		,ROUND( SUM( PP.pago ) ,2) AS pagado
		FROM payments AS PP
		WHERE PP.relationType IN('V','A')
		AND PP.idRelation = @v_idSale
		AND PP.active = 1
		GROUP BY PP.idRelation
	) AS AAA ON AAA.idRelation = T.idSale
	WHERE
		T.idTaller = p_idTaler
	;

END$$

DELIMITER ;

DROP PROCEDURE IF EXISTS `getTallerByIdSale`;

DELIMITER $$

CREATE PROCEDURE `getTallerByIdSale`(IN p_idSale VARCHAR(100))
BEGIN

	SELECT
	T.idTaller
	, T.idSale
	, T.createDate
	, DATE_FORMAT( DATE_SUB( T.createDate , INTERVAL @iHours HOUR ), '%d-%m-%Y %h:%i:%s %p') AS createDateString
	, DATE_FORMAT( T.createDate, '%d-%m-%Y') AS createDateDate
	, DATE_FORMAT( T.createDate, '%h:%i:%s %p') AS createDateHours
	, IFNULL( T.descripcion ,'') AS descripcion
	, IFNULL( DATE_FORMAT( T.fechaIngreso, '%Y-%m-%d') ,'') AS fechaIngreso
	, IFNULL( DATE_FORMAT( T.fechaPrometida, '%Y-%m-%d') ,'') AS fechaPrometida
	, IFNULL( DATE_FORMAT( T.fechaEntrega, '%Y-%m-%d %h:%i:%s %p') ,'') AS fechaEntrega
	
	, T.idCustomer
	, CONCAT( C.lastName, ' ', C.name, ' - ', C.tel, ' - ' , C.address) AS customerDesc

	, T.idSucursal
	, SS.name AS sucursalDesc
	
	, T.idSeller_idUser
	, CONCAT( '#', U.idUser, ' - ' , U.name) AS sellerDesc
	
    , T.`active`
	, T.idTallerStatus
    , IFNULL( T.manoObraPrecio ,0) AS manoObraPrecio
	
	, ROUND( IFNULL( AAA.pagado ,0) ,2) AS pagado
	, ROUND( IFNULL( T.precioTotal ,0) - IFNULL( AAA.pagado ,0) ,2) AS pendingAmount
	
	, ROUND( IFNULL( T.precioTotal ,0) ,2) AS saleTotal
    
	FROM taller AS T
	INNER JOIN sucursales AS SS ON T.idSucursal = SS.idSucursal
	INNER JOIN users AS U ON T.idSeller_idUser = U.idUser
	INNER JOIN customers AS C ON T.idCustomer = C.idCustomer
	LEFT JOIN
	(
		SELECT
		idRelation
		,ROUND( SUM( PP.pago ) ,2) AS pagado
		FROM payments AS PP
		WHERE PP.relationType IN('V','A')
		AND PP.idRelation = p_idSale
		AND PP.active = 1
		GROUP BY PP.idRelation
	) AS AAA ON AAA.idRelation = T.idSale
	WHERE
		T.idSale = p_idSale
	;

END$$

DELIMITER ;

DROP PROCEDURE IF EXISTS `getTallerPaginado`;

DELIMITER $$

CREATE PROCEDURE `getTallerPaginado`(
IN p_createDateStart VARCHAR(500)
, IN p_createDateEnd VARCHAR(500)
, IN p_idCustomer BIGINT
, IN p_idSale VARCHAR(100)

, IN p_bCancel SMALLINT
, IN p_bPending SMALLINT
, IN p_bPagada SMALLINT

, IN p_start INT
, IN p_limiter INT

, IN p_idSucursal INT
, IN p_idUserLogOn BIGINT
)
BEGIN
	SET @iRows = 0;
	
    DROP TEMPORARY TABLE IF EXISTS salesListSec;
	CREATE TEMPORARY TABLE salesListSec (
		id BIGINT AUTO_INCREMENT,
		idTaller BIGINT,
		idSale VARCHAR(100),
		total FLOAT,
		abonado FLOAT,
		PRIMARY KEY(id)
	) ENGINE=InnoDB;
	
	INSERT INTO salesListSec( idTaller, idSale, total, abonado )
	SELECT
	T.idTaller
	, T.idSale
	, ROUND( IFNULL( T.precioTotal ,0) ,2)
	, ROUND( IFNULL( AAA.abonado ,0) ,2)
	FROM taller AS T
	INNER JOIN sucursalesconfig AS SC ON T.idSucursal = SC.idSucursal
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
	) AS AAA ON AAA.idRelation = T.idSale
	WHERE
	SC.idUser = p_idUserLogOn
	AND
	(
		(
			p_bCancel = 1
			AND T.active = 0
		)
		OR
		(
			p_bCancel = 0
			AND T.active = 1
		)
	)
	AND
	(
		p_idSale = ''
		OR T.idSale LIKE CONCAT('%', p_idSale ,'%')
	)
	AND
	(
		p_createDateStart = ''
		OR CAST( T.createDate AS DATE ) BETWEEN CAST( p_createDateStart AS DATE ) AND CAST( p_createDateEnd AS DATE )
	)
	AND
	(
		p_idCustomer = 0
		OR T.idCustomer = p_idCustomer
	)
	AND
	(
		p_bPending = 0
		OR ( ROUND( IFNULL( T.precioTotal ,0) ,2) - IFNULL( AAA.abonado ,0) ) > 0
	)
	AND
	(
		p_bPagada = 0
		OR ( ROUND( IFNULL( T.precioTotal ,0) ,2) - IFNULL( AAA.abonado ,0) ) = 0
	)
	;
    
    SET @iRows = ( SELECT COUNT(*) FROM salesListSec );
    
    SELECT
	@iRows AS iRows
	, T.idTaller
	, T.idSale
	, T.createDate
	, DATE_FORMAT( T.createDate, '%d-%m-%Y') AS createDateDate
	, DATE_FORMAT( T.createDate, '%h:%i:%s %p') AS createDateHours
	, IFNULL( T.descripcion ,'') AS descripcion
	, IFNULL( T.fechaIngreso ,'') AS fechaIngreso
	, IFNULL( T.fechaPrometida ,'') AS fechaPrometida
	, IFNULL( T.fechaEntrega ,'') AS fechaEntrega
	
	, T.idCustomer
	, CONCAT( C.lastName, ' ', C.name, ' - ', C.tel, ' - ' , C.address) AS customerDesc

	, T.idSucursal
	, SS.name AS sucursalDesc
	
	, T.idSeller_idUser
	, CONCAT( '#', U.idUser, ' - ' , U.name) AS sellerDesc
	
    , T.`active`
	, T.idTallerStatus
	
	, ROUND( IFNULL( T.precioTotal ,0) ,2) AS total
	, ROUND( IFNULL( temp.abonado ,0) ,2) AS abonado
	, ROUND( IFNULL( T.precioTotal ,0) - IFNULL( temp.abonado ,0) ,2) AS pendingAmount
	
	,IFNULL(
	(
		SELECT
		ROUND( SUM( PP.pago ) ,2)
		FROM payments AS PP
		INNER JOIN corte_caja_ingresos AS CCI ON PP.idPayment = CCI.idPayment
		WHERE
			PP.active = 1
			AND PP.relationType IN('V','A')
			AND PP.idRelation = T.idSale
            AND PP.idFormaPago <> 5
		GROUP BY PP.idRelation
	)
	,0) AS pagosYaEnCorte

	, T.active
    
    , T.idTallerStatus
    , TSC.nombre AS statusName
	
	FROM taller AS T
    INNER JOIN taller_status_cat AS TSC ON T.idTallerStatus = TSC.idTallerStatus
	INNER JOIN sucursales AS SS ON T.idSucursal = SS.idSucursal
	INNER JOIN salesListSec AS temp ON T.idSale = temp.idSale
	INNER JOIN users AS U ON T.idSeller_idUser = U.idUser
	INNER JOIN customers AS C ON T.idCustomer = C.idCustomer
    ORDER BY T.idTaller DESC
	LIMIT p_start, p_limiter;

END$$

DELIMITER ;

DROP PROCEDURE IF EXISTS `getTallerRefaccciones`;

DELIMITER $$

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

DELIMITER ;

DROP PROCEDURE IF EXISTS `getTallerServiciosExternos`;

DELIMITER $$

CREATE PROCEDURE `getTallerServiciosExternos`(
IN p_idTaller BIGINT
)
BEGIN

    SELECT 
        TSE.idServicioExternoDetalle,
        TSE.createDate,
        TSE.idTaller,
        TSE.idSale,
        TSE.idServicioExterno,
		CSE.name AS servicioExtName,
        TSE.cantidad,
        TSE.costo,
        TSE.precio,
		TSE.cantidad * TSE.precio AS total
    FROM taller_servicios_externos AS TSE
	INNER JOIN cat_taller_servicios_externos AS CSE ON CSE.idServicioExterno = TSE.idServicioExterno
    WHERE idTaller = p_idTaller
	ORDER BY createDate DESC;

END$$

DELIMITER ;

DROP PROCEDURE IF EXISTS `insertUpdateTallerRefacciones`;

DELIMITER $$

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

DELIMITER ;

DROP PROCEDURE IF EXISTS `insertUpdateTallerServiciosExternos`;

DELIMITER $$

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

DELIMITER ;

DROP PROCEDURE IF EXISTS `deleteRefaccionTaller`;

DELIMITER $$

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

DELIMITER ;

DROP PROCEDURE IF EXISTS `deleteServicioExternoTaller`;

DELIMITER $$

CREATE PROCEDURE `deleteServicioExternoTaller`(
IN p_idServicioExternoDetalle BIGINT
, IN p_oGetDateNow DATETIME
, IN p_idUserLogOn BIGINT
)
BEGIN

	DECLARE v_out_id BIGINT DEFAULT 0;
	DECLARE v_message VARCHAR(1000) DEFAULT 0;

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
		'DELETE' AS tipoLog,
		p_oGetDateNow,
		p_idUserLogOn
    FROM taller_servicios_externos
    WHERE idServicioExternoDetalle = p_idServicioExternoDetalle;

    DELETE FROM taller_servicios_externos
    WHERE idServicioExternoDetalle = p_idServicioExternoDetalle;

	SET v_out_id = 1;
	SET v_message = 'Servicio Externo eliminado con éxito';
	
	SELECT v_out_id AS out_id, v_message AS message;

END$$

DELIMITER ;

DROP PROCEDURE IF EXISTS `editSobreTaller`;

DELIMITER $$

CREATE PROCEDURE `editSobreTaller`(
IN p_oGetDateNow DATETIME
, IN p_idSale VARCHAR(100)
, IN p_importe FLOAT
, IN p_descriptionTaller VARCHAR(5000)
, IN p_idStatusSobre INT
, IN p_fechaEntrega VARCHAR(100)

, IN auth_idUser BIGINT

, IN p_idUserC BIGINT
, IN p_idSucursal INT
)
BEGIN

	SET @idStatusSobreBefore = 0;
	
	SELECT
	idStatusSobre INTO @idStatusSobreBefore
	FROM sobre_taller_status
	WHERE
		idSucursal = p_idSucursal
		AND idSale = p_idSale;

	UPDATE
		sobre_taller_status
	SET
		updateDate = p_oGetDateNow
		, idStatusSobre = p_idStatusSobre
		, idUser = auth_idUser
        , fechaEntrega = ( CASE WHEN p_fechaEntrega = '0' THEN fechaEntrega ELSE p_fechaEntrega END )
	WHERE
		idSucursal = p_idSucursal
		AND idSale = p_idSale;
		
	SET @statusSobreBeforeDesc = '';
	
	SET @statusSobreBeforeDesc = IFNULL(
	(
		SELECT
		nombre
		FROM sobre_status_cat
		WHERE
			active = 1
			AND idStatusSobre = @idStatusSobreBefore
		LIMIT 1
	)
	,0);
	
	SET @StatusSobreDesc = '';
	
	SET @StatusSobreDesc = IFNULL(
	(
		SELECT
		nombre
		FROM sobre_status_cat
		WHERE
			active = 1
			AND idStatusSobre = p_idStatusSobre
		LIMIT 1
	)
	,0);
	
	IF @statusSobreBeforeDesc <> @StatusSobreDesc THEN
		
		INSERT INTO sobre_taller_status_log
		(
			idSucursal
			, createDate
			, idSale
			, idStatusSobre
			, comments
			, idUser
		)
		SELECT
		p_idSucursal
		, p_oGetDateNow
		, p_idSale
		, p_idStatusSobre
		, CONCAT( 'Se cambia el status del sobre de: ', @statusSobreBeforeDesc, ' a: ', @StatusSobreDesc )
		, auth_idUser;
	
	END IF;
	
	INSERT INTO autorizaciones2(
	idSucursal
	, createDate
	, idRelation
	, idRelation2
	, relationType
	, idUser
	, bAutorice
    , description
	, active
	)
	SELECT
	p_idSucursal
	,p_oGetDateNow
	,p_idSale
	,''
	,'Sales'
	,auth_idUser
	,1
    ,CONCAT( 'SE AUTORIZA la actualización del sobre #', p_idSale )
	,1;
	
	
	UPDATE
		salesdetail
	SET
		descriptionTaller = p_descriptionTaller
		, cost = p_importe
		, precioUnitario = p_importe
		, precio = p_importe
		, importe = p_importe
	WHERE
		idSale = p_idSale;

	SELECT 1 AS bOK;

END$$

DELIMITER ;
