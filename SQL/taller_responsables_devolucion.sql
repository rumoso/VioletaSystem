-- =====================================================================
-- Tabla: taller_responsables_devolucion
-- Distribución de responsabilidad del monto cuando un taller se devuelve
-- =====================================================================

CREATE TABLE IF NOT EXISTS `taller_responsables_devolucion` (
  `idResponsablesDevolucion` INT NOT NULL AUTO_INCREMENT,
  `createDate`               DATETIME NOT NULL,
  `idTaller`                 BIGINT NOT NULL,
  `idUser`                   BIGINT NOT NULL,
  `monto`                    DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`idResponsablesDevolucion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
