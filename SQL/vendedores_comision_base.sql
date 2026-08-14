-- ============================================================
-- % de comisión base del vendedor
-- Análogo a tecnicos.destajoPorcentaje (SQL/comisiones_track.sql),
-- pero para vendedores: punto de partida para su comisión de venta.
-- La captura en la bitácora de comisiones (analisis/008) sigue siendo
-- manual — este dato es de referencia. Idempotente.
-- ============================================================

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendedores' AND COLUMN_NAME = 'comisionPorcentaje'
);

SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `vendedores` ADD COLUMN `comisionPorcentaje` DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT ''0-100, % de comision base sobre venta'' AFTER `nombre`',
  'SELECT 1'
);

PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
