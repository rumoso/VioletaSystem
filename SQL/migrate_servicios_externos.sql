-- Tabla para Servicios Externos
-- Ejecutar este script en la base de datos para crear la tabla

CREATE TABLE IF NOT EXISTS `servicios_externos` (
  `idServicioExterno` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL,
  `descripcion` TEXT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `fechaCreacion` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaActualizacion` DATETIME NULL,
  `idUsuarioCreacion` INT NULL,
  PRIMARY KEY (`idServicioExterno`),
  INDEX `idx_activo` (`activo`),
  INDEX `idx_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar algunos servicios externos de ejemplo (opcional)
INSERT INTO `servicios_externos` (`nombre`, `descripcion`, `activo`) VALUES
('Limpieza de Joyas', 'Servicio de limpieza y mantenimiento de joyas', 1),
('Soldadura de Oro', 'Reparación y soldadura de piezas de oro', 1),
('Plateado', 'Platinado de piezas de joyería', 1),
('Grabado', 'Grabado de textos en joyas', 1),
('Redimensionamiento', 'Ajuste de tamaño de anillos y pulseras', 1),
('Pulido y Lustrado', 'Pulido y lustre de joyas', 1);
