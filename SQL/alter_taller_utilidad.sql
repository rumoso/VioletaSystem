-- ══════════════════════════════════════════════════════════════
-- UTILIDAD DEL TALLER (analisis/023-utilidad-de-taller.md)
--
-- Deja la utilidad guardada en el folio para no recalcularla en cada
-- consulta:
--   taller.utilidad         — la que se forma al capturar el folio
--   taller.utilidadCobrada  — la parte de esa utilidad que ya se cobró
--   taller_mano_obra.porcentajeDestajo — el % con el que se le pagó el
--       destajo a ese técnico; NULL mientras no se le haya pagado
--
-- Idempotente: se puede correr varias veces.
-- Al final rellena los folios que ya existen.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Columnas ───────────────────────────────────────────────

SET @sql = IF(
    ( SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller' AND COLUMN_NAME = 'utilidad' ) = 0,
    'ALTER TABLE taller ADD COLUMN utilidad DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER precioTotal',
    'SELECT ''taller.utilidad ya existe'''
);
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = IF(
    ( SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller' AND COLUMN_NAME = 'utilidadCobrada' ) = 0,
    'ALTER TABLE taller ADD COLUMN utilidadCobrada DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER utilidad',
    'SELECT ''taller.utilidadCobrada ya existe'''
);
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = IF(
    ( SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller_mano_obra' AND COLUMN_NAME = 'porcentajeDestajo' ) = 0,
    'ALTER TABLE taller_mano_obra ADD COLUMN porcentajeDestajo DECIMAL(5,2) NULL AFTER precio',
    'SELECT ''taller_mano_obra.porcentajeDestajo ya existe'''
);
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 2. Congelar el % de los destajos que YA se generaron ──────
--
-- Los renglones de mano de obra de un folio que ya pagó destajo se
-- quedan con el % que quedó registrado en la comisión.

UPDATE taller_mano_obra AS TMO
INNER JOIN comisiones_track AS CT
        ON CT.idTaller = TMO.idTaller
       AND CT.idUser   = TMO.idUserTecnico
       AND CT.tipo     = 'DESTAJO'
       AND CT.estatus <> 'CANCELADA'
SET TMO.porcentajeDestajo = CT.porcentajeAplicado
WHERE TMO.porcentajeDestajo IS NULL
  AND CT.porcentajeAplicado IS NOT NULL;

-- ── 3. Backfill de la utilidad de los folios que ya existen ───
--
-- Mismo criterio del helper `fn_recalcularUtilidadTaller`:
--   mano de obra − destajo + (precio − costo) de refacciones
--   + (valor − costo) del metal de la empresa.
-- Servicios externos, metal del cliente y metal final NO entran.
-- Garantías (idTallerOrigen) y cancelados (estatus 7) quedan en 0.

UPDATE taller AS T
SET T.utilidad = IF(
        T.idTallerOrigen IS NOT NULL OR T.idTallerStatus = 7,
        0,
        ROUND(
            IFNULL((
                SELECT SUM( TMO.precio - ROUND( TMO.precio * IFNULL( TMO.porcentajeDestajo, IFNULL( U.destajo, 0) ) / 100, 2) )
                FROM taller_mano_obra AS TMO
                LEFT JOIN users AS U ON U.idUser = TMO.idUserTecnico
                WHERE TMO.idTaller = T.idTaller
            ), IFNULL( T.manoObraPrecio, 0))
            + IFNULL((
                SELECT SUM( ( R.precio - R.costo ) * R.cantidad )
                FROM taller_refacciones AS R
                WHERE R.idTaller = T.idTaller
            ), 0)
            + IFNULL((
                SELECT SUM( MA.valorMetal - MA.costoMetal )
                FROM taller_metal_agranel AS MA
                WHERE MA.idTaller = T.idTaller
            ), 0)
        , 2)
    )
WHERE T.idTaller > 0;

UPDATE taller AS T
SET T.utilidadCobrada = IF(
        IFNULL( T.precioTotal, 0) <= 0 OR T.utilidad = 0,
        0,
        ROUND(
            T.utilidad * LEAST(
                IFNULL((
                    SELECT SUM( P.pago )
                    FROM payments AS P
                    WHERE P.idRelation = T.idSale AND P.relationType = 'V' AND P.active = 1
                ), 0) / T.precioTotal
            , 1)
        , 2)
    )
WHERE T.idTaller > 0;

SELECT
  COUNT(*)                                        AS folios
, SUM( utilidad <> 0 )                            AS conUtilidad
, ROUND( SUM( utilidad ), 2)                      AS utilidadTotal
, ROUND( SUM( utilidadCobrada ), 2)               AS utilidadCobradaTotal
FROM taller;
