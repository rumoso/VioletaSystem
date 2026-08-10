-- ============================================================
-- ACCIONES Y MENÚ DE LA BITÁCORA DE COMISIONES
-- (analisis/008-bitacora-comisiones-empleados.md). Idempotente.
-- ============================================================

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'comisiones_Capturar', 'Capturar comisiones', 'Permite capturar renglones manuales en la bitácora de comisiones (incluye ajustes en negativo) y generar comisiones de venta del periodo', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'comisiones_Capturar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'comisiones_Cancelar', 'Cancelar comisiones', 'Permite cancelar un renglon pendiente de la bitacora de comisiones, con motivo', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'comisiones_Cancelar' )
LIMIT 1;

-- Menú "Comisiones" (bitácora nueva), hijo de "Personal"
INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), M.idMenu, '5', 'Comisiones', 'Bitácora de comisiones por empleado (destajo, venta, ajustes manuales)', NULL, NULL, 'comisionesTrackList', 'assets/img/icons/invFisico.png', '80', '1', '1'
FROM menus AS M
WHERE M.name = 'Personal' AND M.idMenuPadre = 0
AND NOT EXISTS ( SELECT 1 FROM menus WHERE linkList = 'comisionesTrackList' )
LIMIT 1;

-- El menú del módulo de comisiones viejo (solo ventas) se reemplaza
-- por la bitácora nueva; sus tablas quedan intactas para consulta
-- directa, pero deja de tener entrada de menú.
UPDATE menus SET active = 0 WHERE linkList = 'comisiones' AND active = 1;
