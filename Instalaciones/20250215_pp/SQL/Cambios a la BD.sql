
SELECT * FROM actionsection;

INSERT INTO `actionsection`
(`idActionSection`,
`sectionName`,
`active`)
SELECT
7,
'Inventario físico',
1;

INSERT INTO `actionsection`
(`idActionSection`,
`sectionName`,
`active`)
SELECT
8,
'General',
1;

SELECT * FROM `actions`;
INSERT INTO `actions`
(`idAction`,
`createDate`,
`idActionSection`,
`name`,
`nameHtml`,
`description`,
`active`)
SELECT
11519,
NOW(),
7,
'invF_CreateBlock',
'Crear inventarios físicos reales',
'Con este permiso puedes crear inventarios físicos Reales que bloquean',
1;


INSERT INTO `actions`
(`idAction`,
`createDate`,
`idActionSection`,
`name`,
`nameHtml`,
`description`,
`active`)
SELECT
11520,
NOW(),
7,
'invF_showCostPrice',
'Mostrar Costos y Precios de los productos en el inventario físico',
'Con este permiso puedes visualizar los costos y los precios en los inventarios físicos',
1;