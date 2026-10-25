-- ============================================================
-- USUARIO `newUser` DE MySQL, CON TODOS LOS PERMISOS
--
-- Es el usuario con el que se conecta el Back (`Back/.env`, USERDB) y
-- el dueño (DEFINER) de los SPs que se generaron en desarrollo — por eso
-- un servidor sin este usuario truena con
-- "The user specified as a definer ('newUser'@'%') does not exist"
-- (ver SQL/fix_definer_sps.sql).
--
-- ANTES DE CORRERLO: cambiar las dos veces que aparece
-- 'PON_AQUI_LA_CONTRASENA' por la contraseña real. No se versiona ninguna
-- contraseña en el repo.
--
-- Cómo correrlo (como root o un usuario con GRANT OPTION):
--     mysql -u root -p < create_user_newuser.sql
--
-- Se crean DOS cuentas, porque MySQL distingue usuario+host:
--   'newUser'@'localhost' — conexiones desde la misma máquina.
--   'newUser'@'%'         — conexiones desde la red (y es el host que
--                           traen los DEFINER de los SPs de desarrollo).
-- Si el servidor solo se usa en local, se puede borrar el bloque de '%'.
--
-- Idempotente: CREATE USER IF NOT EXISTS no pisa la cuenta si ya existe
-- (tampoco le cambia la contraseña; para eso, descomentar los ALTER USER
-- del final).
-- ============================================================

CREATE USER IF NOT EXISTS 'newUser'@'localhost' IDENTIFIED BY 'PON_AQUI_LA_CONTRASENA';
CREATE USER IF NOT EXISTS 'newUser'@'%'         IDENTIFIED BY 'PON_AQUI_LA_CONTRASENA';

-- Todos los permisos sobre TODAS las bases (*.*), y con GRANT OPTION
-- para que además pueda otorgarlos.
GRANT ALL PRIVILEGES ON *.* TO 'newUser'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'newUser'@'%'         WITH GRANT OPTION;

FLUSH PRIVILEGES;

-- Verificación:
SELECT user, host, plugin FROM mysql.user WHERE user = 'newUser';
SHOW GRANTS FOR 'newUser'@'localhost';
SHOW GRANTS FOR 'newUser'@'%';

-- ============================================================
-- NOTAS
--
-- 1. Cambiar la contraseña de una cuenta que ya existe:
--      ALTER USER 'newUser'@'localhost' IDENTIFIED BY 'LA_NUEVA';
--      ALTER USER 'newUser'@'%'         IDENTIFIED BY 'LA_NUEVA';
--    Si se cambia, actualizar también PASSWORD en Back/.env.
--
-- 2. En MySQL 8, `GRANT ALL PRIVILEGES ON *.*` da todos los permisos
--    estáticos, pero NO los dinámicos (los que tiene root, como
--    SYSTEM_USER o BACKUP_ADMIN). Normalmente no hacen falta para la
--    aplicación; si se quieren, agregar:
--      GRANT SYSTEM_USER, BACKUP_ADMIN, CONNECTION_ADMIN, ROLE_ADMIN,
--            SET_USER_ID, REPLICATION_APPLIER
--        ON *.* TO 'newUser'@'localhost';
--
-- 3. Si el cliente (mysql2 de Node, Workbench viejo) no logra conectar
--    por el método de autenticación de MySQL 8, crear la cuenta con el
--    plugin anterior:
--      ALTER USER 'newUser'@'%' IDENTIFIED WITH mysql_native_password
--            BY 'LA_CONTRASENA';
--
-- 4. Para deshacer:
--      DROP USER IF EXISTS 'newUser'@'localhost';
--      DROP USER IF EXISTS 'newUser'@'%';
-- ============================================================
