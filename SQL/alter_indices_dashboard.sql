-- ============================================================
-- ÍNDICES DE APOYO PARA EL PANEL DEL DIRECTOR
-- (analisis/014-dashboard-directivo.md, tarea T2). Idempotente.
--
-- El panel se refresca solo cada 60 segundos, así que una consulta
-- lenta no se paga una vez: se paga cada minuto, por cada usuario que
-- tenga el panel abierto. Estos índices salieron de medir los siete
-- endpoints contra el respaldo de producción, no de suponer.
--
-- Ninguno cambia datos ni estructura de negocio: solo índices.
-- Rollback al final, comentado.
-- ============================================================

-- Filtro por día/mes en los bloques del día y del mes.
SET @idx = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND INDEX_NAME = 'idx_dash_sales_fecha' );
SET @sql_alter = IF(@idx = 0,
  'ALTER TABLE `sales` ADD INDEX `idx_dash_sales_fecha` (`createDate`)',
  'SELECT 1');
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Cobranza del día y su partición entre venta del día y abonos.
SET @idx = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND INDEX_NAME = 'idx_dash_payments_fecha' );
SET @sql_alter = IF(@idx = 0,
  'ALTER TABLE `payments` ADD INDEX `idx_dash_payments_fecha` (`createDate`)',
  'SELECT 1');
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Última venta por producto (capital dormido). Sin él ese bloque pasa
-- de 63 ms a 234 ms.
SET @idx = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salesdetail' AND INDEX_NAME = 'idx_dash_detalle_activo' );
SET @sql_alter = IF(@idx = 0,
  'ALTER TABLE `salesdetail` ADD INDEX `idx_dash_detalle_activo` (`active`, `idProduct`, `createDate`)',
  'SELECT 1');
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Suma de importes por nota, que es lo que arma el saldo de la
-- cartera. Cubre la agregación completa (no toca la tabla).
SET @idx = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salesdetail' AND INDEX_NAME = 'idx_dash_detalle_venta' );
SET @sql_alter = IF(@idx = 0,
  'ALTER TABLE `salesdetail` ADD INDEX `idx_dash_detalle_venta` (`active`, `idSale`, `importe`)',
  'SELECT 1');
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Estatus actual de cada folio de taller (MAX por idSale).
SET @idx = ( SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sobre_taller_status' AND INDEX_NAME = 'idx_dash_sobre_venta' );
SET @sql_alter = IF(@idx = 0,
  'ALTER TABLE `sobre_taller_status` ADD INDEX `idx_dash_sobre_venta` (`idSale`, `idSobreTallerStatus`)',
  'SELECT 1');
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- TIEMPOS MEDIDOS (respaldo de producción, corte 2024-11-08, mínimo
-- de 5 corridas por endpoint). Criterio de cierre: < 1 s cada uno.
--
--   getCartera              440 ms
--   getCarteraTop           366 ms
--   getInventario            63 ms
--   getResumenDia            90 ms
--   getResumenPorVendedor   118 ms
--   getResumenMes           116 ms
--   getOperacion            309 ms
--
-- Los dos de cartera son los pesados: arman el saldo nota por nota
-- sobre toda la historia de apartados y créditos. Se quedan así — a
-- 440 ms cumplen de sobra el criterio.
--
-- ÍNDICE QUE SE PROBÓ Y SE DESCARTÓ, para que nadie lo vuelva a
-- intentar: `payments (active, relationType, idRelation, pago,
-- createDate)`. Le quita ~90 ms a la cartera pero el optimizador
-- empieza a preferirlo en los bloques del día, y ahí cuesta ~350 ms
-- de más en cada uno. El total pasa de 1,502 ms a 2,238 ms. Además
-- `payments` es tabla de escritura constante en el punto de venta:
-- un índice ancho ahí se paga en cada cobro.
-- ============================================================

-- ============================================================
-- ROLLBACK (correr a mano solo si hiciera falta revertir):
--
--   ALTER TABLE `sales` DROP INDEX `idx_dash_sales_fecha`;
--   ALTER TABLE `payments` DROP INDEX `idx_dash_payments_fecha`;
--   ALTER TABLE `salesdetail` DROP INDEX `idx_dash_detalle_activo`;
--   ALTER TABLE `salesdetail` DROP INDEX `idx_dash_detalle_venta`;
--   ALTER TABLE `sobre_taller_status` DROP INDEX `idx_dash_sobre_venta`;
-- ============================================================
