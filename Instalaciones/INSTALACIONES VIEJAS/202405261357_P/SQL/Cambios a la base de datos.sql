CREATE TABLE IF NOT EXISTS `db_violetasystem`.`ingresos` (
  `keyx` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `idIngreso` VARCHAR(100) NOT NULL,
  `createDate` DATETIME NULL DEFAULT NULL,
  `idCaja` BIGINT(20) NULL DEFAULT NULL,
  `idFormaPago` INT(11) NULL DEFAULT NULL,
  `description` VARCHAR(500) NULL DEFAULT NULL,
  `amount` FLOAT(11) NULL DEFAULT NULL,
  `idUser` BIGINT(20) NULL DEFAULT NULL,
  `active` SMALLINT(6) NULL DEFAULT NULL,
  PRIMARY KEY (`idIngreso`),
  UNIQUE INDEX `keyx_UNIQUE` (`keyx` ASC),
  INDEX `fk_ingresos_cajas_idx` (`idCaja` ASC),
  INDEX `fk_ingresos_forma_pago_idx` (`idFormaPago` ASC),
  INDEX `fk_ingresos_users1_idx` (`idUser` ASC),
  CONSTRAINT `fk_ingresos_cajas`
    FOREIGN KEY (`idCaja`)
    REFERENCES `db_violetasystem`.`cajas` (`idCaja`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_ingresos_forma_pago`
    FOREIGN KEY (`idFormaPago`)
    REFERENCES `db_violetasystem`.`forma_pago` (`idFormaPago`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_ingresos_users1`
    FOREIGN KEY (`idUser`)
    REFERENCES `db_violetasystem`.`users` (`idUser`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

CREATE TABLE IF NOT EXISTS `db_violetasystem`.`cortecaja_ingresos` (
  `idCorteCajaIngresos` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `idSucursal` INT(11) NOT NULL,
  `idCorteCaja` VARCHAR(100) NULL DEFAULT NULL,
  `idCaja` BIGINT(20) NULL DEFAULT NULL,
  `idIngreso` VARCHAR(100) NULL DEFAULT NULL,
  PRIMARY KEY (`idCorteCajaIngresos`, `idSucursal`),
  INDEX `fk_cc_ingresos_idx` (`idCorteCaja` ASC),
  INDEX `fk_cc_cajas_idx` (`idCaja` ASC),
  INDEX `fk_cci_ingresos_idx` (`idIngreso` ASC),
  CONSTRAINT `fk_cci_cortecaja`
    FOREIGN KEY (`idCorteCaja`)
    REFERENCES `db_violetasystem`.`corte_caja` (`idCorteCaja`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_cci_cajas`
    FOREIGN KEY (`idCaja`)
    REFERENCES `db_violetasystem`.`cajas` (`idCaja`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_cci_ingresos`
    FOREIGN KEY (`idIngreso`)
    REFERENCES `db_violetasystem`.`ingresos` (`idIngreso`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;



INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
VALUES (NULL, '2024-05-26 18:50:52', '1', '5', 'Ingresos', 'Listado de ingresos', NULL, NULL, 'ingresosList', 'assets/img/icons/ingresosIco.png', '80', '1', '1');