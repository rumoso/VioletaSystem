

SELECT * FROM menus WHERE idMenuPadre = 1;

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
VALUES (NULL, NOW(), '1', '7', 'Taller', 'Listado de taller', NULL, NULL, 'tallerList', 'assets/img/icons/tallerIco.gif', '80', '1', '1');
