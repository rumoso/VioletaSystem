-- ============================================================
-- CATÁLOGO DE EMPLEADOS Y CONCEPTOS DE NÓMINA
-- (analisis/006-catalogo-empleados-nomina.md)
-- Ligado 1:1 a users.idUser (referencia universal). `active` del
-- empleado = "actualmente labora en la empresa" (una sola bandera;
-- la baja captura fechaBaja y desactiva en cascada usuario y demás
-- catálogos ligados al idUser). Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS `empleados` (
  `idEmpleado`             BIGINT NOT NULL AUTO_INCREMENT,
  `idUser`                 BIGINT NOT NULL COMMENT 'usuario del sistema ligado (referencia universal)',
  `nombre`                 VARCHAR(150) NOT NULL,
  `fechaIngreso`           DATE NOT NULL,
  `fechaBaja`              DATE NULL COMMENT 'solo cuando active = 0 (baja laboral)',
  `puesto`                 VARCHAR(100) NULL,
  `idSucursal`             BIGINT NULL,
  `telefono`               VARCHAR(20) NULL,
  `contactoEmergencia`     VARCHAR(200) NULL,
  `rfc`                    VARCHAR(13) NULL,
  `curp`                   VARCHAR(18) NULL,
  `nss`                    VARCHAR(11) NULL,
  `periodicidadComisiones` VARCHAR(10) NOT NULL DEFAULT 'SEMANA' COMMENT 'SEMANA | QUINCENA | MES',
  `horasSemana`            DECIMAL(5,2) NOT NULL DEFAULT 48 COMMENT 'horas a trabajar por semana (timeCard futuro)',
  `active`                 TINYINT NOT NULL DEFAULT 1 COMMENT '1 = actualmente labora en la empresa',
  `createDate`             DATETIME NOT NULL,
  `updateDate`             DATETIME NULL,
  `idCreateUser`           BIGINT NOT NULL,
  PRIMARY KEY (`idEmpleado`),
  UNIQUE KEY `ux_empleados_idUser` (`idUser`),
  CONSTRAINT `fk_empleados_users` FOREIGN KEY (`idUser`) REFERENCES `users` (`idUser`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `nomina_conceptos` (
  `idNominaConcepto` BIGINT NOT NULL AUTO_INCREMENT,
  `name`             VARCHAR(100) NOT NULL,
  `tipo`             VARCHAR(15) NOT NULL COMMENT 'PERCEPCION | DEDUCCION',
  `bSistema`         TINYINT NOT NULL DEFAULT 0 COMMENT '1 = precargado de fábrica, no eliminable físicamente',
  `active`           TINYINT NOT NULL DEFAULT 1,
  `createDate`       DATETIME NOT NULL,
  `updateDate`       DATETIME NULL,
  `idCreateUser`     BIGINT NOT NULL,
  PRIMARY KEY (`idNominaConcepto`),
  UNIQUE KEY `ux_nomina_conceptos_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Listado base de conceptos por empleado: punto de partida de cada
-- nómina (el monto vive aquí, no en el concepto).
CREATE TABLE IF NOT EXISTS `empleado_conceptos_base` (
  `idEmpleadoConceptoBase` BIGINT NOT NULL AUTO_INCREMENT,
  `idEmpleado`             BIGINT NOT NULL,
  `idNominaConcepto`       BIGINT NOT NULL,
  `monto`                  DECIMAL(10,2) NOT NULL COMMENT 'siempre positivo; el signo lo da el tipo del concepto',
  `createDate`             DATETIME NOT NULL,
  `updateDate`             DATETIME NULL,
  `idCreateUser`           BIGINT NOT NULL,
  PRIMARY KEY (`idEmpleadoConceptoBase`),
  UNIQUE KEY `ux_empleado_concepto` (`idEmpleado`, `idNominaConcepto`),
  CONSTRAINT `fk_ecb_empleados` FOREIGN KEY (`idEmpleado`) REFERENCES `empleados` (`idEmpleado`),
  CONSTRAINT `fk_ecb_conceptos` FOREIGN KEY (`idNominaConcepto`) REFERENCES `nomina_conceptos` (`idNominaConcepto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
