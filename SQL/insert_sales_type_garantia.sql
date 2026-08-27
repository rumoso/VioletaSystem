-- ============================================================
-- TIPO DE FOLIO "GARANTÍA" (analisis/016-garantias-taller.md)
--
-- Una garantía es un folio de taller que nace de un taller ya
-- entregado. Reutiliza tal cual el generador de folios del sistema:
-- basta con darle de alta el tipo, y `getIDs_BySucursal` +
-- `CONCAT(sig, idSucursal, '-')` arman `GAR1-1` solos, sin una línea
-- de código nueva.
--
-- El folio NO lleva dentro el taller de origen (esa relación vive en
-- `taller.idTallerOrigen`, ver alter_taller_garantia.sql): todo el
-- sistema lee el consecutivo con SUBSTRING_INDEX(idSale, '-', -1), así
-- que un folio tipo 'GAR1-1-TALL1-10826' haría que leyera 10826 como
-- consecutivo y el contador quedaría inservible desde la primera
-- garantía.
--
-- OJO: idSaleType = 8 se usa SOLO para el contador y el prefijo. El
-- renglón de `sales` de una garantía se guarda con idSaleType = 5
-- (Taller), igual que ya hace TallerRápidas con su 7 — verificado:
-- 28,893 folios TALL/TALLR en `sales`, todos con idSaleType = 5, cero
-- con 7. Así la garantía no rompe ningún filtro `idSaleType IN (5,7)`
-- que ya exista (panel del director, consulta de ventas, reportes).
--
-- Idempotente: no duplica si ya existe.
-- ============================================================

INSERT INTO sales_type (createDate, name, sig, description, active)
SELECT NOW(), 'Garantía', 'GAR', 'Garantía sobre un taller ya entregado — no genera comisión', 1
FROM DUAL
WHERE NOT EXISTS ( SELECT 1 FROM sales_type WHERE sig = 'GAR' );

-- El idSaleType es AUTO_INCREMENT o no según el ambiente; si el
-- renglón quedó con un id distinto de 8, el resto del sistema lo
-- resuelve por `sig`, no por el número. Esta consulta lo confirma:
--
--   SELECT idSaleType, sig, name FROM sales_type WHERE sig = 'GAR';
