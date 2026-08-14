-- ============================================================
-- Poblar `vendedores` a partir de usuarios con rol Vendedor/Vendedor
-- Master (roles.name IN ('Vendedor','Vendedor Master') vía
-- rolesconfig). Idempotente: NOT EXISTS evita duplicar si el usuario
-- ya tiene registro; UNIQUE KEY ux_vendedores_idUser lo respalda.
--
-- Solo usuarios ACTIVOS: hay cuentas duplicadas/legacy inactivas con
-- el mismo userName (limpieza histórica de usuarios) — no se les crea
-- vendedor. Si Rubén necesita un vendedor inactivo específico, se da
-- de alta a mano desde la pantalla.
--
-- comisionPorcentaje queda en 0 (default) — se ajusta después desde
-- la pantalla de vendedores, por persona.
-- ============================================================

INSERT INTO vendedores (idUser, nombre, comisionPorcentaje, active, createDate, idCreateUser)
SELECT DISTINCT
    U.idUser
    , U.name
    , 0
    , 1
    , NOW()
    , U.idUser
FROM users AS U
INNER JOIN rolesconfig AS RC ON RC.idUser = U.idUser
INNER JOIN roles AS R ON R.idRol = RC.idRol
WHERE R.name IN ('Vendedor', 'Vendedor Master')
AND U.active = 1
AND NOT EXISTS ( SELECT 1 FROM vendedores AS V WHERE V.idUser = U.idUser );
