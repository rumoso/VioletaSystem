-- ============================================================
-- Comisiones: capturar/cancelar pasan a ser acciones ESPECIALES
-- (nSpecial=1) — requieren código de autorización de un usuario con
-- el permiso, capturado al momento de la acción (patrón
-- ActionAuthorizationComponent, igual que opera_CancelarComision e
-- inv_Delete). Idempotente (UPDATE simple, seguro de re-ejecutar).
-- ============================================================

UPDATE actions SET nSpecial = 1 WHERE name IN ('comisiones_Capturar', 'comisiones_Cancelar');
