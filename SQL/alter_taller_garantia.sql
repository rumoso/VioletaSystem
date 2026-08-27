-- ============================================================
-- COLUMNA `taller.idTallerOrigen` (analisis/016-garantias-taller.md)
--
-- Guarda el FOLIO del taller entregado del que nace una garantía.
-- NULL = no es garantía, es un taller normal.
--
-- Es UN SOLO campo a propósito: no se agrega además un `bGarantia`,
-- porque dos campos que dicen lo mismo terminan desincronizándose y
-- uno solo no puede. "Es garantía" = `idTallerOrigen IS NOT NULL`.
--
-- Guarda el folio (VARCHAR) y no el `idTaller` (BIGINT), por
-- consistencia con `taller.idCotizacion`, que también guarda folio —
-- y porque es lo que hay que pintar en pantalla sin un JOIN extra.
--
-- Mismo comportamiento que `idCotizacion`: se escribe una vez al crear
-- y NUNCA se actualiza después, aunque el folio de la garantía cambie
-- de estatus. Es una referencia histórica, no un vínculo vivo.
--
-- Como el folio de la garantía NO lleva el taller de origen dentro
-- (ver insert_sales_type_garantia.sql), esta columna es la única
-- fuente de la relación — de ahí el índice, que la consulta
-- "¿qué garantías tiene este taller?" se va a hacer seguido.
--
-- Idempotente (patrón INFORMATION_SCHEMA + PREPARE/EXECUTE ya usado en
-- alter_nomina_recibos_pago.sql y alter_comisiones_track_auditoria.sql).
-- ============================================================

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller' AND COLUMN_NAME = 'idTallerOrigen'
);
SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `taller` ADD COLUMN `idTallerOrigen` VARCHAR(100) NULL COMMENT ''folio del taller entregado del que nace esta garantia - NULL si es un taller normal'' AFTER `idCotizacion`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller' AND INDEX_NAME = 'idx_taller_origen'
);
SET @sql_alter = IF(@idx_exists = 0,
  'ALTER TABLE `taller` ADD INDEX `idx_taller_origen` (`idTallerOrigen`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- ROLLBACK (correr a mano solo si hiciera falta revertir):
--
--   ALTER TABLE `taller` DROP INDEX `idx_taller_origen`;
--   ALTER TABLE `taller` DROP COLUMN `idTallerOrigen`;
-- ============================================================
