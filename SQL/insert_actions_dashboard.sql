-- ============================================================
-- ACCIONES DEL PANEL DEL DIRECTOR
-- (analisis/014-dashboard-directivo.md). Idempotente.
--
-- No hay menú que insertar: el panel VIVE en la pantalla de inicio
-- (`dashboard`), que todo usuario ya tiene al entrar. Lo que estas dos
-- acciones controlan es CUÁNTO de esa pantalla se llena.
--
-- Son dos y no una a propósito:
--   dashboard_VerPanel  — ver el panel con datos de negocio.
--   dashboard_VerCostos — además, ver costo, utilidad y margen.
-- Un vendedor puede necesitar ver su actividad del día sin ver el
-- costo del inventario ni la utilidad global de la empresa.
--
-- Ambas nSpecial=0: son permiso simple del usuario logueado, no
-- acciones que pidan código/rostro en el momento.
-- ============================================================

-- La sección "Ventas" ya existe en vivo desde antes de este repo
-- (idActionSection=1); se usa esa, no se crea ninguna nueva.

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'dashboard_VerPanel', 'Ver panel del director', 'Muestra en la pantalla de inicio la situación del negocio: cartera, inventario, venta y cobranza del día, del mes y operación', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Ventas'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'dashboard_VerPanel' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'dashboard_VerCostos', 'Ver costos y utilidad en el panel', 'Permite ver costo de lo vendido, utilidad y margen dentro del panel del director (permiso restringido) — sin él esos datos no se envían al navegador', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Ventas'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'dashboard_VerCostos' )
LIMIT 1;

-- ============================================================
-- Asignación a roles: se hace desde la pantalla de roles, no aquí.
-- `dashboard_VerCostos` debe quedar bastante más restringida que
-- `dashboard_VerPanel`.
-- ============================================================
