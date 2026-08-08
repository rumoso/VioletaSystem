-- ============================================================
-- ACCIONES Y MENÚ DEL INVENTARIO DE METAL
-- (analisis/001-control-inventario-metal.md). Idempotente.
-- ============================================================

-- Acción: transferencias/ajustes manuales (permiso especial)
INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_MetalInvTransferir', 'Transferir inventario de metal', 'Permite registrar entradas, traspasos y ajustes manuales del inventario de metal (sucursal/técnico)', 1, 1
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_MetalInvTransferir' )
LIMIT 1;

-- Acción: consultar saldos y kardex
INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_MetalInvVer', 'Ver inventario de metal', 'Permite consultar los saldos y el kardex del inventario de metal', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_MetalInvVer' )
LIMIT 1;

-- Menú: pantalla de inventario de metal
INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), '1', '7', 'Inventario Metal', 'Saldos y kardex del inventario de metal', NULL, NULL, 'inventarioMetal', 'assets/img/icons/invFisico.png', '80', '1', '1'
WHERE NOT EXISTS ( SELECT 1 FROM menus WHERE linkList = 'inventarioMetal' );
