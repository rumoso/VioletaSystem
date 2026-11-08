-- ============================================================
-- CATÁLOGO DE CONSTANTES DEL SISTEMA
-- (analisis/040-catalogo-de-constantes.md). Idempotente: se puede correr
-- más de una vez sin duplicar nada.
--
-- Misma estructura que la tabla `constantes` de AgroEnvases. Valores que
-- se cambian sin tocar código; el Back siempre tiene un default por si
-- una constante falta o está inactiva.
--
--   config_ConstantesModificar — crear, editar, activar/desactivar y
--   eliminar constantes. El SERVIDOR la revisa en cada endpoint.
-- ============================================================

CREATE TABLE IF NOT EXISTS `constantes` (
  `idConstante`  INT NOT NULL AUTO_INCREMENT,
  `createDate`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active`       SMALLINT NOT NULL DEFAULT 1,
  `idCreateUser` BIGINT NOT NULL,
  `sKey`         VARCHAR(100) NOT NULL,
  `sValue`       VARCHAR(500) NOT NULL,
  `sValue2`      VARCHAR(500) NULL DEFAULT NULL,
  `sValue3`      VARCHAR(500) NULL DEFAULT NULL,
  `sValue4`      VARCHAR(500) NULL DEFAULT NULL,
  PRIMARY KEY (`idConstante`),
  UNIQUE KEY `ux_constantes_sKey` (`sKey`),
  KEY `fk_constantes_users_idx` (`idCreateUser`),
  CONSTRAINT `fk_constantes_users` FOREIGN KEY (`idCreateUser`) REFERENCES `users` (`idUser`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Constantes iniciales (analisis/039) ──
-- Quien las crea: el primer usuario con rol Admin.
SET @idAdmin = ( SELECT RC.idUser FROM rolesconfig AS RC INNER JOIN roles AS R ON R.idRol = RC.idRol WHERE R.name = 'Admin' ORDER BY RC.idUser LIMIT 1 );

INSERT INTO constantes (createDate, active, idCreateUser, sKey, sValue, sValue2)
SELECT NOW(), 1, @idAdmin, 'FACIAL_EVIDENCIA_ACTIVA', '1', 'Bitácora Facial: 1 guarda la miniatura de evidencia (SIN_VIDA y marcajes del checador), 0 no guarda'
FROM DUAL
WHERE @idAdmin IS NOT NULL AND NOT EXISTS ( SELECT 1 FROM constantes WHERE sKey = 'FACIAL_EVIDENCIA_ACTIVA' );

INSERT INTO constantes (createDate, active, idCreateUser, sKey, sValue, sValue2)
SELECT NOW(), 1, @idAdmin, 'FACIAL_EVIDENCIA_DIAS', '30', 'Bitácora Facial: días que se conserva la miniatura de evidencia'
FROM DUAL
WHERE @idAdmin IS NOT NULL AND NOT EXISTS ( SELECT 1 FROM constantes WHERE sKey = 'FACIAL_EVIDENCIA_DIAS' );

-- ── Acción ──
INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'config_ConstantesModificar', 'Modificar constantes del sistema', 'Permite crear, editar, activar, desactivar y eliminar constantes del sistema', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'General'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'config_ConstantesModificar' )
LIMIT 1;

-- ── Menú hijo "Constantes" bajo "Configuración" ──
INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), M.idMenu, '3', 'Constantes', 'Catálogo de constantes configurables del sistema', NULL, NULL, 'constanteList', NULL, NULL, '1', '1'
FROM menus AS M
WHERE M.name = 'Configuración' AND M.idMenuPadre = 0
AND NOT EXISTS ( SELECT 1 FROM menus WHERE linkList = 'constanteList' )
LIMIT 1;

-- ── Permiso de MENÚ para Admin ──
-- `menupermisos.idMenuPermiso` lo genera el SP `insertMenuPermisoByIdRelation`
-- (no es idempotente): va en un PREPARE/EXECUTE condicional.
SET @idMenuConstantes = ( SELECT idMenu FROM menus WHERE linkList = 'constanteList' LIMIT 1 );
SET @idRol = ( SELECT idRol FROM roles WHERE name = 'Admin' LIMIT 1 );
SET @existe = ( SELECT COUNT(*) FROM menupermisos WHERE typeRelation = 'R' AND idRelation = @idRol AND idMenu = @idMenuConstantes );
SET @sql_mp = IF(@existe = 0 AND @idRol IS NOT NULL AND @idMenuConstantes IS NOT NULL,
  CONCAT('CALL insertMenuPermisoByIdRelation(''R'', ', @idRol, ', ', @idMenuConstantes, ', 1)'),
  'SELECT 1');
PREPARE stmt FROM @sql_mp;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── Permiso de la ACCIÓN para Admin ──
INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT NOW(), 'R', R.idRol, A.idAction, 1
FROM roles AS R
CROSS JOIN actions AS A
WHERE R.name = 'Admin'
  AND A.name = 'config_ConstantesModificar'
  AND NOT EXISTS (
      SELECT 1 FROM actionsconf AS AC
      WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction
  );
