-- ============================================================
-- BITÁCORA DE COMISIONES POR EMPLEADO
-- (analisis/008-bitacora-comisiones-empleados.md)
-- Append-only, mismo patrón que metal_inventario_track: cada renglón
-- es una comisión ganada (o una deducción, monto negativo), nunca se
-- edita — solo se cancela o se compensa con un renglón nuevo.
-- Idempotente.
-- ============================================================

-- % de destajo del técnico (0-100). Los ALTER no soportan
-- IF NOT EXISTS en MySQL — se verifica contra INFORMATION_SCHEMA.
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tecnicos' AND COLUMN_NAME = 'destajoPorcentaje'
);

SET @sql_alter = IF(@col_exists = 0,
  'ALTER TABLE `tecnicos` ADD COLUMN `destajoPorcentaje` DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT ''0-100, 0 = no gana destajo'' AFTER `nombre`',
  'SELECT 1'
);

PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `comisiones_track` (
  `idComisionTrack`       BIGINT NOT NULL AUTO_INCREMENT,
  `idUser`                BIGINT NOT NULL COMMENT 'tecnico o vendedor (referencia universal)',
  `tipo`                  VARCHAR(20) NOT NULL COMMENT 'DESTAJO | VENTA | MANUAL',
  `concepto`              VARCHAR(200) NOT NULL,
  `monto`                 DECIMAL(10,2) NOT NULL COMMENT 'con signo: negativo = deduccion',
  `fecha`                 DATE NOT NULL,
  `idTaller`              BIGINT NULL,
  `idSale`                VARCHAR(100) NULL,
  `referencia`            VARCHAR(500) NULL,
  `estatus`               VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' COMMENT 'PENDIENTE | INCLUIDA_EN_NOMINA | CANCELADA',
  `idNomina`              BIGINT NULL COMMENT 'se llena cuando una nomina paga este renglon',
  `idComisionTrackOrigen` BIGINT NULL COMMENT 'la deduccion negativa apunta al renglon ya pagado que compensa',
  `motivoCancelacion`     VARCHAR(500) NULL,
  `cancelDate`            DATETIME NULL,
  `idCancelUser`          BIGINT NULL,
  `createDate`            DATETIME NOT NULL,
  `idCreateUser`          BIGINT NOT NULL,
  PRIMARY KEY (`idComisionTrack`),
  INDEX `idx_user_estatus_fecha` (`idUser`, `estatus`, `fecha`),
  INDEX `idx_taller` (`idTaller`),
  INDEX `idx_sale` (`idSale`),
  INDEX `idx_nomina` (`idNomina`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
