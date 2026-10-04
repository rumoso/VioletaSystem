-- ============================================================
-- ENCARGADO DE TALLER Y BLOQUEO DEL FOLIO
-- (analisis/029-encargado-de-taller-y-bloqueo.md, T1)
--
-- - Estatus nuevo "Encargado de taller" entre Asignado y
--   Finalizado/Mostrador. Se agrega con **id 8** y el orden lo da la
--   columna `orden`: renumerar 4-7 obligaría a mover
--   `taller.idTallerStatus`, `taller_firmas_status` y la bitácora de
--   cada folio.
--     1 Cotización(1) · 2 Pedido(2) · 3 Asignado(3) · 8 ENCARGADO(4) ·
--     4 Finalizado/Mostrador(5) · 5 Entregado(6) · 6 Devolución(7) ·
--     7 Cancelado(8)
-- - Tipo de rol 4 "Encargados de taller" (catálogo de 018) y el puesto
--   "Encargado de taller" con ese tipo. Quién es el encargado de un
--   folio = puesto de ese tipo + la sucursal del folio en
--   `sucursalesconfig`.
-- - Acciones nuevas: pasar a encargado, aceptar en lugar del encargado
--   (especial) y desbloquear un folio (especial).
-- - Se retira `tall_EditAfterEntregado`: un folio entregado ya no se
--   modifica, solo admite devolución o cancelación.
--
-- Aplica en LOCAL y PRODUCCIÓN. Idempotente.
-- ============================================================

-- ── 1) Estatus "Encargado de taller" ──
SET @x = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'taller_status_cat' AND COLUMN_NAME = 'orden' );
SET @s = IF(@x = 0,
  'ALTER TABLE `taller_status_cat` ADD COLUMN `orden` INT NULL COMMENT ''lugar en el flujo; los ids no se renumeran'' AFTER `nombre`',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO `taller_status_cat` (idTallerStatus, createDate, nombre, description, active)
SELECT 8, NOW(), 'Encargado de taller', 'El técnico terminó y el encargado de la sucursal revisa antes de pasar a mostrador', 1
WHERE NOT EXISTS ( SELECT 1 FROM ( SELECT idTallerStatus FROM `taller_status_cat` WHERE idTallerStatus = 8 ) AS X );

UPDATE `taller_status_cat` SET orden = CASE idTallerStatus
    WHEN 1 THEN 1   -- Cotización
    WHEN 2 THEN 2   -- Pedido de taller
    WHEN 3 THEN 3   -- Asignado
    WHEN 8 THEN 4   -- Encargado de taller
    WHEN 4 THEN 5   -- Finalizado/Mostrador
    WHEN 5 THEN 6   -- Entregado
    WHEN 6 THEN 7   -- Devolución
    WHEN 7 THEN 8   -- Cancelado
    ELSE orden END
WHERE idTallerStatus IN (1, 2, 3, 4, 5, 6, 7, 8);

-- ── 2) Tipo de rol y puesto del encargado ──
INSERT INTO `roles_tipo` (idTipoRol, clave, nombre, active) VALUES
  (4, 'ENCARGADO_TALLER', 'Encargados de taller', 1)
ON DUPLICATE KEY UPDATE clave = VALUES(clave), nombre = VALUES(nombre), active = 1;

DROP PROCEDURE IF EXISTS `tmp_insert_puesto_encargado`;

DELIMITER $$

CREATE PROCEDURE `tmp_insert_puesto_encargado`()
BEGIN

    DECLARE v_idUserC BIGINT;

    IF NOT EXISTS ( SELECT 1 FROM roles WHERE name = 'Encargado de taller' ) THEN
        SET v_idUserC = ( SELECT MIN(idUser) FROM users );
        CALL getIDKeyByUserWithOUT( v_idUserC, @idNewEncargado );
        INSERT INTO roles ( idRol, createDate, name, description, idTipoRol, bSistema, active )
        VALUES ( @idNewEncargado, NOW(), 'Encargado de taller',
                 'Revisa el trabajo del técnico y acepta el folio antes de que pase a mostrador.', 4, 0, 1 );
    ELSE
        UPDATE roles SET idTipoRol = 4 WHERE name = 'Encargado de taller';
    END IF;

END$$

DELIMITER ;

CALL `tmp_insert_puesto_encargado`();
DROP PROCEDURE IF EXISTS `tmp_insert_puesto_encargado`;

-- ── 3) Acciones ──
-- El técnico manda el folio a revisión del encargado.
INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_PasarAEncargado', 'Pasar taller a encargado',
       'Permite mandar el folio del técnico a revisión del encargado de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM ( SELECT idAction FROM actions WHERE name = 'tall_PasarAEncargado' ) AS X )
LIMIT 1;

-- Aceptar o editar en lugar del encargado de la sucursal (código/rostro).
INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_AceptarComoEncargado', 'Aceptar taller como encargado',
       'Autorización especial para revisar, editar y aceptar un folio en lugar del encargado de la sucursal', 1, 1
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM ( SELECT idAction FROM actions WHERE name = 'tall_AceptarComoEncargado' ) AS X )
LIMIT 1;

-- Regresar de estatus un folio bloqueado (código/rostro).
INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_DesbloquearTaller', 'Desbloquear taller (regresar estatus)',
       'Autorización especial para regresar un folio bloqueado hasta Pedido de taller; reversa metal final y destajo', 1, 1
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM ( SELECT idAction FROM actions WHERE name = 'tall_DesbloquearTaller' ) AS X )
LIMIT 1;

UPDATE actions SET nSpecial = 1 WHERE name IN ('tall_AceptarComoEncargado', 'tall_DesbloquearTaller');
UPDATE actions SET nSpecial = 0 WHERE name = 'tall_PasarAEncargado';

-- ── 4) Retiro de tall_EditAfterEntregado ──
-- Un folio entregado ya no se modifica: solo devolución o cancelación.
DELETE AC FROM actionsconf AS AC
INNER JOIN actions AS A ON A.idAction = AC.idAction
WHERE A.name = 'tall_EditAfterEntregado';

DELETE FROM actions WHERE name = 'tall_EditAfterEntregado';
