-- ============================================================
-- RETIRO DE LOS TRIGGERS DE `metal_inventario` (2026-09-12)
--
-- El proyecto no usa triggers: toda validación vive en código
-- (SPs/controllers). Los dos triggers de alter_metal_inventario_guard.sql
-- se reemplazan por la validación dentro de `metalInventario_apply`
-- (StoreProcedures_MetalInventario.sql), que es el ÚNICO punto por el que
-- se escribe `metal_inventario`, y por el helper `_fn_metalInventarioApply`
-- de salesController.js.
--
-- Orden: primero redefinir `metalInventario_apply` (correr
-- StoreProcedures_MetalInventario.sql), luego este script.
--
-- Idempotente.
-- ============================================================

DROP TRIGGER IF EXISTS `trg_metal_inventario_valida_bi`;
DROP TRIGGER IF EXISTS `trg_metal_inventario_valida_bu`;
