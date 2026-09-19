-- ══════════════════════════════════════════════════════════════
-- UTILIDAD DE LA VENTA (analisis/026-utilidad-de-venta.md)
--
-- Lo mismo que ya hace el taller (analisis/023), ahora en mostrador:
--   sales.utilidad        — venta - costo - comision del vendedor
--   sales.utilidadCobrada — la parte de esa utilidad ya cobrada
--
-- Solo contado (2), credito (1) y apartado (3). Cotizacion,
-- consignacion, taller, rapidas y garantias quedan en 0 (taller lleva la
-- suya en su propia tabla).
--
-- Idempotente. Al final rellena las ventas que ya existen.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Columnas ───────────────────────────────────────────────

SET @sql = IF(
    ( SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'utilidad' ) = 0,
    'ALTER TABLE sales ADD COLUMN utilidad DECIMAL(12,2) NOT NULL DEFAULT 0',
    'SELECT ''sales.utilidad ya existe'''
);
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = IF(
    ( SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'utilidadCobrada' ) = 0,
    'ALTER TABLE sales ADD COLUMN utilidadCobrada DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER utilidad',
    'SELECT ''sales.utilidadCobrada ya existe'''
);
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 2. Backfill ───────────────────────────────────────────────
--
-- Mismo criterio del helper `fn_recalcularUtilidadVenta`:
--   utilidad bruta = SUM(importe) - SUM(cost * cantidad) de los
--   renglones activos; menos la comision REAL si ya se genero, o la
--   estimada con el % vigente del vendedor si todavia no.

UPDATE sales AS S
SET S.utilidad = IF(
        S.active = 0 OR S.idSaleType NOT IN (1, 2, 3),
        0,
        ROUND(
            (
                IFNULL(( SELECT SUM( SD.importe )            FROM salesdetail AS SD WHERE SD.idSale = S.idSale AND SD.active = 1 ), 0)
              - IFNULL(( SELECT SUM( SD.cost * SD.cantidad ) FROM salesdetail AS SD WHERE SD.idSale = S.idSale AND SD.active = 1 ), 0)
            )
            - IFNULL(
                (
                    SELECT SUM( CT.monto ) FROM comisiones_track AS CT
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
        , 2)
    )
WHERE S.keyx > 0;

UPDATE sales AS S
SET S.utilidadCobrada = IF(
        S.utilidad = 0,
        0,
        ROUND(
            S.utilidad * LEAST(
                IFNULL(( SELECT SUM( P.pago ) FROM payments AS P
                         WHERE P.idRelation = S.idSale AND P.relationType = 'V' AND P.active = 1 ), 0)
                / NULLIF( IFNULL(( SELECT SUM( SD.importe ) FROM salesdetail AS SD
                                   WHERE SD.idSale = S.idSale AND SD.active = 1 ), 0), 0)
            , 1)
        , 2)
    )
WHERE S.keyx > 0;

UPDATE sales SET utilidadCobrada = 0 WHERE utilidadCobrada IS NULL;

SELECT
  COUNT(*)                                  AS ventas
, SUM( utilidad <> 0 )                      AS conUtilidad
, ROUND( SUM( utilidad ), 2)                AS utilidadTotal
, ROUND( SUM( utilidadCobrada ), 2)         AS utilidadCobradaTotal
FROM sales;
