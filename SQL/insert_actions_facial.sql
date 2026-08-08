-- ============================================================
-- ACCIONES Y MENÚ DE RECONOCIMIENTO FACIAL
-- (analisis/004-reconocimiento-facial.md). Idempotente.
-- ============================================================

-- Acción especial: autorizar manualmente cuando falla el reconocimiento
-- o no hay cámara disponible (fallback, patrón ActionAuthorizationComponent)
INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'gral_FacialAutorizarManual', 'Autorizar manualmente verificacion facial', 'Permite continuar sin coincidencia de rostro o sin cámara disponible, autorizando manualmente', 1, 1
FROM actionsection AS S
WHERE S.sectionName = 'General'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'gral_FacialAutorizarManual' )
LIMIT 1;

-- Menú: bitácora de verificaciones faciales
INSERT INTO menus (createDate, idMenuPadre, lugar, name, description, icon, linkCat, linkList, imgDash, imgDashSize, idAplication, active)
SELECT NOW(), '1', '8', 'Bitácora Facial', 'Historial de verificaciones e identificaciones faciales', NULL, NULL, 'facialLog', 'assets/img/icons/invFisico.png', '80', '1', '1'
WHERE NOT EXISTS ( SELECT 1 FROM menus WHERE linkList = 'facialLog' );
