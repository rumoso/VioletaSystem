-- ============================================================
-- ENTREGA DE VENTAS (apartados y taller)
-- Agrega a `sales` fechaEntrega/idUserEntrega, para registrar cuándo
-- y quién autorizó (código/rostro) la entrega de un apartado
-- (idSaleType=3) desde la consulta de ventas, o de un folio de taller
-- (idSaleType=5/7) cuando se entrega desde la pantalla de taller
-- (updateTallerStatus, idTallerStatus=5). Idempotente.
-- ============================================================

SET @col_exists_fecha = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'fechaEntrega'
);
SET @sql_alter_fecha = IF(@col_exists_fecha = 0,
  'ALTER TABLE `sales` ADD COLUMN `fechaEntrega` DATETIME NULL COMMENT ''fecha en que se entrego el apartado/venta'' AFTER `active`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter_fecha;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists_user = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'idUserEntrega'
);
SET @sql_alter_user = IF(@col_exists_user = 0,
  'ALTER TABLE `sales` ADD COLUMN `idUserEntrega` BIGINT NULL COMMENT ''quien autorizo la entrega (codigo/rostro)'' AFTER `fechaEntrega`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter_user;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
