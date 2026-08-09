-- ============================================================
-- ACCIONES Y MENÚS DE LOS CATÁLOGOS DE PERSONAL
-- Técnicos y Vendedores (analisis/005) + Empleados y Conceptos de
-- Nómina (analisis/006). Idempotente.
-- ============================================================

-- Sección de acciones "Personal" (idActionSection es PK manual, sin
-- auto_increment — se calcula MAX+1 desde una tabla derivada)
INSERT INTO actionsection (idActionSection, sectionName, iLugar, active)
SELECT X.nextId, 'Personal', X.nextId, 1
FROM ( SELECT IFNULL(MAX(idActionSection),0)+1 AS nextId FROM actionsection ) AS X
WHERE NOT EXISTS ( SELECT 1 FROM actionsection WHERE sectionName = 'Personal' );

-- Acciones de técnicos
INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tecnicos_CrearModificar', 'Crear/modificar técnicos', 'Permite crear y modificar registros del catálogo de técnicos', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tecnicos_CrearModificar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tecnicos_Inactivar', 'Inactivar/activar técnicos', 'Permite inactivar (eliminación lógica) y reactivar técnicos', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tecnicos_Inactivar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tecnicos_Eliminar', 'Eliminar técnicos definitivamente', 'Permite la eliminación física de técnicos sin referencias históricas (permiso restringido)', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tecnicos_Eliminar' )
LIMIT 1;

-- Acciones de vendedores
INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'vendedores_CrearModificar', 'Crear/modificar vendedores', 'Permite crear y modificar registros del catálogo de vendedores', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'vendedores_CrearModificar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'vendedores_Inactivar', 'Inactivar/activar vendedores', 'Permite inactivar (eliminación lógica) y reactivar vendedores', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'vendedores_Inactivar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'vendedores_Eliminar', 'Eliminar vendedores definitivamente', 'Permite la eliminación física de vendedores sin referencias históricas (permiso restringido)', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'vendedores_Eliminar' )
LIMIT 1;

-- Menú padre "Personal" (entre Operación y Reportes)
INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), '0', '25', 'Personal', 'Catálogos de personal (técnicos, vendedores, empleados)', NULL, NULL, NULL, NULL, NULL, '1', '1'
WHERE NOT EXISTS ( SELECT 1 FROM menus WHERE name = 'Personal' AND idMenuPadre = 0 );

-- Menús hijos: Técnicos y Vendedores
INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), M.idMenu, '1', 'Técnicos', 'Catálogo de técnicos del taller', NULL, NULL, 'tecnicosList', 'assets/img/icons/invFisico.png', '80', '1', '1'
FROM menus AS M
WHERE M.name = 'Personal' AND M.idMenuPadre = 0
AND NOT EXISTS ( SELECT 1 FROM menus WHERE linkList = 'tecnicosList' )
LIMIT 1;

INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), M.idMenu, '2', 'Vendedores', 'Catálogo de vendedores', NULL, NULL, 'vendedoresList', 'assets/img/icons/invFisico.png', '80', '1', '1'
FROM menus AS M
WHERE M.name = 'Personal' AND M.idMenuPadre = 0
AND NOT EXISTS ( SELECT 1 FROM menus WHERE linkList = 'vendedoresList' )
LIMIT 1;
