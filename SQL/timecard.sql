-- ============================================================
-- TIMECARD — control de horas trabajadas (analisis/011-timecard.md)
-- Dos tablas separadas porque se corrigen distinto:
--   `timecard_marcajes`  — el hecho crudo, append-only (igual que
--                          comisiones_track / metal_inventario_track):
--                          nunca se edita ni se borra. Una corrección
--                          es un marcaje nuevo que apunta al que
--                          anula.
--   `timecard_jornadas`  — el cálculo derivado (una fila por
--                          empleado+día), se recalcula sola desde los
--                          marcajes mientras siga PENDIENTE. Al
--                          incluirse en una nómina queda congelada
--                          (misma regla de copia congelada de
--                          analisis/007).
-- Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS `timecard_marcajes` (
  `idMarcaje`          BIGINT NOT NULL AUTO_INCREMENT,
  `idEmpleado`         BIGINT NOT NULL,
  `idUser`             BIGINT NOT NULL COMMENT 'referencia universal, copiada del empleado al momento del marcaje',
  `fecha`              DATE NOT NULL COMMENT 'dia de la jornada a la que pertenece (no necesariamente el de fechaHora)',
  `fechaHora`          DATETIME NOT NULL COMMENT 'momento real del marcaje',
  `tipo`               VARCHAR(20) NOT NULL COMMENT 'ENTRADA_JORNADA | SALIDA_COMIDA | ENTRADA_COMIDA | SALIDA_PERMISO | ENTRADA_PERMISO | SALIDA_JORNADA',
  `idSucursal`         INT NULL,
  `origen`             VARCHAR(10) NOT NULL DEFAULT 'FACIAL' COMMENT 'FACIAL | MANUAL',
  `similitud`          DECIMAL(5,4) NULL COMMENT 'con que similitud lo identifico el facial, para auditar chequeos dudosos',
  `idMarcajeCorrige`   BIGINT NULL COMMENT 'si este marcaje corrige/anula a otro, apunta a el',
  `motivo`             VARCHAR(500) NULL COMMENT 'obligatorio en captura MANUAL',
  `auth_idUser`        BIGINT NULL COMMENT 'quien autorizo la captura/correccion manual (codigo/rostro)',
  `bAnulado`           TINYINT NOT NULL DEFAULT 0 COMMENT '1 = un marcaje posterior lo corrigio - sigue visible en el historial, deja de contar',
  `createDate`         DATETIME NOT NULL,
  `idCreateUser`       BIGINT NOT NULL,
  PRIMARY KEY (`idMarcaje`),
  INDEX `idx_empleado_fecha` (`idEmpleado`, `fecha`),
  INDEX `idx_idMarcajeCorrige` (`idMarcajeCorrige`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `timecard_jornadas` (
  `idJornada`          BIGINT NOT NULL AUTO_INCREMENT,
  `idEmpleado`         BIGINT NOT NULL,
  `fecha`              DATE NOT NULL,
  `horasTrabajadas`    DECIMAL(6,2) NOT NULL DEFAULT 0,
  `horasEsperadas`     DECIMAL(6,2) NOT NULL DEFAULT 0,
  `bIncompleta`        TINYINT NOT NULL DEFAULT 0 COMMENT '1 = le falta un marcaje de un par abierto - no aporta horas',
  `bFalta`             TINYINT NOT NULL DEFAULT 0 COMMENT '1 = le tocaba trabajar (horario) y no hay ningun marcaje',
  `bRetardo`           TINYINT NOT NULL DEFAULT 0,
  `minutosRetardo`     INT NOT NULL DEFAULT 0,
  `estatus`            VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' COMMENT 'PENDIENTE | INCLUIDA_EN_NOMINA | CANCELADA',
  `idNomina`           BIGINT NULL COMMENT 'se llena cuando una nomina paga esta jornada',
  `createDate`         DATETIME NOT NULL,
  `updateDate`         DATETIME NULL,
  `idCreateUser`       BIGINT NOT NULL,
  PRIMARY KEY (`idJornada`),
  UNIQUE KEY `ux_jornada_empleado_fecha` (`idEmpleado`, `fecha`),
  INDEX `idx_estatus_fecha` (`estatus`, `fecha`),
  INDEX `idx_nomina` (`idNomina`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
