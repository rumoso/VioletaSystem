INSERT INTO `sales_type`
(`idSaleType`,
`createDate`,
`name`,
`sig`,
`description`,
`active`)
SELECT
6,
NOW(),
'Cotización',
'COTI',
'Cotizaciones',
1;



INSERT INTO `products`
(
`idProduct`,
`createDate`,
`idSucursal`,
`idFamily`,
`idGroup`,
`idQuality`,
`idOrigin`,
`idSupplier`,
`barCode`,
`name`,
`gramos`,
`cost`,
`price`,
`active`)
SELECT
0,
NOW(),
1,
1,
1,
1,
1,
0,
'SOBRE001',
'Producto para manejar sobres de taller',
0,
0,
0,
1;
