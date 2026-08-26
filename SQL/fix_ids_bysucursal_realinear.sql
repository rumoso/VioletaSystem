-- ============================================================
-- REALINEA LOS CONTADORES DE FOLIO (`ids_BySucursal`)
--
-- PROBLEMA: al restaurar un respaldo de producción se traen las tablas
-- de datos (`sales`, `payments`, `corte_caja`, `egresos`...) pero NO
-- `ids_BySucursal`, que se queda con los contadores del ambiente
-- anterior. Como `sales.idSale` y `payments.idPayment` son PRIMARY KEY,
-- el sistema queda SIN PODER CREAR NADA: cada folio que genera choca
-- con uno que ya existe.
--
-- Estado encontrado en Local el 2026-08-26, después de restaurar
-- producción:
--
--   tipo  sig     contador   max real   atraso
--    1    CRED         138        217        80
--    2    CONT       10740      27348    16,609
--    3    APAR         838       1899     1,062
--    4    CONS          72        142        71
--    5    TALL       10831      28944    18,114
--    6    COTI         126        189        64
--    Payments        23141      60129    36,989
--    CorteCaja         463       1129       667
--    Egresos          2229       6580     4,352
--    Ingresos           22        175       154
--    Comisiones         12         12         1
--    physical_inv      125        125         1
--
-- QUÉ HACE: pone cada contador 10 por encima del consecutivo más alto
-- que exista realmente en su tabla. El margen de 10 es para que un
-- folio creado entre la medición y la aplicación no se pierda.
--
-- Los máximos NO van escritos a mano: se calculan al vuelo desde las
-- tablas reales, así que el script sirve igual dentro de un mes o en
-- otro ambiente. Solo toca el renglón si sigue atrasado
-- (`WHERE id <= max`), así que es idempotente: correrlo dos veces no
-- vuelve a subir los contadores.
--
-- NO BORRA NI MODIFICA NINGÚN DATO DE NEGOCIO — solo la tabla de
-- contadores.
-- ============================================================

-- ── 1) Folios de venta (relation = idSaleType, según `sales_type`) ──
-- El LIKE arma el prefijo real de cada tipo: 'CONT' + sucursal + '-'.
-- Se acota a relations numéricas para no intentar convertir 'Payments'
-- a número en el JOIN.

UPDATE ids_BySucursal AS I
INNER JOIN sales_type AS ST
        ON ST.idSaleType = CAST(I.relation AS UNSIGNED)
SET I.id = (
        SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(S.idSale, '-', -1) AS UNSIGNED ) ), 0 ) + 10
        FROM sales AS S
        WHERE S.idSale LIKE CONCAT(ST.sig, I.idSucursal, '-%')
    )
WHERE I.relation REGEXP '^[0-9]+$'
  AND I.id <= (
        SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(S.idSale, '-', -1) AS UNSIGNED ) ), 0 )
        FROM sales AS S
        WHERE S.idSale LIKE CONCAT(ST.sig, I.idSucursal, '-%')
    );

-- ── 2) Contadores con nombre propio ──
-- Cada uno vive en su propia tabla, con su propio prefijo, así que van
-- por separado.

UPDATE ids_BySucursal AS I
SET I.id = ( SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(idPayment, '-', -1) AS UNSIGNED ) ), 0 ) + 10 FROM payments )
WHERE I.relation = 'Payments'
  AND I.id <= ( SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(idPayment, '-', -1) AS UNSIGNED ) ), 0 ) FROM payments );

UPDATE ids_BySucursal AS I
SET I.id = ( SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(idCorteCaja, '-', -1) AS UNSIGNED ) ), 0 ) + 10 FROM corte_caja )
WHERE I.relation = 'CorteCaja'
  AND I.id <= ( SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(idCorteCaja, '-', -1) AS UNSIGNED ) ), 0 ) FROM corte_caja );

UPDATE ids_BySucursal AS I
SET I.id = ( SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(idEgreso, '-', -1) AS UNSIGNED ) ), 0 ) + 10 FROM egresos )
WHERE I.relation = 'Egresos'
  AND I.id <= ( SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(idEgreso, '-', -1) AS UNSIGNED ) ), 0 ) FROM egresos );

UPDATE ids_BySucursal AS I
SET I.id = ( SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(idIngreso, '-', -1) AS UNSIGNED ) ), 0 ) + 10 FROM ingresos )
WHERE I.relation = 'Ingresos'
  AND I.id <= ( SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(idIngreso, '-', -1) AS UNSIGNED ) ), 0 ) FROM ingresos );

UPDATE ids_BySucursal AS I
SET I.id = ( SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(idComision, '-', -1) AS UNSIGNED ) ), 0 ) + 10 FROM comisiones )
WHERE I.relation = 'Comisiones'
  AND I.id <= ( SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(idComision, '-', -1) AS UNSIGNED ) ), 0 ) FROM comisiones );

UPDATE ids_BySucursal AS I
SET I.id = ( SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(idPhysicalInventory, '-', -1) AS UNSIGNED ) ), 0 ) + 10 FROM physical_inventory )
WHERE I.relation = 'physical_inventory'
  AND I.id <= ( SELECT IFNULL( MAX( CAST( SUBSTRING_INDEX(idPhysicalInventory, '-', -1) AS UNSIGNED ) ), 0 ) FROM physical_inventory );

-- ============================================================
-- ADVERTENCIA PARA LA PRÓXIMA RESTAURACIÓN
--
-- Este script hay que volver a correrlo **cada vez** que se restaure un
-- respaldo de producción sobre un ambiente de desarrollo. Si no, el
-- sistema queda sin poder crear ventas ni pagos, y el error que se ve
-- en pantalla no dice nada sobre contadores — dice que el folio ya
-- existe, que suena a otra cosa.
--
-- OJO CON LA SEGUNDA SUCURSAL: `getIDs_BySucursal` tiene la condición
-- `p_idSucursal = p_idSucursal` (compara el parámetro consigo mismo),
-- así que hoy NO separa el consecutivo por sucursal. Este script sí
-- calcula el máximo por sucursal correctamente, pero mientras el SP no
-- se corrija, dos sucursales compartirían el mismo contador. No se nota
-- con una sola sucursal en operación.
-- ============================================================
