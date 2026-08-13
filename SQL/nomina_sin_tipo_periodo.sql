-- ============================================================
-- NÓMINA: quitar tipoPeriodo, el rango de fechas pasa a ser opcional
-- (analisis/007-pago-nomina.md, addendum 2026-08-13)
-- El tipo de periodo no aportaba nada que el rango de fechas no diga
-- ya. El rango de fechas deja de ser obligatorio: solo sirve para
-- acotar qué comisiones pendientes se suman al generar — sin fechas,
-- se toman TODAS las comisiones pendientes del empleado. Idempotente.
-- ============================================================

-- Los ALTER no soportan IF EXISTS/IF NOT EXISTS en MySQL — se
-- verifica contra INFORMATION_SCHEMA.
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nomina' AND COLUMN_NAME = 'tipoPeriodo'
);

SET @sql_alter = IF(@col_exists > 0,
  'ALTER TABLE `nomina` DROP COLUMN `tipoPeriodo`',
  'SELECT 1'
);

PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- MODIFY COLUMN es idempotente por naturaleza (repetirlo no falla).
ALTER TABLE `nomina` MODIFY COLUMN `fechaInicio` DATE NULL;
ALTER TABLE `nomina` MODIFY COLUMN `fechaFin` DATE NULL;
