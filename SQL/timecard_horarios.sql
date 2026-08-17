-- ============================================================
-- HORARIOS de sucursal y de empleado (analisis/011-timecard.md)
-- Mismo formato en las dos: un renglon por dia de la semana con su
-- hora de entrada y salida. La AUSENCIA de renglon para un dia ES el
-- descanso — no hay bandera "descansa", el dia simplemente no tiene
-- fila. El horario del empleado (si tiene AUNQUE SEA un renglon) gana
-- por completo sobre el de su sucursal. Solo si no tiene ninguno se
-- usa el de la sucursal.
-- Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS `sucursal_horarios` (
  `idSucursalHorario`  BIGINT NOT NULL AUTO_INCREMENT,
  `idSucursal`         INT NOT NULL,
  `diaSemana`          TINYINT NOT NULL COMMENT '1=lunes ... 7=domingo',
  `horaEntrada`        TIME NOT NULL,
  `horaSalida`         TIME NOT NULL,
  `createDate`         DATETIME NOT NULL,
  `updateDate`         DATETIME NULL,
  `idCreateUser`       BIGINT NOT NULL,
  PRIMARY KEY (`idSucursalHorario`),
  UNIQUE KEY `ux_sucursal_horario_dia` (`idSucursal`, `diaSemana`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `empleado_horarios` (
  `idEmpleadoHorario`  BIGINT NOT NULL AUTO_INCREMENT,
  `idEmpleado`         BIGINT NOT NULL,
  `diaSemana`          TINYINT NOT NULL COMMENT '1=lunes ... 7=domingo',
  `horaEntrada`        TIME NOT NULL,
  `horaSalida`         TIME NOT NULL,
  `createDate`         DATETIME NOT NULL,
  `updateDate`         DATETIME NULL,
  `idCreateUser`       BIGINT NOT NULL,
  PRIMARY KEY (`idEmpleadoHorario`),
  UNIQUE KEY `ux_empleado_horario_dia` (`idEmpleado`, `diaSemana`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
