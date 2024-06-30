CREATE TABLE IF NOT EXISTS `db_violetasystem`.`sobre_taller_status` (
  `idSobreTallerStatus` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `createDate` DATETIME NULL DEFAULT NULL,
  `updateDate` DATETIME NULL DEFAULT NULL,
  `idSale` VARCHAR(100) NULL DEFAULT NULL,
  `idStatusSobre` INT(11) NULL DEFAULT NULL,
  `idUser` BIGINT(20) NULL DEFAULT NULL,
  PRIMARY KEY (`idSobreTallerStatus`),
  INDEX `idSale_tallerStatus` (`idSale` ASC))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

ALTER TABLE `db_violetasystem`.`sales` 
ADD INDEX `idSale_sales_INDX` (`idSale` ASC);

ALTER TABLE `db_violetasystem`.`payments` 
ADD INDEX `idRelation_payment_INDX` (`idRelation` ASC),
ADD INDEX `idRelation_type_payment_INDX` (`idRelation` ASC, `relationType` ASC);


INSERT INTO `sobre_status_cat` (`idStatusSobre`, `createDate`, `nombre`, `description`, `active`)
VALUES
(NULL, '2024-05-19 13:25:01', 'En espera', 'Estatus que se coloca al iniciar el sobre de taller', '1')
, (NULL, '2024-05-19 13:25:01', 'En oficina', 'Estatus que se coloca cuando pasa a la oficina', '1')
, (NULL, '2024-05-19 13:25:01', 'En proceso', 'Estatus cuando el sobre está en el proceso de taller', '1')
, (NULL, '2024-05-19 13:25:01', 'Terminado', 'Cuando el sobre está terminado', '1')
, (NULL, '2024-05-19 13:25:01', 'Entregado', 'Cuando ya se entregó al cliente', '1')
;

CREATE TABLE IF NOT EXISTS `db_violetasystem`.`autorizaciones2` (
          `idAutorizacion` BIGINT(20) NOT NULL AUTO_INCREMENT,
          `idSucursal` INT(11) NOT NULL,
          `createDate` DATETIME NULL DEFAULT NULL,
          `idRelation` VARCHAR(100) NULL DEFAULT NULL,
          `idRelation2` VARCHAR(100) NULL DEFAULT NULL,
          `relationType` VARCHAR(500) NULL DEFAULT NULL,
          `idUser` BIGINT(20) NULL DEFAULT NULL,
          `bAutorice` SMALLINT(6) NULL DEFAULT NULL,
          `description` VARCHAR(5000) NULL DEFAULT NULL,
          `active` SMALLINT(6) NULL DEFAULT NULL,
          PRIMARY KEY (`idAutorizacion`, `idSucursal`))
        ENGINE = InnoDB
        DEFAULT CHARACTER SET = utf8