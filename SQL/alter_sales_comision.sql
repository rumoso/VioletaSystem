-- ══════════════════════════════════════════════════════════════
-- COMISION DE LA VENTA A LA MANO (analisis/026-utilidad-de-venta.md)
--
-- La utilidad de la venta ya viene neta de comision, pero el % y el
-- monto vivian solo en `comisiones_track`. Estas dos columnas los dejan
-- en la propia venta, para reportes sin cruzar tablas:
--
--   sales.comisionMonto     — lo que se le resto a la utilidad
--   sales.comisionPorcentaje— el % con el que se calculo
--
-- Mientras la venta no genere su comision, los dos son el ESTIMADO con
-- el % vigente del vendedor. En cuanto se genera, quedan con lo real y
-- ya no se mueven aunque despues le cambien el % al vendedor.
--
-- Idempotente. Correr DESPUES de `alter_sales_utilidad.sql`.
-- ══════════════════════════════════════════════════════════════

SET @sql = IF(
    ( SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'comisionMonto' ) = 0,
    'ALTER TABLE sales ADD COLUMN comisionMonto DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER utilidadCobrada',
    'SELECT ''sales.comisionMonto ya existe'''
);
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = IF(
    ( SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'comisionPorcentaje' ) = 0,
    'ALTER TABLE sales ADD COLUMN comisionPorcentaje DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER comisionMonto',
    'SELECT ''sales.comisionPorcentaje ya existe'''
);
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── Backfill ─────────────────────────────────────────────────

UPDATE sales AS S
SET S.comisionMonto = IF(
        S.active = 0 OR S.idSaleType NOT IN (1, 2, 3),
        0,
        IFNULL(
            (
                SELECT ROUND( SUM( CT.monto ), 2) FROM comisiones_track AS CT
                WHERE CT.idSale = S.idSale AND CT.tipo = 'VENTA' AND CT.estatus <> 'CANCELADA'
            )
            ,
            GREATEST(
                ROUND(
                    (
                        IFNULL(( SELECT SUM( SD.importe )            FROM salesdetail AS SD WHERE SD.idSale = S.idSale AND SD.active = 1 ), 0)
                      - IFNULL(( SELECT SUM( SD.cost * SD.cantidad ) FROM salesdetail AS SD WHERE SD.idSale = S.idSale AND SD.active = 1 ), 0)
                    )
                    * IFNULL(
                        (
                            SELECT U.comision FROM users AS U
                            WHERE U.idUser = S.idSeller_idUser AND U.active = 1
                              AND EXISTS (
                                  SELECT 1 FROM rolesconfig AS RC
                                  INNER JOIN roles AS R ON R.idRol = RC.idRol
                                  WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = 1
                              )
                            LIMIT 1
                        )
                    , 0) / 100
                , 2)
            , 0)
        )
    )
WHERE S.keyx > 0;

UPDATE sales AS S
SET S.comisionPorcentaje = IF(
        S.active = 0 OR S.idSaleType NOT IN (1, 2, 3),
        0,
        IFNULL(
            (
                SELECT CT.porcentajeAplicado FROM comisiones_track AS CT
                WHERE CT.idSale = S.idSale AND CT.tipo = 'VENTA' AND CT.estatus <> 'CANCELADA'
                  AND CT.porcentajeAplicado IS NOT NULL
                ORDER BY CT.idComisionTrack LIMIT 1
            )
            ,
            IFNULL(
                (
                    SELECT U.comision FROM users AS U
                    WHERE U.idUser = S.idSeller_idUser AND U.active = 1
                      AND EXISTS (
                          SELECT 1 FROM rolesconfig AS RC
                          INNER JOIN roles AS R ON R.idRol = RC.idRol
                          WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = 1
                      )
                    LIMIT 1
                )
            , 0)
        )
    )
WHERE S.keyx > 0;

SELECT
  COUNT(*)                                   AS ventas
, SUM( comisionMonto <> 0 )                  AS conComision
, ROUND( SUM( comisionMonto ), 2)            AS comisionTotal
FROM sales;
