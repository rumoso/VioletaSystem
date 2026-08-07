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
