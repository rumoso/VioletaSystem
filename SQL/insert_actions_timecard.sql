-- ============================================================
-- ACCIONES Y MENÚ DE TIMECARD (analisis/011-timecard.md)
-- Sección "Personal" (ya existe desde 005/006/008/007). Idempotente.
-- ============================================================

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'timecard_CapturarManual', 'Capturar/corregir marcaje manual', 'Autoriza capturar o corregir a mano un marcaje de asistencia — pide código/rostro cada vez', 1, 1
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'timecard_CapturarManual' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'timecard_Consultar', 'Consultar asistencia', 'Permite ver la consulta de asistencia (marcajes y horas por empleado)', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'timecard_Consultar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'timecard_AdministrarHorarios', 'Administrar horarios', 'Permite capturar el horario semanal de una sucursal o de un empleado', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'timecard_AdministrarHorarios' )
LIMIT 1;

-- Menú "Asistencia", hijo de "Personal"
INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), M.idMenu, '15', 'Asistencia', 'Consulta de asistencia y horas trabajadas (TimeCard)', NULL, NULL, 'timecardList', 'assets/img/icons/invFisico.png', '80', '1', '1'
FROM menus AS M
WHERE M.name = 'Personal' AND M.idMenuPadre = 0
AND NOT EXISTS ( SELECT 1 FROM menus WHERE linkList = 'timecardList' )
LIMIT 1;
