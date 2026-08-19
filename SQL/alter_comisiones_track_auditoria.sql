-- ============================================================
-- Trazabilidad del calculo en `comisiones_track` (analisis/008 y 010).
--
-- Hasta ahora el COMO se llego al monto vivia solo dentro del texto
-- libre de `referencia` ("Utilidad $15473.00 x 10%", "autorizo idUser 3").
-- Eso se lee bien pero no se consulta: no habia forma de responder
-- "que autorizo Ruben este mes" o "que comisiones se calcularon al 10%"
-- sin hacer LIKE sobre texto. Estas columnas lo vuelven dato:
--
--   auth_idUser        -- quien autorizo (solo captura manual)
--   porcentajeAplicado -- el % que se aplico
--   montoBase          -- la cantidad sobre la que se aplico ese %
--
-- Quedan NULL a proposito cuando no aplican:
--   - MANUAL: no hay % ni base, el monto se captura directo.
--   - VENTA generada por `generarComisionesVenta` (ruta vieja): esa no
--     aplica un %, calcula la comision directo de pagos contra costo.
--
-- Idempotente (patron INFORMATION_SCHEMA). Requiere MySQL 8 por
-- REGEXP_SUBSTR en el backfill.
-- ============================================================

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comisiones_track' AND COLUMN_NAME = 'auth_idUser'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `comisiones_track` ADD COLUMN `auth_idUser` BIGINT NULL COMMENT ''quien autorizo la captura manual (codigo/rostro)'' AFTER `referencia`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comisiones_track' AND COLUMN_NAME = 'porcentajeAplicado'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `comisiones_track` ADD COLUMN `porcentajeAplicado` DECIMAL(5,2) NULL COMMENT ''porcentaje aplicado - NULL cuando el tipo no usa porcentaje'' AFTER `referencia`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comisiones_track' AND COLUMN_NAME = 'montoBase'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `comisiones_track` ADD COLUMN `montoBase` DECIMAL(12,2) NULL COMMENT ''cantidad sobre la que se aplico el %: utilidad en VENTA, mano de obra en DESTAJO'' AFTER `referencia`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comisiones_track' AND INDEX_NAME = 'idx_auth_user'
);
SET @sql_alter = IF(@idx_exists = 0,
  'ALTER TABLE `comisiones_track` ADD INDEX `idx_auth_user` (`auth_idUser`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- BACKFILL: los renglones que ya existen guardaron esta informacion
-- dentro de `referencia`. Se rescata de ahi para que el historico
-- tambien sea consultable, no solo lo nuevo.
-- Todos los UPDATE filtran por "la columna sigue NULL", asi que
-- re-ejecutar el script no pisa datos posteriores.
-- ============================================================

-- 1) Autorizador de las capturas manuales: "... autorizo idUser 3"
UPDATE `comisiones_track`
SET auth_idUser = CAST(REPLACE(REGEXP_SUBSTR(referencia, 'idUser [0-9]+'), 'idUser ', '') AS UNSIGNED)
WHERE auth_idUser IS NULL
  AND referencia REGEXP 'idUser [0-9]+';

-- 2) Reescribe esa referencia al formato legible con nombre y usuario,
--    igual que lo que ya guardan las capturas nuevas.
UPDATE `comisiones_track` AS CT
INNER JOIN `users` AS U ON U.idUser = CT.auth_idUser
SET CT.referencia = CONCAT(
      'Captura manual — autorizó: ', U.name,
      IF(U.userName IS NULL OR U.userName = '', '', CONCAT(' (', U.userName, ')'))
    )
WHERE CT.referencia LIKE '%idUser %';

-- 3) % y base de los renglones calculados: "Utilidad $15473.00 x 10%"
--    y "Mano de obra $1200.00 x 15%". Se toma el primer numero despues
--    del $ como base y el numero pegado al % como porcentaje.
UPDATE `comisiones_track`
SET montoBase = CAST(REPLACE(REGEXP_SUBSTR(referencia, '\\$[0-9]+([.][0-9]+)?'), '$', '') AS DECIMAL(12,2)),
    porcentajeAplicado = CAST(REPLACE(REGEXP_SUBSTR(referencia, '[0-9]+([.][0-9]+)? ?%'), '%', '') AS DECIMAL(5,2))
WHERE montoBase IS NULL
  AND porcentajeAplicado IS NULL
  AND referencia REGEXP '\\$[0-9]'
  AND referencia REGEXP '[0-9] ?%';
