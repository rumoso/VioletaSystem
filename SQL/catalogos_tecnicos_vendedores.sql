-- ============================================================
-- CATÁLOGOS DE TÉCNICOS Y VENDEDORES
-- (analisis/005-catalogo-tecnicos-vendedores.md)
-- La referencia universal del sistema sigue siendo users.idUser:
-- estos catálogos solo agregan datos por persona, no introducen ids
-- nuevos para los demás flujos (ventas, taller, metal). Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS `tecnicos` (
  `idTecnico`    BIGINT NOT NULL AUTO_INCREMENT,
  `idUser`       BIGINT NOT NULL COMMENT 'usuario del sistema ligado (referencia universal)',
  `nombre`       VARCHAR(150) NOT NULL,
  `active`       TINYINT NOT NULL DEFAULT 1,
  `createDate`   DATETIME NOT NULL,
  `updateDate`   DATETIME NULL,
  `idCreateUser` BIGINT NOT NULL,
  PRIMARY KEY (`idTecnico`),
  UNIQUE KEY `ux_tecnicos_idUser` (`idUser`),
  CONSTRAINT `fk_tecnicos_users` FOREIGN KEY (`idUser`) REFERENCES `users` (`idUser`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `vendedores` (
  `idVendedor`   BIGINT NOT NULL AUTO_INCREMENT,
  `idUser`       BIGINT NOT NULL COMMENT 'usuario del sistema ligado (referencia universal)',
  `nombre`       VARCHAR(150) NOT NULL,
  `active`       TINYINT NOT NULL DEFAULT 1,
  `createDate`   DATETIME NOT NULL,
  `updateDate`   DATETIME NULL,
  `idCreateUser` BIGINT NOT NULL,
  PRIMARY KEY (`idVendedor`),
  UNIQUE KEY `ux_vendedores_idUser` (`idUser`),
  CONSTRAINT `fk_vendedores_users` FOREIGN KEY (`idUser`) REFERENCES `users` (`idUser`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Preferencias genéricas por usuario (patrón select_printers /
-- face_camera_preference, pero genérico por scope+key). Primer uso:
-- preferencia de vista tabla/cards de los catálogos.
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `idUserPreference` BIGINT NOT NULL AUTO_INCREMENT,
  `idUser`           BIGINT NOT NULL,
  `scope`            VARCHAR(50) NOT NULL COMMENT 'pantalla/módulo, ej. vendedoresList',
  `prefKey`          VARCHAR(50) NOT NULL COMMENT 'ej. viewModeDesktop | viewModeMobile',
  `prefValue`        VARCHAR(200) NOT NULL,
  `updateDate`       DATETIME NOT NULL,
  PRIMARY KEY (`idUserPreference`),
  UNIQUE KEY `ux_user_pref` (`idUser`, `scope`, `prefKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
