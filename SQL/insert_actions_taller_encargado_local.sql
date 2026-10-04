-- ============================================================
-- ASIGNACIÓN DE LAS ACCIONES DEL 029 — SOLO LOCAL (pruebas)
--
-- En producción esto se hace desde la pantalla de Puestos, decidiendo a
-- qué puestos les toca cada acción. Aquí se copia el criterio que ya
-- tienen las acciones del flujo de taller, para poder probar sin pasar
-- por la pantalla:
--   · tall_PasarAEncargado      → a quien ya puede asignar (tall_AssignOrder)
--   · tall_AceptarComoEncargado → a quien ya puede finalizar (tall_FinalizeOrder)
--   · tall_DesbloquearTaller    → a quien ya puede cancelar un taller
--     (ventas_CancelarTaller), que es el permiso más restringido
--
-- Idempotente.
-- ============================================================

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT NOW(), AC.relationType, AC.idRelation, ANUEVA.idAction, 1
FROM actionsconf AS AC
INNER JOIN actions AS AVIEJA ON AVIEJA.idAction = AC.idAction AND AVIEJA.name = 'tall_AssignOrder'
INNER JOIN actions AS ANUEVA ON ANUEVA.name = 'tall_PasarAEncargado'
WHERE AC.active = 1
AND NOT EXISTS (
    SELECT 1 FROM ( SELECT relationType, idRelation, idAction FROM actionsconf ) AS X
    WHERE X.relationType = AC.relationType AND X.idRelation = AC.idRelation AND X.idAction = ANUEVA.idAction
);

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT NOW(), AC.relationType, AC.idRelation, ANUEVA.idAction, 1
FROM actionsconf AS AC
INNER JOIN actions AS AVIEJA ON AVIEJA.idAction = AC.idAction AND AVIEJA.name = 'tall_FinalizeOrder'
INNER JOIN actions AS ANUEVA ON ANUEVA.name = 'tall_AceptarComoEncargado'
WHERE AC.active = 1
AND NOT EXISTS (
    SELECT 1 FROM ( SELECT relationType, idRelation, idAction FROM actionsconf ) AS X
    WHERE X.relationType = AC.relationType AND X.idRelation = AC.idRelation AND X.idAction = ANUEVA.idAction
);

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT NOW(), AC.relationType, AC.idRelation, ANUEVA.idAction, 1
FROM actionsconf AS AC
INNER JOIN actions AS AVIEJA ON AVIEJA.idAction = AC.idAction AND AVIEJA.name = 'ventas_CancelarTaller'
INNER JOIN actions AS ANUEVA ON ANUEVA.name = 'tall_DesbloquearTaller'
WHERE AC.active = 1
AND NOT EXISTS (
    SELECT 1 FROM ( SELECT relationType, idRelation, idAction FROM actionsconf ) AS X
    WHERE X.relationType = AC.relationType AND X.idRelation = AC.idRelation AND X.idAction = ANUEVA.idAction
);
