-- ============================================================
-- INVENTARIO DE METAL (analisis/001-control-inventario-metal.md)
-- Dos tablas: saldos por (sucursal/técnico) → producto, y el
-- tracking (kardex) de movimientos. Los kilatajes/leyes viven como
-- productos del catálogo (products), con existencia en gramos.
-- Idempotente (CREATE TABLE IF NOT EXISTS).
-- ============================================================

-- Saldos: un renglón por dueño (sucursal o técnico) y producto de
-- metal (oro fino, 8K..24K, plata fina, ley 1000/925/720...).
-- Por regla de negocio, las sucursales solo tendrán renglones de
-- fino (oro fino / plata fina); los técnicos cualquier kilataje/ley.
CREATE TABLE IF NOT EXISTS `metal_inventario` (
  `idMetalInventario`  BIGINT NOT NULL AUTO_INCREMENT,
  `createDate`         DATETIME NOT NULL,
  `updateDate`         DATETIME NULL,
  `tipoPropietario`    VARCHAR(20) NOT NULL COMMENT 'SUCURSAL | TECNICO',
  `idPropietario`      BIGINT NOT NULL COMMENT 'idSucursal o idUser del técnico según tipoPropietario',
  `idProduct`          BIGINT NOT NULL COMMENT 'producto de metal del catálogo (kilataje/ley)',
  `gramos`             DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`idMetalInventario`),
  UNIQUE KEY `ux_propietario_producto` (`tipoPropietario`, `idPropietario`, `idProduct`),
  INDEX `idx_producto` (`idProduct`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tracking (kardex): cada movimiento es inmutable; las correcciones
-- se registran como reversa completa + movimiento nuevo.
-- tipoOrigen/tipoDestino: SUCURSAL | TECNICO | CLIENTE (metal que
-- aporta el cliente) | EXTERNO (compra/reposición desde fuera).
CREATE TABLE IF NOT EXISTS `metal_inventario_track` (
  `idMetalInventarioTrack` BIGINT NOT NULL AUTO_INCREMENT,
  `createDate`             DATETIME NOT NULL,
  `tipoMovimiento`         VARCHAR(20) NOT NULL COMMENT 'ENTRADA | TRASPASO | ASIGNACION | METAL_FINAL | REVERSA',
  `tipoOrigen`             VARCHAR(20) NULL COMMENT 'SUCURSAL | TECNICO | CLIENTE | EXTERNO',
  `idOrigen`               BIGINT NULL,
  `tipoDestino`            VARCHAR(20) NULL COMMENT 'SUCURSAL | TECNICO | CLIENTE | EXTERNO',
  `idDestino`              BIGINT NULL,
  `idProduct`              BIGINT NOT NULL COMMENT 'producto de metal movido: kilataje/ley original capturado',
  `gramos`                 DECIMAL(18,2) NOT NULL COMMENT 'gramos en el kilataje/ley capturado',
  `gramosFino`             DECIMAL(18,2) NOT NULL COMMENT 'equivalente en fino (oro: g×kilataje/24, plata: g×ley/1000)',
  `idTaller`               BIGINT NULL COMMENT 'folio de taller cuando el movimiento viene de asignación/metal final',
  `idSale`                 VARCHAR(100) NULL,
  `referencia`             VARCHAR(1000) NULL COMMENT 'nota/descripción del movimiento',
  `idCreateUser`           BIGINT NOT NULL,
  PRIMARY KEY (`idMetalInventarioTrack`),
  INDEX `idx_origen` (`tipoOrigen`, `idOrigen`),
  INDEX `idx_destino` (`tipoDestino`, `idDestino`),
  INDEX `idx_taller` (`idTaller`),
  INDEX `idx_fecha` (`createDate`),
  INDEX `idx_producto` (`idProduct`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
