-- ============================================================
-- PRODUCTOS DE METAL (analisis/001-control-inventario-metal.md)
-- Un producto por tipo de metal manejado en inventario, con
-- barCode determinístico METAL-<ORO|PLATA>-<kilataje|ley> para que
-- el Back resuelva tipo + kilataje/ley -> idProduct sin ambigüedad.
-- La existencia se maneja en gramos vía metal_inventario (no en
-- piezas). Idempotente: no duplica por barCode.
-- ============================================================

-- Familia METAL (si no existe)
INSERT INTO families (createDate, name, description, active)
SELECT NOW(), 'METAL', 'Metal para inventario de taller (fino y kilatajes/leyes)', 1
WHERE NOT EXISTS ( SELECT 1 FROM families WHERE name = 'METAL' );

-- ORO: fino (24K) y kilatajes
INSERT INTO products (createDate, idSucursal, idFamily, idGroup, idQuality, idOrigin, idSupplier, barCode, name, gramos, cost, price, active)
SELECT NOW(), 1,
  ( SELECT idFamily FROM families WHERE name = 'METAL' LIMIT 1 ),
  ( SELECT idGroup FROM `groups` WHERE name = 'ORO' LIMIT 1 ),
  ( SELECT MIN(idQuality) FROM quality WHERE active = 1 ),
  ( SELECT MIN(idOrigin) FROM origin WHERE active = 1 ),
  NULL, t.barCode, t.name, 0, 0, 0, 1
FROM (
  SELECT 'METAL-ORO-24' AS barCode, 'ORO FINO (24K)' AS name
  UNION ALL SELECT 'METAL-ORO-8',  'METAL ORO 8K'
  UNION ALL SELECT 'METAL-ORO-10', 'METAL ORO 10K'
  UNION ALL SELECT 'METAL-ORO-12', 'METAL ORO 12K'
  UNION ALL SELECT 'METAL-ORO-14', 'METAL ORO 14K'
  UNION ALL SELECT 'METAL-ORO-16', 'METAL ORO 16K'
  UNION ALL SELECT 'METAL-ORO-18', 'METAL ORO 18K'
  UNION ALL SELECT 'METAL-ORO-20', 'METAL ORO 20K'
  UNION ALL SELECT 'METAL-ORO-22', 'METAL ORO 22K'
) AS t
WHERE NOT EXISTS ( SELECT 1 FROM products WHERE barCode = t.barCode );

-- PLATA: fina (ley 1000) y leyes
INSERT INTO products (createDate, idSucursal, idFamily, idGroup, idQuality, idOrigin, idSupplier, barCode, name, gramos, cost, price, active)
SELECT NOW(), 1,
  ( SELECT idFamily FROM families WHERE name = 'METAL' LIMIT 1 ),
  ( SELECT idGroup FROM `groups` WHERE name = 'PLATA' LIMIT 1 ),
  ( SELECT MIN(idQuality) FROM quality WHERE active = 1 ),
  ( SELECT MIN(idOrigin) FROM origin WHERE active = 1 ),
  NULL, t.barCode, t.name, 0, 0, 0, 1
FROM (
  SELECT 'METAL-PLATA-1000' AS barCode, 'PLATA FINA (LEY 1000)' AS name
  UNION ALL SELECT 'METAL-PLATA-925', 'METAL PLATA LEY 925'
  UNION ALL SELECT 'METAL-PLATA-720', 'METAL PLATA LEY 720'
) AS t
WHERE NOT EXISTS ( SELECT 1 FROM products WHERE barCode = t.barCode );
