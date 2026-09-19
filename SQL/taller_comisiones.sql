-- ══════════════════════════════════════════════════════════════
-- COMISIONES DEL TALLER (analisis/028-comisiones-del-taller.md)
--
-- Lo que genera un folio para quien lo trabaja y para quien lo vende:
--
--   taller_comisiones — un renglon por persona y tipo, con el % base y
--                       el monto. Es el desglose del folio.
--   taller.comisiones — la suma de esos renglones (antes destajoMonto).
--
-- Una cosa es lo que el folio genera (esta tabla) y otra cuando eso se
-- le carga a la persona para pagarselo en nomina (comisiones_track):
--   - al TECNICO se le carga al llegar el folio a mostrador,
--   - al VENDEDOR cuando el folio queda pagado por completo.
-- `idComisionTrack` en NULL = todavia no se le carga, asi que el
-- renglon se recalcula; con valor = ya se le cargo y queda congelado.
--
-- Idempotente. Correr DESPUES de `alter_taller_destajo.sql`.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS taller_comisiones (
    idTallerComision  BIGINT AUTO_INCREMENT PRIMARY KEY,
    createDate        DATETIME NOT NULL,
    idTaller          BIGINT NOT NULL,
    idUser            BIGINT NOT NULL,
    tipo              VARCHAR(20) NOT NULL,          -- DESTAJO | COMISION
    porcentaje        DECIMAL(5,2) NOT NULL DEFAULT 0,
    montoBase         DECIMAL(12,2) NOT NULL DEFAULT 0,
    monto             DECIMAL(12,2) NOT NULL DEFAULT 0,
    idComisionTrack   BIGINT NULL,
    active            SMALLINT NOT NULL DEFAULT 1,
    INDEX idx_tc_taller (idTaller),
    INDEX idx_tc_user (idUser)
) ENGINE=InnoDB;

-- ── Renombre de destajoMonto a comisiones ────────────────────

SET @sql = IF(
    ( SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller' AND COLUMN_NAME = 'destajoMonto' ) = 1
    AND
    ( SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller' AND COLUMN_NAME = 'comisiones' ) = 0,
    'ALTER TABLE taller CHANGE COLUMN destajoMonto comisiones DECIMAL(12,2) NOT NULL DEFAULT 0',
    'SELECT ''taller.comisiones ya existe o no hay destajoMonto que renombrar'''
);
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- Por si la base nunca tuvo destajoMonto (instalacion nueva).
SET @sql = IF(
    ( SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller' AND COLUMN_NAME = 'comisiones' ) = 0,
    'ALTER TABLE taller ADD COLUMN comisiones DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER utilidadCobrada',
    'SELECT ''taller.comisiones listo'''
);
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── Backfill ─────────────────────────────────────────────────
--
-- Se rehacen los renglones que no se han cargado a nadie. Garantias y
-- cancelados no generan comisiones.

DELETE FROM taller_comisiones WHERE idComisionTrack IS NULL;

-- 1. Destajo: por tecnico, sobre SU mano de obra.
INSERT INTO taller_comisiones (createDate, idTaller, idUser, tipo, porcentaje, montoBase, monto, active)
SELECT
  NOW()
, T.idTaller
, TMO.idUserTecnico
, 'DESTAJO'
, IFNULL( MAX( TMO.porcentajeDestajo ), IFNULL( MAX( U.destajo ), 0) )
, ROUND( SUM( TMO.precio ), 2)
, ROUND( SUM( ROUND( TMO.precio * IFNULL( TMO.porcentajeDestajo, IFNULL( U.destajo, 0) ) / 100, 2) ), 2)
, 1
FROM taller AS T
INNER JOIN taller_mano_obra AS TMO ON TMO.idTaller = T.idTaller
LEFT JOIN users AS U ON U.idUser = TMO.idUserTecnico
WHERE T.idTallerOrigen IS NULL
  AND T.idTallerStatus <> 7
  AND NOT EXISTS (
      SELECT 1 FROM taller_comisiones AS TC
      WHERE TC.idTaller = T.idTaller AND TC.idUser = TMO.idUserTecnico AND TC.tipo = 'DESTAJO'
  )
GROUP BY T.idTaller, TMO.idUserTecnico
HAVING ROUND( SUM( ROUND( TMO.precio * IFNULL( TMO.porcentajeDestajo, IFNULL( U.destajo, 0) ) / 100, 2) ), 2) > 0;

-- 2. Comision del vendedor: sobre (utilidad bruta - destajo).
--    La utilidad bruta es la neta guardada mas lo que ya se le resto.
INSERT INTO taller_comisiones (createDate, idTaller, idUser, tipo, porcentaje, montoBase, monto, active)
SELECT * FROM (
    SELECT
      NOW() AS createDate
    , T.idTaller
    , T.idSeller_idUser AS idUser
    , 'COMISION' AS tipo
    , IFNULL( U.comision, 0) AS porcentaje
    , ROUND( T.utilidad + T.comisiones - IFNULL(( SELECT SUM( TC.monto ) FROM taller_comisiones AS TC
                                                  WHERE TC.idTaller = T.idTaller AND TC.tipo = 'DESTAJO' ), 0), 2) AS montoBase
    , ROUND(
        GREATEST(
            T.utilidad + T.comisiones - IFNULL(( SELECT SUM( TC.monto ) FROM taller_comisiones AS TC
                                                 WHERE TC.idTaller = T.idTaller AND TC.tipo = 'DESTAJO' ), 0)
        , 0) * IFNULL( U.comision, 0) / 100
      , 2) AS monto
    , 1 AS active
    FROM taller AS T
    LEFT JOIN users AS U
           ON U.idUser = T.idSeller_idUser AND U.active = 1
          AND EXISTS ( SELECT 1 FROM rolesconfig AS RC
                       INNER JOIN roles AS R ON R.idRol = RC.idRol
                       WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = 1 )
    WHERE T.idTallerOrigen IS NULL
      AND T.idTallerStatus <> 7
      AND NOT EXISTS (
          SELECT 1 FROM taller_comisiones AS TC
          WHERE TC.idTaller = T.idTaller AND TC.tipo = 'COMISION'
      )
) AS X
WHERE X.monto > 0;

-- 3. taller.comisiones = la suma de sus renglones, y la utilidad se
--    vuelve a cerrar con esa suma.
UPDATE taller AS T
SET T.utilidad  = ROUND( T.utilidad + T.comisiones - IFNULL(( SELECT SUM( TC.monto ) FROM taller_comisiones AS TC
                                                              WHERE TC.idTaller = T.idTaller AND TC.active = 1 ), 0), 2)
  , T.comisiones = ROUND( IFNULL(( SELECT SUM( TC.monto ) FROM taller_comisiones AS TC
                                   WHERE TC.idTaller = T.idTaller AND TC.active = 1 ), 0), 2)
WHERE T.idTaller > 0;

UPDATE taller AS T
SET T.utilidadCobrada = IF(
        IFNULL( T.precioTotal, 0) <= 0 OR T.utilidad = 0,
        0,
        ROUND( T.utilidad * LEAST(
            IFNULL(( SELECT SUM( P.pago ) FROM payments AS P
                     WHERE P.idRelation = T.idSale AND P.relationType = 'V' AND P.active = 1 ), 0) / T.precioTotal
        , 1), 2)
    )
WHERE T.idTaller > 0;

SELECT
  ( SELECT COUNT(*) FROM taller_comisiones WHERE tipo = 'DESTAJO' )  AS renglonesDestajo
, ( SELECT COUNT(*) FROM taller_comisiones WHERE tipo = 'COMISION' ) AS renglonesComision
, ( SELECT ROUND( SUM( monto ), 2) FROM taller_comisiones )          AS comisionesTotal
, ( SELECT ROUND( SUM( utilidad ), 2) FROM taller )                  AS utilidadNeta
FROM DUAL;
