-- ============================================================
-- REPORTE: talleres cancelados con reversas pendientes
-- (analisis/022-eliminar-o-cancelar-taller.md)
--
-- Solo consulta, no modifica nada. Sirve para revisar a mano los
-- talleres que se cancelaron ANTES de que la cancelación reversara el
-- metal y el destajo (el backfill de alter_taller_cancelacion.sql los
-- pasó a estatus 7 sin reversar nada).
--
-- Metal: neto por par origen/destino/producto en metal_inventario_track
-- (un movimiento en sentido inverso resta). Mismo cálculo que usa la
-- cancelación (_fn_reversarMetalTaller); tras cancelar, el neto es 0.
--
-- Destajo: renglones DESTAJO del taller que no están CANCELADA y cuyo
-- monto positivo no tiene todavía su renglón negativo de reversa.
-- ============================================================

SELECT
    T.idTaller
    , T.idSale
    , DATE_FORMAT(T.cancelDate, '%d-%m-%Y') AS cancelDate
    , IFNULL(M.iParesConSaldo, 0)           AS paresMetalConSaldo
    , IFNULL(M.gramosPendientes, 0)         AS gramosPendientes
    , IFNULL(D.iDestajoSinReversa, 0)       AS destajoSinReversa
    , IFNULL(D.montoDestajo, 0)             AS montoDestajo
FROM taller AS T
LEFT JOIN (
    SELECT idTaller, COUNT(*) AS iParesConSaldo, ROUND(SUM(ABS(neto)), 2) AS gramosPendientes
    FROM (
        SELECT
            idTaller
            , ROUND(SUM(
                CASE WHEN CONCAT(tipoOrigen, ':', idOrigen) < CONCAT(tipoDestino, ':', idDestino)
                     THEN gramos ELSE -gramos END
              ), 2) AS neto
        FROM metal_inventario_track
        WHERE idTaller IS NOT NULL
        GROUP BY
            idTaller
            , idProduct
            , LEAST(CONCAT(tipoOrigen, ':', idOrigen), CONCAT(tipoDestino, ':', idDestino))
            , GREATEST(CONCAT(tipoOrigen, ':', idOrigen), CONCAT(tipoDestino, ':', idDestino))
    ) AS P
    WHERE neto <> 0
    GROUP BY idTaller
) AS M ON M.idTaller = T.idTaller
LEFT JOIN (
    SELECT CT.idTaller, COUNT(*) AS iDestajoSinReversa, ROUND(SUM(CT.monto), 2) AS montoDestajo
    FROM comisiones_track AS CT
    WHERE CT.tipo = 'DESTAJO'
      AND CT.estatus <> 'CANCELADA'
      AND CT.monto > 0
      AND NOT EXISTS (
          SELECT 1 FROM comisiones_track AS R
          WHERE R.idComisionTrackOrigen = CT.idComisionTrack
      )
    GROUP BY CT.idTaller
) AS D ON D.idTaller = T.idTaller
WHERE T.idTallerStatus = 7
  AND ( M.idTaller IS NOT NULL OR D.idTaller IS NOT NULL )
ORDER BY T.idTaller;
