-- ============================================================
-- CANCELACIÓN DE TALLER (analisis/022-eliminar-o-cancelar-taller.md)
--
-- 1. Estatus 7 "Cancelado" en taller_status_cat.
-- 2. taller.cancelDate / idCancelUser (quien autorizó) /
--    motivoCancelacion.
-- 3. Backfill: los talleres cuya venta ya estaba cancelada
--    (sales.active = 0) pasan a estatus 7 y taller.active = 0. NO se
--    les aplican reversas de metal ni de destajo: eso se revisa a mano
--    con reporte_talleres_cancelados_sin_reversa.sql.
-- 4. Acción tall_DeleteVacio (eliminar un taller que solo tiene
--    encabezado).
--
-- Idempotente (patrón INFORMATION_SCHEMA + PREPARE/EXECUTE de
-- alter_taller_garantia.sql). Sin triggers.
-- ============================================================

INSERT INTO taller_status_cat (idTallerStatus, createDate, nombre, description, active)
SELECT 7, NOW(), 'Cancelado', NULL, 1
WHERE NOT EXISTS ( SELECT 1 FROM taller_status_cat WHERE idTallerStatus = 7 );

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller' AND COLUMN_NAME = 'cancelDate'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `taller` ADD COLUMN `cancelDate` DATETIME NULL COMMENT ''fecha de cancelacion del taller'' AFTER `bRapida`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller' AND COLUMN_NAME = 'idCancelUser'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `taller` ADD COLUMN `idCancelUser` BIGINT NULL COMMENT ''usuario que autorizo la cancelacion'' AFTER `cancelDate`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller' AND COLUMN_NAME = 'motivoCancelacion'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `taller` ADD COLUMN `motivoCancelacion` VARCHAR(500) NULL AFTER `idCancelUser`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill: cancelados antes de este cambio (sin fecha ni motivo).
UPDATE taller AS T
INNER JOIN sales AS S ON S.idSale = T.idSale
SET T.idTallerStatus = 7, T.active = 0
WHERE S.active = 0 AND T.idTallerStatus <> 7;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_DeleteVacio', 'Eliminar taller sin datos', 'Permite eliminar definitivamente un taller que solo tiene encabezado (sin fotos, firmas, secciones, metal, abonos ni comisiones)', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_DeleteVacio' )
LIMIT 1;

-- ============================================================
-- ROLLBACK (correr a mano solo si hiciera falta revertir):
--
--   UPDATE taller SET idTallerStatus = 1 WHERE idTallerStatus = 7;  -- revisar antes: el estatus previo no se guarda
--   ALTER TABLE `taller` DROP COLUMN `motivoCancelacion`;
--   ALTER TABLE `taller` DROP COLUMN `idCancelUser`;
--   ALTER TABLE `taller` DROP COLUMN `cancelDate`;
--   DELETE FROM taller_status_cat WHERE idTallerStatus = 7;
--   DELETE FROM actions WHERE name = 'tall_DeleteVacio';
-- ============================================================
