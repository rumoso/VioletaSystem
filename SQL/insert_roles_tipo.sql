-- ============================================================
-- USUARIOS → EMPLEADOS Y ROLES → PUESTOS — datos
-- (analisis/018-empleados-y-puestos.md, T2)
--
-- - Tipos de los puestos existentes (1 Vendedor/Vendedor Master,
--   2 Técnico) y creación de "Técnico" si no existe.
-- - Puesto de sistema "Empleado": idRol 7 FIJO, tipo 3, bSistema = 1.
--   El 7 nunca lo genera getIDKeyByUserWithOUT (concatena idUser +
--   contador, mínimo dos dígitos), así que no puede chocar.
-- - A todo usuario con registro en `empleados` se le asigna el puesto 7.
-- - Menús: "Usuarios" → "Empleados", "Roles" → "Puestos"; se desactivan
--   los catálogos de técnicos, vendedores y empleados.
-- - Acciones: se borran las de técnicos, vendedores y las de empleados
--   que duplicaban a las de usuarios (la pantalla de Empleados usa
--   users_CrearModificar / users_Disable; empleados_Eliminar se conserva
--   para la eliminación física).
--
-- Aplica en LOCAL y PRODUCCIÓN, después de empleados_puestos.sql y
-- sp_empleados_puestos.sql. Idempotente.
-- ============================================================

DROP PROCEDURE IF EXISTS `tmp_insert_roles_tipo`;

DELIMITER $$

CREATE PROCEDURE `tmp_insert_roles_tipo`()
BEGIN

	DECLARE v_nombre7 VARCHAR(500);
	DECLARE v_idUserC BIGINT;

	-- ── Puesto de sistema "Empleado" (idRol 7) ──
	SET v_nombre7 = ( SELECT name FROM roles WHERE idRol = 7 );

	IF v_nombre7 IS NOT NULL AND v_nombre7 <> 'Empleado' THEN
		SIGNAL SQLSTATE '45000'
		SET MESSAGE_TEXT = 'ABORTA: el idRol 7 ya existe con otro nombre. Revisar antes de crear el puesto de sistema Empleado.';
	END IF;

	IF EXISTS ( SELECT 1 FROM roles WHERE name = 'Empleado' AND idRol <> 7 ) THEN
		SIGNAL SQLSTATE '45000'
		SET MESSAGE_TEXT = 'ABORTA: ya existe un puesto llamado Empleado con otro idRol. Revisar antes de crear el puesto de sistema.';
	END IF;

	IF v_nombre7 IS NULL THEN
		INSERT INTO roles ( idRol, createDate, name, description, idTipoRol, bSistema, active )
		VALUES ( 7, NOW(), 'Empleado', 'Puesto del sistema: tiene datos de empleado y participa en asistencia y nómina.', 3, 1, 1 );
	ELSE
		UPDATE roles SET idTipoRol = 3, bSistema = 1, active = 1 WHERE idRol = 7;
	END IF;

	-- ── Puesto "Técnico" (tipo 2) ──
	IF NOT EXISTS ( SELECT 1 FROM roles WHERE name = 'Técnico' ) THEN
		SET v_idUserC = ( SELECT MIN(idUser) FROM users );
		CALL getIDKeyByUserWithOUT( v_idUserC, @idNewTecnico );
		INSERT INTO roles ( idRol, createDate, name, description, idTipoRol, bSistema, active )
		VALUES ( @idNewTecnico, NOW(), 'Técnico', 'Técnico del taller: aparece en los combos de técnico.', 2, 0, 1 );
	END IF;

END$$

DELIMITER ;

CALL `tmp_insert_roles_tipo`();
DROP PROCEDURE IF EXISTS `tmp_insert_roles_tipo`;

-- ── Tipos de los puestos existentes ──
UPDATE roles SET idTipoRol = 1 WHERE name IN ('Vendedor', 'Vendedor Master') AND bSistema = 0;
UPDATE roles SET idTipoRol = 2 WHERE name = 'Técnico' AND bSistema = 0;

-- ── Quien ya tiene datos de empleado conserva su calidad de empleado ──
INSERT INTO rolesconfig ( createDate, idUser, idRol )
SELECT NOW(), E.idUser, 7
FROM empleados AS E
WHERE NOT EXISTS ( SELECT 1 FROM rolesconfig AS RC WHERE RC.idUser = E.idUser AND RC.idRol = 7 );

-- ── Menús ──
UPDATE menus SET name = 'Empleados' WHERE linkList = 'userList';
UPDATE menus SET name = 'Puestos' WHERE linkList = 'roleList';
UPDATE menus SET active = 0 WHERE linkList IN ('tecnicosList', 'vendedoresList', 'empleadosList');

-- ── Acciones retiradas ──
DELETE AC FROM actionsconf AS AC
INNER JOIN actions AS A ON A.idAction = AC.idAction
WHERE A.name IN (
	'tecnicos_CrearModificar', 'tecnicos_Inactivar', 'tecnicos_Eliminar',
	'vendedores_CrearModificar', 'vendedores_Inactivar', 'vendedores_Eliminar',
	'empleados_CrearModificar', 'empleados_Baja'
);

DELETE FROM actions WHERE name IN (
	'tecnicos_CrearModificar', 'tecnicos_Inactivar', 'tecnicos_Eliminar',
	'vendedores_CrearModificar', 'vendedores_Inactivar', 'vendedores_Eliminar',
	'empleados_CrearModificar', 'empleados_Baja'
);

-- empleados_Eliminar pasa a ser la eliminación física de un empleado
-- (usuario) sin historial. En producción no existe: se crea en la
-- sección de Usuarios.
INSERT INTO actions ( createDate, idActionSection, name, nameHtml, description, active, nSpecial )
SELECT NOW(), S.idActionSection, 'empleados_Eliminar', 'Eliminar empleados definitivamente',
       'Permite la eliminación física de un empleado sin ningún historial (permiso restringido)', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Usuarios'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'empleados_Eliminar' )
LIMIT 1;

UPDATE actions SET nameHtml = 'Eliminar empleados definitivamente',
       description = 'Permite la eliminación física de un empleado sin ningún historial (permiso restringido)'
WHERE name = 'empleados_Eliminar';
