-- ============================================================
-- BITÁCORA FACIAL: EVIDENCIA E IP DEL EQUIPO
-- (analisis/039-bitacora-facial-evidencia-y-equipo.md). Idempotente.
--
-- Requiere `constantes.sql` (analisis/040) para apagar el guardado
-- (FACIAL_EVIDENCIA_ACTIVA) y fijar los días (FACIAL_EVIDENCIA_DIAS). Sin
-- esa tabla el Back usa los defaults: guarda, 30 días.
-- ============================================================

-- ── IP del equipo en cada renglón de la bitácora ──
-- MySQL 8 no tiene ADD COLUMN IF NOT EXISTS: alta condicional.
SET @existe = ( SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'face_verification_log' AND COLUMN_NAME = 'ip' );
SET @sql_ip = IF(@existe = 0,
  'ALTER TABLE `face_verification_log` ADD COLUMN `ip` VARCHAR(45) NULL DEFAULT NULL COMMENT ''IP del equipo desde donde se hizo el intento'' AFTER `referencia`',
  'SELECT 1');
PREPARE stmt FROM @sql_ip;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── Miniatura de evidencia ──
-- Solo en intentos SIN_VIDA y en marcajes faciales del checador. Tabla
-- aparte para que la bitácora siga ligera; se borra sola al vencer
-- (lo hace el Back al registrar intentos, sin tareas programadas).
CREATE TABLE IF NOT EXISTS `face_verification_evidencia` (
  `idFaceVerificationLog` BIGINT NOT NULL,
  `createDate`            DATETIME NOT NULL,
  `imgEvidencia`          MEDIUMTEXT NOT NULL COMMENT 'miniatura base64 (jpeg) de lo que vio la camara',
  PRIMARY KEY (`idFaceVerificationLog`),
  INDEX `idx_evidencia_fecha` (`createDate`),
  CONSTRAINT `fk_evidencia_log` FOREIGN KEY (`idFaceVerificationLog`)
    REFERENCES `face_verification_log` (`idFaceVerificationLog`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
