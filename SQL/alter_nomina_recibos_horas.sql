-- ============================================================
-- Columnas informativas de horas en `nomina_recibos`
-- (analisis/011-timecard.md). Se llenan al generar la nomina desde
-- timecard_jornadas y quedan CONGELADAS ahi (copia congelada, mismo
-- criterio que el resto del recibo) — el sistema solo reporta, nunca
-- calcula el dinero: el monto de "Horas extra" o "Descuento por
-- falta/retardo" lo sigue capturando quien hace la nomina como
-- cualquier otro concepto. Idempotente.
-- ============================================================

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nomina_recibos' AND COLUMN_NAME = 'horasTrabajadas'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `nomina_recibos` ADD COLUMN `horasTrabajadas` DECIMAL(7,2) NOT NULL DEFAULT 0 AFTER `neto`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nomina_recibos' AND COLUMN_NAME = 'horasEsperadas'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `nomina_recibos` ADD COLUMN `horasEsperadas` DECIMAL(7,2) NOT NULL DEFAULT 0 AFTER `horasTrabajadas`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nomina_recibos' AND COLUMN_NAME = 'iRetardos'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `nomina_recibos` ADD COLUMN `iRetardos` INT NOT NULL DEFAULT 0 AFTER `horasEsperadas`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nomina_recibos' AND COLUMN_NAME = 'iFaltas'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `nomina_recibos` ADD COLUMN `iFaltas` INT NOT NULL DEFAULT 0 AFTER `iRetardos`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
