-- ============================================================
-- PAGO DE NÓMINA (analisis/007-pago-nomina.md)
-- Registro histórico en tres niveles: cabecera, recibo por empleado,
-- detalle por concepto. Cada nivel es una COPIA CONGELADA — nada
-- referencia "en vivo" al listado base del empleado ni al catálogo de
-- conceptos; cambiar esos catálogos después de pagar una nómina no
-- altera lo que esa nómina ya muestra. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS `nomina` (
  `idNomina`             BIGINT NOT NULL AUTO_INCREMENT,
  `tipoPeriodo`          VARCHAR(10) NOT NULL COMMENT 'SEMANA | QUINCENA | MES, informativo',
  `fechaInicio`          DATE NOT NULL,
  `fechaFin`             DATE NOT NULL,
  `estatus`              VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' COMMENT 'BORRADOR | PAGADA | CANCELADA',
  `totalPercepciones`    DECIMAL(12,2) NOT NULL DEFAULT 0,
  `totalDeducciones`     DECIMAL(12,2) NOT NULL DEFAULT 0,
  `totalNeto`            DECIMAL(12,2) NOT NULL DEFAULT 0,
  `createDate`           DATETIME NOT NULL,
  `idCreateUser`         BIGINT NOT NULL,
  `pagadaDate`           DATETIME NULL,
  `idPagoUser`           BIGINT NULL,
  `canceladaDate`        DATETIME NULL,
  `idCancelUser`         BIGINT NULL,
  `motivoCancelacion`    VARCHAR(500) NULL,
  PRIMARY KEY (`idNomina`),
  INDEX `idx_estatus_fechas` (`estatus`, `fechaInicio`, `fechaFin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `nomina_recibos` (
  `idNominaRecibo`       BIGINT NOT NULL AUTO_INCREMENT,
  `idNomina`             BIGINT NOT NULL,
  `idEmpleado`           BIGINT NOT NULL,
  `idUser`               BIGINT NOT NULL,
  `nombreEmpleado`       VARCHAR(150) NOT NULL COMMENT 'copia congelada del nombre al generar',
  `totalPercepciones`    DECIMAL(12,2) NOT NULL DEFAULT 0,
  `totalDeducciones`     DECIMAL(12,2) NOT NULL DEFAULT 0,
  `neto`                 DECIMAL(12,2) NOT NULL DEFAULT 0,
  `bSinListadoBase`      TINYINT NOT NULL DEFAULT 0,
  `createDate`           DATETIME NOT NULL,
  `idCreateUser`         BIGINT NOT NULL,
  `updateDate`           DATETIME NULL,
  PRIMARY KEY (`idNominaRecibo`),
  UNIQUE KEY `ux_nomina_empleado` (`idNomina`, `idEmpleado`),
  INDEX `idx_empleado` (`idEmpleado`),
  CONSTRAINT `fk_nomina_recibos_nomina` FOREIGN KEY (`idNomina`) REFERENCES `nomina` (`idNomina`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `nomina_recibo_detalle` (
  `idNominaReciboDetalle` BIGINT NOT NULL AUTO_INCREMENT,
  `idNominaRecibo`        BIGINT NOT NULL,
  `idNominaConcepto`      BIGINT NULL COMMENT 'referencia informativa, no viva',
  `conceptoDesc`          VARCHAR(100) NOT NULL COMMENT 'copia congelada del nombre del concepto',
  `tipo`                  VARCHAR(15) NOT NULL COMMENT 'PERCEPCION | DEDUCCION, copia congelada',
  `monto`                 DECIMAL(10,2) NOT NULL COMMENT 'con signo solo en el caso Comisiones negativo',
  `bEsComisiones`         TINYINT NOT NULL DEFAULT 0 COMMENT 'marca la linea alimentada por comisiones_track',
  `createDate`            DATETIME NOT NULL,
  `idCreateUser`          BIGINT NOT NULL,
  `updateDate`            DATETIME NULL,
  PRIMARY KEY (`idNominaReciboDetalle`),
  INDEX `idx_recibo` (`idNominaRecibo`),
  CONSTRAINT `fk_nomina_detalle_recibo` FOREIGN KEY (`idNominaRecibo`) REFERENCES `nomina_recibos` (`idNominaRecibo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
