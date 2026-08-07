-- Registra la acción inv_Delete (eliminar inventario físico en
-- inventarioFisicoList) en la misma sección de acciones que ya usa
-- inv_CrearInventarioFisico, para esa misma pantalla.
-- nSpecial = 1: al ser una eliminación física, solo Admin/CEO puede
-- asignar este permiso a un rol (mismo criterio que otras acciones
-- sensibles ya marcadas como especiales).
-- Idempotente: si ya existe una acción 'inv_Delete', o si no existe
-- 'inv_CrearInventarioFisico' para tomar la sección, no inserta nada.

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), A.idActionSection, 'inv_Delete', 'inv_Delete', 'Eliminar inventario físico', 1, 1
FROM actions AS A
WHERE A.name = 'inv_CrearInventarioFisico'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'inv_Delete' )
LIMIT 1;
