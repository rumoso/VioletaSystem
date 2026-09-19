-- ============================================================
-- CONSULTA DE VENTAS: LOS TALLERES VIEJOS SE QUEDAN AQUÍ
-- (analisis/025-talleres-viejos-y-nuevos.md)
--
-- Al instalar el módulo nuevo de taller en una sucursal que ya venía
-- trabajando, los folios viejos (tipo 5) NO tienen renglón en `taller`:
-- nacieron con el modelo anterior (descripción en las líneas de la nota y
-- un solo estatus de sobre), así que no se pueden mostrar en la pantalla
-- nueva sin inventarles mano de obra, refacciones y metal que nunca se
-- capturaron.
--
-- Decisión (Rubén, 2026-09-18): NO se migran. Se parten por pantalla:
--   · Consulta de ventas  → talleres VIEJOS (sin renglón en `taller`),
--     con su estatus de sobre y el atajo de edición de siempre.
--   · Pantalla de Taller  → talleres NUEVOS (con renglón en `taller`).
-- Ningún folio sale en las dos.
--
-- Antes de este script, la versión nueva del SP escondía TODOS los
-- talleres de la consulta de ventas (`S.idSaleType NOT IN (5)`), lo que
-- dejaba los folios históricos sin ninguna pantalla donde verse.
--
-- Requiere que la tabla `taller` ya exista (módulo de taller instalado).
-- Idempotente (DROP + CREATE).
-- ============================================================

DROP PROCEDURE IF EXISTS `getVentasListWithPage`;

DELIMITER $$

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
    -- los que NO tienen renglón en `taller` (analisis/025). Los folios que
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

DELIMITER ;
