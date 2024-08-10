INSERT INTO `db_violetasystem`.`menus`
(`createDate`,
`idMenuPadre`,
`lugar`,
`name`,
`description`,
`icon`,
`linkCat`,
`linkList`,
`imgDash`,
`imgDashSize`,
`idAplication`,
`active`)
SELECT
NOW(),
13,
8,
'Reporte de Pagos',
'Se pueden visualizar los pagos',
'',
'',
'rep_pagos',
'assets/img/icons/repPagos.png',
80,
1,
1;



INSERT INTO `db_violetasystem`.`actions`
(`idAction`,
`createDate`,
`idActionSection`,
`name`,
`nameHtml`,
`description`,
`active`)
SELECT
11517,
NOW(),
1,
'rep_costosProductos',
'Visualizar los costos de los productos en los reportes',
'Con este permiso puedes ver los costos de los productos en los repores',
1;