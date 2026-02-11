-- Insertar nuevo menú para Taller en la sección de Ventas
INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
VALUES (NULL, NOW(), '1', '6', 'Taller', 'Listado de taller', NULL, NULL, 'tallerList', 'assets/img/icons/tallerIco.png', '80', '1', '1');
