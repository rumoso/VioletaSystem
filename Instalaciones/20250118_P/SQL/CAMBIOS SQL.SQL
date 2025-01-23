
**** EN SARITA

SELECT * FROM products ORDER BY idProduct;
UPDATE products SET idProduct = 0 where idProduct = 1;

SELECT * FROM MENUS;
UPDATE menus SET imgDashSize = 80 WHERE NAME = 'Clientes' AND idMenu = 4;
UPDATE menus SET imgDashSize = 80 WHERE NAME = 'Productos' AND idMenu = 5;
UPDATE menus SET imgDashSize = 80 WHERE NAME = 'Usuarios' AND idMenu = 9;
UPDATE menus SET imgDashSize = 80 WHERE NAME = 'Roles' AND idMenu = 17;



INSERT INTO `menus`
(
`createDate`,
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
0,
11,
'Finanzas',
'Sección donde se manejará todo lo referente a las finanzas y contabilidad',
'',
'',
'',
'',
0,
1,
1;


INSERT INTO `menus`
(
`createDate`,
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
30,
1,
'Información financiera',
'Manejo de información financiera',
'',
'',
'inffinanciera',
'assets/img/icons/inffinanciera.png',
80,
1,
1;
