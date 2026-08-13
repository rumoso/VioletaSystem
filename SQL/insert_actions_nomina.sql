-- ============================================================
-- ACCIONES Y MENÚ DE PAGO DE NÓMINA
-- (analisis/007-pago-nomina.md). Idempotente.
-- ============================================================

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'nomina_Generar', 'Generar y editar nómina', 'Permite generar corridas de nómina en borrador y editar sus recibos antes de pagar', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'nomina_Generar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'nomina_Pagar', 'Pagar nómina', 'Permite pagar una nómina en borrador, volviéndola inmutable', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'nomina_Pagar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'nomina_Cancelar', 'Cancelar nómina pagada', 'Permite cancelar una nómina ya pagada, con motivo (permiso restringido)', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'nomina_Cancelar' )
LIMIT 1;

-- Eliminación física de una nómina completa (permiso separado y más
-- restringido que Generar) — solo aplica a nóminas en BORRADOR, nunca
-- a una ya pagada/cancelada (esas conservan su historial).
INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'nomina_Eliminar', 'Eliminar nómina completa', 'Permite borrar por completo una nómina en borrador (permiso restringido); no aplica a nóminas ya pagadas o canceladas', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'nomina_Eliminar' )
LIMIT 1;

-- Editar percepciones/deducciones de un recibo (agregar/editar/quitar)
-- — permiso SUPER especial (nSpecial=1): requiere autorización por
-- código o rostro en el momento (patrón ActionAuthorizationComponent,
-- igual que la captura manual de la bitácora de comisiones), no solo
-- tener el permiso asignado. Separado de nomina_Generar: ver/generar/
-- pagar/cancelar la nómina no requiere este código, tocar montos sí.
INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'nomina_EditarConceptos', 'Editar percepciones/deducciones de nómina', 'Autoriza agregar, editar o quitar una percepción o deducción del recibo de un empleado en una nómina en borrador — pide código/rostro cada vez', 1, 1
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'nomina_EditarConceptos' )
LIMIT 1;

-- Menú "Nómina", hijo de "Personal"
INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), M.idMenu, '6', 'Nómina', 'Generación y pago de nómina de empleados', NULL, NULL, 'nominaList', 'assets/img/icons/invFisico.png', '80', '1', '1'
FROM menus AS M
WHERE M.name = 'Personal' AND M.idMenuPadre = 0
AND NOT EXISTS ( SELECT 1 FROM menus WHERE linkList = 'nominaList' )
LIMIT 1;
