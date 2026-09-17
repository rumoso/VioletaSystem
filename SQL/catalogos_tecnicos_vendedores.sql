-- ============================================================
-- CATÁLOGOS DE TÉCNICOS Y VENDEDORES
-- (analisis/005-catalogo-tecnicos-vendedores.md)
-- La referencia universal del sistema sigue siendo users.idUser:
-- estos catálogos solo agregan datos por persona, no introducen ids
-- nuevos para los demás flujos (ventas, taller, metal). Idempotente.
-- ============================================================

-- RETIRADO (analisis/018-empleados-y-puestos.md, 2026-09-12): aquí se
-- creaban `tecnicos` y `vendedores`. Técnicos y vendedores ahora son
-- puestos (roles con idTipoRol 2 / 1) y sus % viven en users.destajo /
-- users.comision. Este script solo conserva `user_preferences`.

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
