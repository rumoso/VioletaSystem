-- ============================================================
-- CATÁLOGO DE SUCURSALES — acción, menú y permisos
-- (analisis/021-catalogo-sucursales.md). Idempotente: se puede correr
-- más de una vez sin duplicar nada.
--
-- No cambia estructura: `sucursales` y `sucursal_horarios` ya existen.
--
--   sucursales_CrearModificar — dar de alta, editar, activar o desactivar
--   una sucursal. El SERVIDOR la revisa en cada endpoint: el menú solo
--   decide si el renglón aparece.
--
-- El horario de la sucursal se sigue editando con la acción que ya
-- existe, `timecard_AdministrarHorarios`.
-- ============================================================

-- Sección "General" (ya existe).
INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'sucursales_CrearModificar', 'Crear y modificar sucursales', 'Permite dar de alta, editar, activar y desactivar sucursales desde el catálogo de sucursales', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'General'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'sucursales_CrearModificar' )
LIMIT 1;

-- Menú hijo "Sucursales" bajo "Configuración".
INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), M.idMenu, '2', 'Sucursales', 'Datos y horario de cada sucursal', NULL, NULL, 'sucursalList', NULL, NULL, '1', '1'
FROM menus AS M
WHERE M.name = 'Configuración' AND M.idMenuPadre = 0
AND NOT EXISTS ( SELECT 1 FROM menus WHERE linkList = 'sucursalList' )
LIMIT 1;

-- ── Permiso de MENÚ para Admin y CEO ──
-- `menupermisos.idMenuPermiso` NO es auto_increment: lo genera el SP del
-- sistema `insertMenuPermisoByIdRelation`. El SP no es idempotente, por
-- eso va en un PREPARE/EXECUTE condicional.
SET @idMenuSucursales = ( SELECT idMenu FROM menus WHERE linkList = 'sucursalList' LIMIT 1 );

-- Admin
SET @idRol = ( SELECT idRol FROM roles WHERE name = 'Admin' LIMIT 1 );
SET @existe = ( SELECT COUNT(*) FROM menupermisos WHERE typeRelation = 'R' AND idRelation = @idRol AND idMenu = @idMenuSucursales );
SET @sql_mp = IF(@existe = 0 AND @idRol IS NOT NULL AND @idMenuSucursales IS NOT NULL,
  CONCAT('CALL insertMenuPermisoByIdRelation(''R'', ', @idRol, ', ', @idMenuSucursales, ', 1)'),
  'SELECT 1');
PREPARE stmt FROM @sql_mp;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- CEO
SET @idRol = ( SELECT idRol FROM roles WHERE name = 'CEO' LIMIT 1 );
SET @existe = ( SELECT COUNT(*) FROM menupermisos WHERE typeRelation = 'R' AND idRelation = @idRol AND idMenu = @idMenuSucursales );
SET @sql_mp = IF(@existe = 0 AND @idRol IS NOT NULL AND @idMenuSucursales IS NOT NULL,
  CONCAT('CALL insertMenuPermisoByIdRelation(''R'', ', @idRol, ', ', @idMenuSucursales, ', 1)'),
  'SELECT 1');
PREPARE stmt FROM @sql_mp;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── Permiso de la ACCIÓN para Admin y CEO ──
INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT NOW(), 'R', R.idRol, A.idAction, 1
FROM roles AS R
CROSS JOIN actions AS A
WHERE R.name IN ('Admin', 'CEO')
  AND A.name = 'sucursales_CrearModificar'
  AND NOT EXISTS (
      SELECT 1 FROM actionsconf AS AC
      WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction
  );
