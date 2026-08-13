-- ============================================================
-- ACCIÓN: entregar apartado
-- La sección 'Ventas' ya existe en la BD en vivo (idActionSection=1)
-- pero nunca quedó documentada en un script — este INSERT es
-- idempotente por si se corre contra una BD que no la tenga aún.
-- ============================================================

INSERT INTO actionsection (idActionSection, sectionName, iLugar, active)
SELECT X.nextId, 'Ventas', X.nextId, 1
FROM ( SELECT IFNULL(MAX(idActionSection),0)+1 AS nextId FROM actionsection ) AS X
WHERE NOT EXISTS ( SELECT 1 FROM actionsection WHERE sectionName = 'Ventas' );

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'ventas_EntregarApartado', 'Entregar apartado', 'Autoriza marcar un apartado como entregado — pide código/rostro cada vez', 1, 1
FROM actionsection AS S
WHERE S.sectionName = 'Ventas'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'ventas_EntregarApartado' )
LIMIT 1;
