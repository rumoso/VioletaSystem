-- ══════════════════════════════════════════════════════════════
-- PERMISO PARA ELIMINAR TALLERES VACIOS (analisis/022)
--
-- `tall_DeleteVacio` ya existe como accion (la crea
-- `insert_actions_taller.sql`), pero no estaba asignada a nadie: sin
-- ella, un folio sin nada capturado no se puede borrar y el servidor
-- responde que hace falta el permiso.
--
-- Se asigna a Admin y CEO (Ruben, 2026-10-04). Idempotente.
-- ══════════════════════════════════════════════════════════════

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT NOW(), 'R', R.idRol, A.idAction, 1
FROM roles AS R
CROSS JOIN actions AS A
WHERE R.name IN ('Admin', 'CEO')
  AND A.name = 'tall_DeleteVacio'
  AND NOT EXISTS (
      SELECT 1 FROM actionsconf AS AC
      WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction
  );

-- Si alguien ya la tenia desactivada, se reactiva.
UPDATE actionsconf AS AC
INNER JOIN actions AS A ON A.idAction = AC.idAction
INNER JOIN roles AS R ON R.idRol = AC.idRelation
SET AC.active = 1
WHERE AC.relationType = 'R'
  AND A.name = 'tall_DeleteVacio'
  AND R.name IN ('Admin', 'CEO');

SELECT R.idRol, R.name AS puesto, A.name AS accion, AC.active
FROM actionsconf AS AC
INNER JOIN actions AS A ON A.idAction = AC.idAction
INNER JOIN roles AS R ON R.idRol = AC.idRelation
WHERE AC.relationType = 'R' AND A.name = 'tall_DeleteVacio';
