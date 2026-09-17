-- ============================================================
-- USUARIOS → EMPLEADOS Y ROLES → PUESTOS — estructura
-- (analisis/018-empleados-y-puestos.md, T1)
--
-- - `roles_tipo`: catálogo FIJO de tipos de rol. Define en qué combos
--   aparece la persona y qué datos complementarios tiene. NO da permisos.
--     1 VENDEDOR  → combos de vendedor, % comisión (users.comision)
--     2 TECNICO   → combos de técnico, % destajo (users.destajo)
--     3 EMPLEADO  → registro complementario en `empleados`; exclusivo del
--                   puesto de sistema "Empleado" (idRol 7)
-- - `roles.idTipoRol` / `roles.bSistema`.
-- - `users.bAcceso`: acceso al sistema opcional (0 = existe pero no
--   inicia sesión). Todos los usuarios actuales nacen con acceso.
-- - `empleados` pasa a ser complementaria 1:1 de `users`: se quitan
--   `nombre`, `puesto` y `active` (duplicaban a users y a los roles).
-- - Se retiran `tecnicos` y `vendedores`: sus % ya viven en users.
--
-- Aplica en LOCAL y PRODUCCIÓN. Idempotente (patrón
-- INFORMATION_SCHEMA + PREPARE/EXECUTE).
-- Orden: este script → sp_empleados_puestos.sql → insert_roles_tipo.sql
-- ============================================================

-- ── 1) roles_tipo ──
CREATE TABLE IF NOT EXISTS `roles_tipo` (
  `idTipoRol` INT NOT NULL COMMENT 'PK manual: 1 VENDEDOR, 2 TECNICO, 3 EMPLEADO',
  `clave`     VARCHAR(20) NOT NULL COMMENT 'clave fija que usa el código; no se edita',
  `nombre`    VARCHAR(50) NOT NULL,
  `active`    TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`idTipoRol`),
  UNIQUE KEY `ux_roles_tipo_clave` (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `roles_tipo` (idTipoRol, clave, nombre, active) VALUES
  (1, 'VENDEDOR', 'Vendedores', 1),
  (2, 'TECNICO',  'Técnicos',   1),
  (3, 'EMPLEADO', 'Empleados',  1)
ON DUPLICATE KEY UPDATE clave = VALUES(clave), nombre = VALUES(nombre), active = 1;

-- ── 2) roles.idTipoRol / roles.bSistema ──
SET @x = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'idTipoRol' );
SET @s = IF(@x = 0,
  'ALTER TABLE `roles` ADD COLUMN `idTipoRol` INT NULL COMMENT ''tipo de rol (roles_tipo); NULL = sin tipo'' AFTER `description`',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @x = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND CONSTRAINT_NAME = 'fk_roles_roles_tipo' );
SET @s = IF(@x = 0,
  'ALTER TABLE `roles` ADD CONSTRAINT `fk_roles_roles_tipo` FOREIGN KEY (`idTipoRol`) REFERENCES `roles_tipo` (`idTipoRol`)',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @x = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'bSistema' );
SET @s = IF(@x = 0,
  'ALTER TABLE `roles` ADD COLUMN `bSistema` TINYINT NOT NULL DEFAULT 0 COMMENT ''1 = puesto del sistema: no se renombra, no cambia de tipo, no se inactiva ni elimina'' AFTER `idTipoRol`',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 3) users.bAcceso ──
SET @x = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'bAcceso' );
SET @s = IF(@x = 0,
  'ALTER TABLE `users` ADD COLUMN `bAcceso` TINYINT NOT NULL DEFAULT 1 COMMENT ''1 = puede iniciar sesion (contrasena o rostro); 0 = existe sin acceso'' AFTER `active`',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 4) empleados: complementaria de users ──
-- Se crea ya en su forma final (producción no la tiene). Las tablas que
-- cuelgan de ella siguen en sus scripts de 006-013.
CREATE TABLE IF NOT EXISTS `empleados` (
  `idEmpleado`             BIGINT NOT NULL AUTO_INCREMENT,
  `idUser`                 BIGINT NOT NULL COMMENT 'registro complementario 1:1 de users',
  `fechaIngreso`           DATE NOT NULL,
  `fechaBaja`              DATE NULL COMMENT 'se captura al dar de baja (users.active = 0)',
  `idSucursal`             BIGINT NULL COMMENT 'sucursal base',
  `telefono`               VARCHAR(20) NULL,
  `contactoEmergencia`     VARCHAR(200) NULL,
  `rfc`                    VARCHAR(13) NULL,
  `curp`                   VARCHAR(18) NULL,
  `nss`                    VARCHAR(11) NULL,
  `periodicidadComisiones` VARCHAR(10) NOT NULL DEFAULT 'SEMANA' COMMENT 'SEMANA | QUINCENA | MES',
  `horasSemana`            DECIMAL(5,2) NOT NULL DEFAULT 48,
  `createDate`             DATETIME NOT NULL,
  `updateDate`             DATETIME NULL,
  `idCreateUser`           BIGINT NOT NULL,
  PRIMARY KEY (`idEmpleado`),
  UNIQUE KEY `ux_empleados_idUser` (`idUser`),
  CONSTRAINT `fk_empleados_users` FOREIGN KEY (`idUser`) REFERENCES `users` (`idUser`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Donde `empleados` ya existía con el modelo de 006: la baja laboral
-- vivía en empleados.active; se pasa a users.active ANTES de quitar la
-- columna para no reactivar a nadie por accidente.
SET @x = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'active' );
SET @s = IF(@x = 1,
  'UPDATE `users` AS U INNER JOIN `empleados` AS E ON E.idUser = U.idUser SET U.active = 0 WHERE E.active = 0',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = IF(@x = 1, 'ALTER TABLE `empleados` DROP COLUMN `active`', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @x = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'nombre' );
SET @s = IF(@x = 1, 'ALTER TABLE `empleados` DROP COLUMN `nombre`', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @x = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'puesto' );
SET @s = IF(@x = 1, 'ALTER TABLE `empleados` DROP COLUMN `puesto`', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 5) Retiro de tecnicos y vendedores ──
-- Sus porcentajes viven en users.destajo / users.comision; su lista sale
-- de los roles con tipo 2 / tipo 1. Datos solo de prueba (decisión de
-- Rubén 2026-09-12).
DROP TABLE IF EXISTS `tecnicos`;
DROP TABLE IF EXISTS `vendedores`;
