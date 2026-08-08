-- ============================================================
-- RECONOCIMIENTO FACIAL (analisis/004-reconocimiento-facial.md)
-- Componente universal: referencia de rostro por persona (cliente o
-- usuario) + bitácora de verificaciones/identificaciones. Todo el
-- reconocimiento (comparación de rostros) ocurre en el navegador; el
-- servidor solo guarda/entrega el descriptor (vector de 128 números)
-- y el resultado de cada intento. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS `face_reference` (
  `idFaceReference` BIGINT NOT NULL AUTO_INCREMENT,
  `createDate`      DATETIME NOT NULL,
  `updateDate`      DATETIME NULL,
  `tipoPersona`     VARCHAR(20) NOT NULL COMMENT 'CLIENTE | USUARIO',
  `idPersona`       BIGINT NOT NULL,
  `descriptor`      TEXT NOT NULL COMMENT 'vector de 128 numeros (face-api), JSON',
  `imgThumb`        MEDIUMTEXT NULL COMMENT 'miniatura base64, solo referencia visual',
  `idCreateUser`    BIGINT NOT NULL,
  PRIMARY KEY (`idFaceReference`),
  UNIQUE KEY `ux_persona` (`tipoPersona`, `idPersona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cámara preferida por usuario para el reconocimiento facial. El deviceId
-- lo asigna el navegador (no es un catálogo del sistema como `printers`);
-- si al cargar no existe entre las cámaras disponibles de esa máquina, el
-- Front cae de vuelta a la cámara por default.
CREATE TABLE IF NOT EXISTS `face_camera_preference` (
  `idUser`     BIGINT NOT NULL,
  `deviceId`   VARCHAR(500) NOT NULL,
  `label`      VARCHAR(500) NULL,
  `updateDate` DATETIME NOT NULL,
  PRIMARY KEY (`idUser`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `face_verification_log` (
  `idFaceVerificationLog`   BIGINT NOT NULL AUTO_INCREMENT,
  `createDate`              DATETIME NOT NULL,
  `modo`                    VARCHAR(20) NOT NULL COMMENT 'VERIFICAR | IDENTIFICAR',
  `tipoPersonaEsperada`     VARCHAR(20) NULL,
  `idPersonaEsperada`       BIGINT NULL,
  `tipoPersonaIdentificada` VARCHAR(20) NULL,
  `idPersonaIdentificada`   BIGINT NULL,
  `resultado`               VARCHAR(20) NOT NULL COMMENT 'EXITO | FALLO | NO_DISPONIBLE | AUTORIZACION_MANUAL',
  `similitud`                DECIMAL(5,4) NULL,
  `referencia`              VARCHAR(1000) NULL COMMENT 'pantalla/flujo de origen',
  `idCreateUser`            BIGINT NOT NULL,
  PRIMARY KEY (`idFaceVerificationLog`),
  INDEX `idx_fecha` (`createDate`),
  INDEX `idx_esperada` (`tipoPersonaEsperada`, `idPersonaEsperada`),
  INDEX `idx_identificada` (`tipoPersonaIdentificada`, `idPersonaIdentificada`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
