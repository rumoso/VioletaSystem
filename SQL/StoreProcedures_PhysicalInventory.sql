-- ============================================================
-- STORED PROCEDURES - INVENTARIO FÍSICO
-- ============================================================

DROP PROCEDURE IF EXISTS `deletePhysicalInventory`;

DELIMITER $$

CREATE PROCEDURE deletePhysicalInventory (
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

DELIMITER ;

-- ============================================================
-- Auditoría: última fecha de inventario físico por grupo/familia
-- p_sOption: 'G' = grupos, 'F' = familias
-- bConInventario = 1 si hay inventario desde p_startDate en adelante
-- (uno más reciente que p_endDate cuenta como cubierto; p_endDate
-- solo es informativo del preset elegido)
-- ============================================================

DROP PROCEDURE IF EXISTS `getAuditPhysicalInventory`;

DELIMITER $$

CREATE PROCEDURE getAuditPhysicalInventory (
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

DELIMITER ;

-- ============================================================
-- getPhysicalInventoryListWithPage — nunca había estado versionada
-- (capturada de la BD en vivo vía SHOW CREATE PROCEDURE). Se agregan
-- gruposDesc/familiasDesc: todos los grupos/familias de los productos
-- contados en cada inventario físico, separados por coma. El resto
-- del procedimiento queda idéntico al original.
-- ============================================================

DROP PROCEDURE IF EXISTS `getPhysicalInventoryListWithPage`;

DELIMITER $$

CREATE PROCEDURE getPhysicalInventoryListWithPage(
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

DELIMITER ;
