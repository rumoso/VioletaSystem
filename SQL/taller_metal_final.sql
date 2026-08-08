-- ============================================================
-- METAL FINAL (analisis/001-control-inventario-metal.md)
-- Metal que realmente quedó en la pieza terminada: lo que se
-- cobra al cliente y lo que se descuenta al técnico al pasar a
-- Finalizado/Mostrador. Patrón de taller_metal_agranel + técnico,
-- descripción y precio final. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS `taller_metal_final` (
  `idMetalFinal`   BIGINT NOT NULL AUTO_INCREMENT,
  `createDate`     DATETIME NOT NULL,
  `idTaller`       BIGINT NOT NULL,
  `idSale`         VARCHAR(100) NULL,
  `idUserTecnico`  BIGINT NOT NULL,
  `descripcion`    VARCHAR(1000) NULL,
  `tipo`           VARCHAR(45) NOT NULL COMMENT 'oro | plata',
  `gramos`         DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `kilates`        DECIMAL(18,2) NOT NULL DEFAULT 0.00 COMMENT 'kilataje (oro) o ley (plata)',
  `costoMetal`     DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `precioFinal`    DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `idCreateUser`   BIGINT NOT NULL,
  PRIMARY KEY (`idMetalFinal`),
  INDEX `idx_taller` (`idTaller`),
  INDEX `idx_tecnico` (`idUserTecnico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `taller_metal_final_log` (
  `keyx`             BIGINT NOT NULL AUTO_INCREMENT,
  `idMetalFinal`     BIGINT NOT NULL,
  `createDate`       DATETIME NULL,
  `idTaller`         BIGINT NULL,
  `idSale`           VARCHAR(100) NULL,
  `idUserTecnico`    BIGINT NULL,
  `descripcion`      VARCHAR(1000) NULL,
  `tipo`             VARCHAR(45) NULL,
  `gramos`           DECIMAL(18,2) NULL,
  `kilates`          DECIMAL(18,2) NULL,
  `costoMetal`       DECIMAL(18,2) NULL,
  `precioFinal`      DECIMAL(18,2) NULL,
  `idCreateUser`     BIGINT NULL,
  `tipoLog`          VARCHAR(20) NOT NULL COMMENT 'UPDATE | DELETE',
  `logDate`          DATETIME NOT NULL,
  `idCreateUserLog`  BIGINT NOT NULL,
  PRIMARY KEY (`keyx`),
  INDEX `idx_metal_final` (`idMetalFinal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
