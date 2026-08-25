-- ============================================================
-- GUARDIÁN DE INTEGRIDAD — inventario de metal
-- (analisis/001-control-inventario-metal.md)
--
-- CONTEXTO: `SQL/insert_productos_metal.sql` (T2 de tareas/001) nunca
-- se había ejecutado en esta BD, así que el catálogo METAL-% estaba
-- vacío. A pesar de eso aparecieron renglones en `metal_inventario`
-- apuntando a joyas reales del catálogo normal — imposible por el
-- diseño de `metalInventario_apply` (SIEMPRE resuelve al producto fino
-- para SUCURSAL), así que solo pudo pasar con un INSERT manual directo
-- a la tabla, sin pasar por ningún SP. Una validación dentro de
-- `metalInventario_apply` no habría evitado esto — un INSERT crudo la
-- salta igual. Por eso el guardián va como TRIGGER: es el único
-- mecanismo que se aplica sin importar quién o qué escriba en la tabla.
--
-- Es el primer trigger de este proyecto (todo lo demás usa validación
-- en SPs/controllers). Se justifica porque la validación a nivel
-- aplicación YA existía (en `metalInventario_apply` y en
-- `asignarMetalInventarioByTaller`) y de todos modos se pudo saltar.
--
-- Reglas que impone, en cualquier INSERT o UPDATE sobre
-- `metal_inventario`, venga de donde venga:
--   1) El producto SIEMPRE debe ser del catálogo de metal (barCode
--      'METAL-%') — nunca una joya ni ningún otro producto normal.
--   2) Si el dueño es SUCURSAL, el producto SOLO puede ser
--      METAL-ORO-24 (oro fino) o METAL-PLATA-1000 (plata fina) —
--      NINGUNA otra presentación (ni otro kilataje, ni otra ley).
--      Los técnicos sí pueden tener cualquier kilataje/ley (regla de
--      negocio ya documentada en metal_inventario.sql línea 11-12).
--
-- Idempotente: DROP TRIGGER IF EXISTS + CREATE: correr de nuevo no
-- duplica nada, solo redefine igual.
-- ============================================================

-- ── 1) Limpieza de lo que ya viola la regla ──
-- No se hardcodean ids: se purga TODO renglón cuyo producto no sea
-- METAL-% (o, si es de sucursal, que no sea exactamente el fino). Así
-- el script queda seguro de re-correr aunque cambien los ids.
-- Requiere que el catálogo METAL-% ya exista (correr
-- insert_productos_metal.sql ANTES que este script), o el filtro
-- "P.barCode IS NULL" purgaría también los renglones legítimos.

DELETE MI FROM metal_inventario AS MI
LEFT JOIN products AS P ON P.idProduct = MI.idProduct
WHERE P.barCode IS NULL
   OR P.barCode NOT LIKE 'METAL-%'
   OR ( MI.tipoPropietario = 'SUCURSAL' AND P.barCode NOT IN ('METAL-ORO-24', 'METAL-PLATA-1000') );

DELETE T FROM metal_inventario_track AS T
LEFT JOIN products AS P ON P.idProduct = T.idProduct
WHERE P.barCode IS NULL
   OR P.barCode NOT LIKE 'METAL-%';

-- ── 2) El guardián ──

DROP TRIGGER IF EXISTS `trg_metal_inventario_valida_bi`;
DROP TRIGGER IF EXISTS `trg_metal_inventario_valida_bu`;

DELIMITER $$

CREATE TRIGGER `trg_metal_inventario_valida_bi`
BEFORE INSERT ON `metal_inventario`
FOR EACH ROW
BEGIN

    DECLARE v_barCode VARCHAR(500);

    SELECT barCode INTO v_barCode FROM products WHERE idProduct = NEW.idProduct;

    IF v_barCode IS NULL OR v_barCode NOT LIKE 'METAL-%' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'metal_inventario.idProduct debe ser un producto de metal (barCode METAL-%): nunca una joya ni otro producto del catálogo normal.';
    END IF;

    IF NEW.tipoPropietario = 'SUCURSAL' AND v_barCode NOT IN ('METAL-ORO-24', 'METAL-PLATA-1000') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El inventario de SUCURSAL solo puede ser oro fino (METAL-ORO-24) o plata fina (METAL-PLATA-1000). Ninguna otra presentación.';
    END IF;

END$$

CREATE TRIGGER `trg_metal_inventario_valida_bu`
BEFORE UPDATE ON `metal_inventario`
FOR EACH ROW
BEGIN

    DECLARE v_barCode VARCHAR(500);

    SELECT barCode INTO v_barCode FROM products WHERE idProduct = NEW.idProduct;

    IF v_barCode IS NULL OR v_barCode NOT LIKE 'METAL-%' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'metal_inventario.idProduct debe ser un producto de metal (barCode METAL-%): nunca una joya ni otro producto del catálogo normal.';
    END IF;

    IF NEW.tipoPropietario = 'SUCURSAL' AND v_barCode NOT IN ('METAL-ORO-24', 'METAL-PLATA-1000') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El inventario de SUCURSAL solo puede ser oro fino (METAL-ORO-24) o plata fina (METAL-PLATA-1000). Ninguna otra presentación.';
    END IF;

END$$

DELIMITER ;

-- ============================================================
-- NOTA IMPORTANTE PARA QUIEN OPERE EL SISTEMA DESPUÉS DE ESTE SCRIPT:
-- La limpieza de arriba deja el saldo de la sucursal en CERO (oro fino
-- y plata fina). Eso es correcto — los renglones que había eran datos
-- de prueba, no un conteo real — pero significa que hay que capturar
-- una "Entrada a sucursal" real (pantalla de Inventario de Metal) con
-- el oro/plata fino que la joyería tenga físicamente hoy, para que el
-- saldo represente la realidad y no cero.
-- ============================================================

-- ============================================================
-- ROLLBACK (correr a mano solo si hiciera falta revertir el guardián;
-- la limpieza de datos de prueba no tiene vuelta atrás con esto, ya
-- eran datos incorrectos):
--
--   DROP TRIGGER IF EXISTS `trg_metal_inventario_valida_bi`;
--   DROP TRIGGER IF EXISTS `trg_metal_inventario_valida_bu`;
-- ============================================================
