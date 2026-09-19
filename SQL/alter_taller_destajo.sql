-- ══════════════════════════════════════════════════════════════
-- DESTAJO DEL FOLIO A LA MANO (analisis/027-panel-con-utilidad-guardada.md)
--
-- `taller.utilidad` ya viene neta del destajo del tecnico, pero cuanto
-- se le resto no estaba guardado. Esta columna lo deja en el folio para
-- que el panel pueda desglosar bruta / comisiones / neta sin recalcular:
--
--   taller.destajoMonto — lo que se le resto por destajo
--
-- Mientras el folio no pague destajo es el ESTIMADO con el % de cada
-- tecnico; en cuanto se paga, queda con lo real (el % ya congelado en
-- `taller_mano_obra.porcentajeDestajo`).
--
-- Idempotente. Correr DESPUES de `alter_taller_utilidad.sql`.
-- ══════════════════════════════════════════════════════════════

SET @sql = IF(
    ( SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller' AND COLUMN_NAME = 'destajoMonto' ) = 0,
    'ALTER TABLE taller ADD COLUMN destajoMonto DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER utilidadCobrada',
    'SELECT ''taller.destajoMonto ya existe'''
);
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── Backfill ─────────────────────────────────────────────────
--
-- Mismo criterio del helper: por cada renglon de mano de obra, el % del
-- renglon si ya se pago el destajo, o el vigente del tecnico si no.
-- Garantias y cancelados en 0, igual que su utilidad.

UPDATE taller AS T
SET T.destajoMonto = IF(
        T.idTallerOrigen IS NOT NULL OR T.idTallerStatus = 7,
        0,
        ROUND(
            IFNULL((
                SELECT SUM( ROUND( TMO.precio * IFNULL( TMO.porcentajeDestajo, IFNULL( U.destajo, 0) ) / 100, 2) )
                FROM taller_mano_obra AS TMO
                LEFT JOIN users AS U ON U.idUser = TMO.idUserTecnico
                WHERE TMO.idTaller = T.idTaller
            ), 0)
        , 2)
    )
WHERE T.idTaller > 0;

SELECT
  COUNT(*)                            AS folios
, SUM( destajoMonto <> 0 )            AS conDestajo
, ROUND( SUM( destajoMonto ), 2)      AS destajoTotal
, ROUND( SUM( utilidad ), 2)          AS utilidadNeta
, ROUND( SUM( utilidad + destajoMonto ), 2) AS utilidadBruta
FROM taller;
