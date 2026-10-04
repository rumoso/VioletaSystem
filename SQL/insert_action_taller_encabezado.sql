-- ============================================================
-- ENCABEZADO DEL TALLER: CONGELADO DESDE PEDIDO
-- (analisis/029-encargado-de-taller-y-bloqueo.md, punto 7 · T13)
--
-- Mientras el folio es Cotización el encabezado se edita libremente. Al
-- convertirse en Pedido de taller, el CLIENTE, el VENDEDOR y la FECHA DE
-- INGRESO quedan fijos: identifican el folio y el compromiso con el
-- cliente. La descripción y la fecha prometida siguen editables hasta el
-- bloqueo general de Finalizado/Mostrador.
--
-- La única salida es esta acción especial (código o rostro al momento),
-- pensada para corregir una captura mal hecha — no para mover un trabajo
-- de un cliente a otro: para eso se cancela el folio y se levanta uno
-- nuevo.
--
-- Aplica en LOCAL y PRODUCCIÓN. Idempotente.
-- ============================================================

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_EditEncabezadoBloqueado', 'Editar cliente/vendedor/fecha de un taller',
       'Autorización especial para corregir el cliente, el vendedor o la fecha de ingreso de un folio que ya no es cotización', 1, 1
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM ( SELECT idAction FROM actions WHERE name = 'tall_EditEncabezadoBloqueado' ) AS X )
LIMIT 1;

UPDATE actions SET nSpecial = 1, active = 1 WHERE name = 'tall_EditEncabezadoBloqueado';

-- Solo Local: darle la acción a quien ya puede cancelar un taller, que es
-- el permiso más restringido del módulo. En producción se asigna desde la
-- pantalla de Puestos.
INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT NOW(), AC.relationType, AC.idRelation, ANUEVA.idAction, 1
FROM actionsconf AS AC
INNER JOIN actions AS AVIEJA ON AVIEJA.idAction = AC.idAction AND AVIEJA.name = 'ventas_CancelarTaller'
INNER JOIN actions AS ANUEVA ON ANUEVA.name = 'tall_EditEncabezadoBloqueado'
WHERE AC.active = 1
AND NOT EXISTS (
    SELECT 1 FROM ( SELECT relationType, idRelation, idAction FROM actionsconf ) AS X
    WHERE X.relationType = AC.relationType AND X.idRelation = AC.idRelation AND X.idAction = ANUEVA.idAction
);
