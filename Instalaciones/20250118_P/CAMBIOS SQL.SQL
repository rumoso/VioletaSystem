
**** EN SARITA

SELECT * FROM products ORDER BY idProduct;
UPDATE products SET idProduct = 0 where idProduct = 1;

SELECT * FROM MENUS;
UPDATE menus SET imgDashSize = 80 WHERE NAME = 'Clientes' AND idMenu = 4;
UPDATE menus SET imgDashSize = 80 WHERE NAME = 'Productos' AND idMenu = 5;
UPDATE menus SET imgDashSize = 80 WHERE NAME = 'Usuarios' AND idMenu = 9;
UPDATE menus SET imgDashSize = 80 WHERE NAME = 'Roles' AND idMenu = 17;