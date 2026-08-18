-- ============================================================
-- Estado de pago a nivel de RECIBO (analisis/013-pago-por-empleado.md).
--
-- Hasta 007 el pago vivia solo en `nomina`: pagar era todo o nada. Aqui
-- cada `nomina_recibos` gana su propio estatus para poder pagarle a un
-- empleado sin pagarle a los demas. A partir de este cambio el estatus
-- de la CORRIDA deja de ser fuente de verdad y pasa a deducirse de sus
-- recibos (ver _fn_recalcularEstatusNomina en nominaController.js).
--
-- Idempotente (patron INFORMATION_SCHEMA, igual que
-- alter_nomina_recibos_horas.sql / alter_sales_entrega.sql).
-- ============================================================

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nomina_recibos' AND COLUMN_NAME = 'estatus'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `nomina_recibos` ADD COLUMN `estatus` VARCHAR(20) NOT NULL DEFAULT ''BORRADOR'' COMMENT ''BORRADOR | PAGADA | CANCELADA'' AFTER `bSinListadoBase`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nomina_recibos' AND COLUMN_NAME = 'pagadaDate'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `nomina_recibos` ADD COLUMN `pagadaDate` DATETIME NULL AFTER `estatus`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nomina_recibos' AND COLUMN_NAME = 'idPagoUser'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `nomina_recibos` ADD COLUMN `idPagoUser` BIGINT NULL AFTER `pagadaDate`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nomina_recibos' AND COLUMN_NAME = 'canceladaDate'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `nomina_recibos` ADD COLUMN `canceladaDate` DATETIME NULL AFTER `idPagoUser`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nomina_recibos' AND COLUMN_NAME = 'idCancelUser'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `nomina_recibos` ADD COLUMN `idCancelUser` BIGINT NULL AFTER `canceladaDate`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nomina_recibos' AND COLUMN_NAME = 'motivoCancelacion'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `nomina_recibos` ADD COLUMN `motivoCancelacion` VARCHAR(500) NULL AFTER `idCancelUser`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Indice para el recalculo del estatus de la corrida, que agrupa sus
-- recibos por estatus despues de cada pago/cancelacion.
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nomina_recibos' AND INDEX_NAME = 'idx_nomina_estatus'
);
SET @sql_alter = IF(@idx_exists = 0,
  'ALTER TABLE `nomina_recibos` ADD INDEX `idx_nomina_estatus` (`idNomina`, `estatus`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- BACKFILL: los recibos que ya existen heredan el estado de su corrida.
-- Sin esto, TODO lo ya pagado apareceria como pendiente de cobro el dia
-- que se aplique el script. Se limita a los recibos que siguen en el
-- DEFAULT 'BORRADOR' para que re-ejecutar el script no pise pagos
-- individuales hechos despues (idempotencia real, no solo de esquema).
-- ============================================================
UPDATE `nomina_recibos` AS R
INNER JOIN `nomina` AS N ON N.idNomina = R.idNomina
SET R.estatus           = N.estatus,
    R.pagadaDate        = N.pagadaDate,
    R.idPagoUser        = N.idPagoUser,
    R.canceladaDate     = N.canceladaDate,
    R.idCancelUser      = N.idCancelUser,
    R.motivoCancelacion = N.motivoCancelacion
WHERE R.estatus = 'BORRADOR'
  AND N.estatus <> 'BORRADOR';
