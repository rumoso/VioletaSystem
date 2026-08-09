-- ============================================================
-- DATOS INICIALES DE EMPLEADOS Y NÓMINA
-- (analisis/006-catalogo-empleados-nomina.md). Idempotente.
-- Conceptos precargados (bSistema=1: se pueden inactivar pero no
-- eliminar físicamente), acciones y menús.
-- ============================================================

-- Conceptos de nómina precargados
INSERT INTO nomina_conceptos (name, tipo, bSistema, active, createDate, idCreateUser)
SELECT * FROM (
    SELECT 'Sueldo base' AS name, 'PERCEPCION' AS tipo, 1 AS bSistema, 1 AS active, NOW() AS createDate, 1 AS idCreateUser UNION ALL
    SELECT 'Bono', 'PERCEPCION', 1, 1, NOW(), 1 UNION ALL
    SELECT 'Bono especial', 'PERCEPCION', 1, 1, NOW(), 1 UNION ALL
    SELECT 'Comisiones', 'PERCEPCION', 1, 1, NOW(), 1 UNION ALL
    SELECT 'Horas extra', 'PERCEPCION', 1, 1, NOW(), 1 UNION ALL
    SELECT 'Pago de préstamo', 'PERCEPCION', 1, 1, NOW(), 1 UNION ALL
    SELECT 'Vacaciones', 'PERCEPCION', 1, 1, NOW(), 1 UNION ALL
    SELECT 'Prima vacacional', 'PERCEPCION', 1, 1, NOW(), 1 UNION ALL
    SELECT 'Aguinaldo', 'PERCEPCION', 1, 1, NOW(), 1 UNION ALL
    SELECT 'Descuento', 'DEDUCCION', 1, 1, NOW(), 1 UNION ALL
    SELECT 'Descuento por falta/retardo', 'DEDUCCION', 1, 1, NOW(), 1 UNION ALL
    SELECT 'Abono de préstamo', 'DEDUCCION', 1, 1, NOW(), 1
) AS X
WHERE NOT EXISTS ( SELECT 1 FROM nomina_conceptos AS N WHERE N.name = X.name );

-- Acciones (sección Personal, creada en insert_actions_catalogos.sql)
INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'empleados_CrearModificar', 'Crear/modificar empleados', 'Permite crear y modificar registros del catálogo de empleados y su listado base de conceptos', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'empleados_CrearModificar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'empleados_Baja', 'Dar de baja/reactivar empleados', 'Permite la baja laboral (desactiva en cascada usuario y catálogos ligados) y la reactivación de empleados', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'empleados_Baja' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'empleados_Eliminar', 'Eliminar empleados definitivamente', 'Permite la eliminación física de empleados sin historial (permiso restringido)', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'empleados_Eliminar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'nominaConceptos_Administrar', 'Administrar conceptos de nómina', 'Permite crear, modificar, inactivar y eliminar conceptos de nómina', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Personal'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'nominaConceptos_Administrar' )
LIMIT 1;

-- Menús (hijos de "Personal", creado en insert_actions_catalogos.sql)
INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), M.idMenu, '3', 'Empleados', 'Catálogo de empleados con datos laborales', NULL, NULL, 'empleadosList', 'assets/img/icons/invFisico.png', '80', '1', '1'
FROM menus AS M
WHERE M.name = 'Personal' AND M.idMenuPadre = 0
AND NOT EXISTS ( SELECT 1 FROM menus WHERE linkList = 'empleadosList' )
LIMIT 1;

INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), M.idMenu, '4', 'Conceptos de Nómina', 'Catálogo de conceptos de nómina (percepciones y deducciones)', NULL, NULL, 'nominaConceptosList', 'assets/img/icons/invFisico.png', '80', '1', '1'
FROM menus AS M
WHERE M.name = 'Personal' AND M.idMenuPadre = 0
AND NOT EXISTS ( SELECT 1 FROM menus WHERE linkList = 'nominaConceptosList' )
LIMIT 1;
