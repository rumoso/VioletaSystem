-- ============================================================
-- USERS: NOMBRE Y APELLIDOS SEPARADOS
-- (analisis/018-empleados-y-puestos.md, sección "Nombre y apellidos")
--
-- `users.name` se CONSERVA como nombre completo: lo leen ~35 SPs,
-- 8 controllers, tickets, reportes y la sincronización entre sucursales,
-- y ninguno de ellos cambia. Lo arman insertUser / updateUser a partir de
-- estas tres columnas, apellidos primero:
--     "Paterno Materno, Nombre"   ·   sin apellidos: "Nombre"
--
-- Los usuarios existentes NO se parten automáticamente (no hay forma
-- segura de saber dónde terminan los nombres y empiezan los apellidos, y
-- hay cuentas genéricas como "MOSTRADOR 1.1"): quedan con `nombre` NULL,
-- la lista los marca "pendiente de separar nombre" y el modal pide
-- capturarlo la primera vez que se editan.
--
-- Aplica en LOCAL y PRODUCCIÓN, antes de sp_empleados_puestos.sql.
-- Idempotente.
-- ============================================================

SET @x = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'nombre' );
SET @s = IF(@x = 0,
  'ALTER TABLE `users` ADD COLUMN `nombre` VARCHAR(150) NULL COMMENT ''nombre(s); NULL = pendiente de separar el nombre completo'' AFTER `name`',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @x = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'apellidoPaterno' );
SET @s = IF(@x = 0,
  'ALTER TABLE `users` ADD COLUMN `apellidoPaterno` VARCHAR(100) NULL AFTER `nombre`',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @x = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'apellidoMaterno' );
SET @s = IF(@x = 0,
  'ALTER TABLE `users` ADD COLUMN `apellidoMaterno` VARCHAR(100) NULL AFTER `apellidoPaterno`',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
