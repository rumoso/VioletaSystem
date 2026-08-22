-- ============================================================
-- ACCIONES DEL PANEL DEL DIRECTOR
-- (analisis/014-dashboard-directivo.md). Idempotente.
--
-- El panel tiene su propia pantalla (`dashboardDirector`) y su propio
-- menú, que este script crea más abajo. Estas dos acciones son la
-- protección del lado del SERVIDOR — el menú solo decide si el renglón
-- aparece.
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
-- MENÚ Y ASIGNACIÓN A ROLES
--
-- El panel dejó de vivir dentro de la pantalla de inicio y ahora es su
-- propia pantalla (`dashboardDirector`). Eso permite que el acceso lo
-- controle el **permiso de menú** —que se le da al CEO y al Admin— en
-- vez de aparecerle a todo el que entra al sistema.
--
-- Las dos acciones siguen existiendo y siguen haciendo falta: el menú
-- solo decide si el renglón se ve, mientras que las acciones son las
-- que el SERVIDOR revisa en cada endpoint. Un menú escondido no
-- protege un endpoint abierto.
-- ============================================================

-- Las descripciones de las acciones hablaban de la pantalla de inicio.
UPDATE actions
SET description = 'Permite abrir el panel del director y ver la situación del negocio: cartera, inventario, venta y cobranza del día, del mes y operación'
WHERE name = 'dashboard_VerPanel';

-- Menú padre "Dirección". lugar 0 para que quede arriba de "Ventas"
-- (lugar 1) — es lo primero que abre el dueño.
INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), 0, '0', 'Dirección', 'Información directiva del negocio', NULL, NULL, NULL, NULL, NULL, '1', '1'
FROM DUAL
WHERE NOT EXISTS ( SELECT 1 FROM menus WHERE name = 'Dirección' AND idMenuPadre = 0 );

-- Menú hijo "Panel del director".
INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), M.idMenu, '1', 'Panel del director', 'La situación del negocio en una pantalla', NULL, NULL, 'dashboardDirector', 'assets/img/icons/inffinanciera.png', '80', '1', '1'
FROM menus AS M
WHERE M.name = 'Dirección' AND M.idMenuPadre = 0
AND NOT EXISTS ( SELECT 1 FROM menus WHERE linkList = 'dashboardDirector' )
LIMIT 1;

-- ── Permiso de MENÚ para Admin y CEO ──
-- Los renglones de `menupermisos` van sobre el menú HIJO: el padre se
-- deduce solo (ver getMenuFathersByPermission).
--
-- OJO: `menupermisos.idMenuPermiso` NO es auto_increment. El id lo
-- genera `getIDKeyByUserWithOUT`, que lleva un contador por usuario en
-- `ids_by_user` y devuelve CONCAT(idUser, contador) — así dos
-- sucursales pueden insertar sin coordinarse y sin chocar. Por eso
-- aquí se llama al SP `insertMenuPermisoByIdRelation` del propio
-- sistema en vez de armar un INSERT a mano con MAX+1, que sí podría
-- pisar el rango de otra sucursal.
--
-- El SP no es idempotente, así que la llamada va envuelta en el patrón
-- PREPARE/EXECUTE condicional que ya usan los demás scripts.

SET @idMenuPanel = ( SELECT idMenu FROM menus WHERE linkList = 'dashboardDirector' LIMIT 1 );

-- Admin
SET @idRol = ( SELECT idRol FROM roles WHERE name = 'Admin' LIMIT 1 );
SET @existe = ( SELECT COUNT(*) FROM menupermisos WHERE typeRelation = 'R' AND idRelation = @idRol AND idMenu = @idMenuPanel );
SET @sql_mp = IF(@existe = 0 AND @idRol IS NOT NULL AND @idMenuPanel IS NOT NULL,
  CONCAT('CALL insertMenuPermisoByIdRelation(''R'', ', @idRol, ', ', @idMenuPanel, ', 1)'),
  'SELECT 1');
PREPARE stmt FROM @sql_mp;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- CEO
SET @idRol = ( SELECT idRol FROM roles WHERE name = 'CEO' LIMIT 1 );
SET @existe = ( SELECT COUNT(*) FROM menupermisos WHERE typeRelation = 'R' AND idRelation = @idRol AND idMenu = @idMenuPanel );
SET @sql_mp = IF(@existe = 0 AND @idRol IS NOT NULL AND @idMenuPanel IS NOT NULL,
  CONCAT('CALL insertMenuPermisoByIdRelation(''R'', ', @idRol, ', ', @idMenuPanel, ', 1)'),
  'SELECT 1');
PREPARE stmt FROM @sql_mp;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── Permiso de ACCIÓN para Admin y CEO ──
-- Las dos: sin `dashboard_VerPanel` el servidor no contesta, y sin
-- `dashboard_VerCostos` contesta pero sin costo, utilidad ni margen.
INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT NOW(), 'R', R.idRol, A.idAction, 1
FROM roles AS R
CROSS JOIN actions AS A
WHERE R.name IN ('Admin', 'CEO')
  AND A.name IN ('dashboard_VerPanel', 'dashboard_VerCostos')
  AND NOT EXISTS (
      SELECT 1 FROM actionsconf AS AC
      WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction
  );
