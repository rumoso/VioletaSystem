// ══════════════════════════════════════════════════════════════
// DEFINICIONES DEL PANEL DEL DIRECTOR
// (analisis/014-dashboard-directivo.md y analisis/015-clics-con-filtro-panel.md)
//
// Aquí vive, UNA sola vez, qué registros componen cada cifra del panel.
// La usan dos lados:
//
//   - dashboardController, para contar y sumar (la cifra que se ve).
//   - los endpoints de conjunto, para listar esos mismos registros
//     cuando el usuario hace clic en la cifra.
//
// Por eso no hay que escribir otra vez una regla de estas en ningún
// otro archivo. Si el panel y el listado tuvieran cada uno su propia
// consulta, bastaría con que alguien ajustara una y no la otra para que
// el panel dijera "32 notas" y el listado mostrara 31 — que es
// exactamente el problema que motivó el análisis 015.
//
// Todas las piezas son SQL con parámetros con nombre (:desde, :hasta,
// :corte, :idVendedor, :idSale); nada se interpola desde la petición.
// ══════════════════════════════════════════════════════════════

// Exclusiones fijas: cotizaciones (idSaleType 6) no son ventas, y lo
// cancelado no cuenta en ningún número.
const _SQL_VENTA_VALIDA = `S.active = 1 AND S.idSaleType <> 6`;

// Los tipos que son taller, para separar mostrador de taller.
const _TIPOS_TALLER = [5, 7];

const _SQL_FILTRO_MOSTRADOR = `AND S.idSaleType NOT IN (${ _TIPOS_TALLER.join(', ') })`;
const _SQL_FILTRO_TALLER = `AND S.idSaleType IN (${ _TIPOS_TALLER.join(', ') })`;
const _SQL_FILTRO_VENDEDOR = `AND S.idSeller_idUser = :idVendedor`;

// ── Utilidad ──
// Fórmula única: importe menos costo por cantidad.
//
// El LEFT JOIN a products y el CASE no son decorativos: el reporte
// `rep_getUtilidades` suma importe y costo con un INNER JOIN a
// products, así que una línea cuyo idProduct no exista en el catálogo
// (taller/sobre, que van con idProduct = 0) no aporta ni importe ni
// costo. El panel hace lo mismo para no diferir del reporte por esa
// razón.
const _SQL_IMPORTE = `SUM(CASE WHEN PP.idProduct IS NOT NULL THEN D.importe ELSE 0 END)`;
const _SQL_COSTO = `SUM(CASE WHEN PP.idProduct IS NOT NULL THEN D.cost * D.cantidad ELSE 0 END)`;
const _SQL_PIEZAS = `SUM(CASE WHEN PP.idProduct IS NOT NULL THEN D.cantidad ELSE 0 END)`;

// ── VENDIDO ──
// Notas levantadas en el rango [:desde, :hasta]. Una nota cuenta si
// tiene al menos una línea activa (INNER JOIN a salesdetail).
// ── UTILIDAD GUARDADA (analisis/027) ──
// El panel ya no calcula la utilidad: la lee de donde vive.
//
//   Mostrador → sales.utilidad (neta) y sales.comisionMonto
//   Taller    → taller.utilidad (neta) y taller.comisiones, con
//               taller.precioTotal como vendido (los renglones de mano
//               de obra y metal van sin producto de catálogo, así que
//               sumarlos desde salesdetail se quedaba corto).
//
// Las dos consultas filtran por la fecha de la venta y por que la venta
// siga activa, el mismo criterio del resto del panel.
const _SQL_UTILIDAD_MOSTRADOR = `
    SELECT
        ROUND( IFNULL( SUM( S.utilidad ), 0), 2) AS utilidadNeta,
        ROUND( IFNULL( SUM( S.comisionMonto ), 0), 2) AS comisiones
    FROM sales AS S
    WHERE ${ _SQL_VENTA_VALIDA }
      AND S.idSaleType NOT IN (${ _TIPOS_TALLER.join(', ') })
      AND DATE(S.createDate) BETWEEN :desde AND :hasta`;

const _SQL_UTILIDAD_TALLER = `
    SELECT
        ROUND( IFNULL( SUM( T.precioTotal ), 0), 2) AS vendidoTaller,
        ROUND( IFNULL( SUM( T.utilidad ), 0), 2) AS utilidadNeta,
        ROUND( IFNULL( SUM( T.comisiones ), 0), 2) AS comisiones
    FROM taller AS T
    INNER JOIN sales AS S ON S.idSale = T.idSale
    WHERE ${ _SQL_VENTA_VALIDA }
      AND DATE(S.createDate) BETWEEN :desde AND :hasta`;

// Los talleres VIEJOS (los de antes del módulo, sin renglón en `taller`,
// analisis/025) no tienen folio del que sacar el precio ni utilidad
// guardada: su venta sí cuenta como vendido, con los renglones de
// siempre, y aporta 0 de utilidad. Sin esto el bloque de taller se
// quedaba en blanco para las fechas viejas.
const _SQL_VENDIDO_TALLER_VIEJO = `
    SELECT ROUND( IFNULL( ${ _SQL_IMPORTE }, 0), 2) AS vendidoViejo
    FROM sales AS S
    INNER JOIN salesdetail AS D ON D.idSale = S.idSale AND D.active = 1
    LEFT JOIN products AS PP ON PP.idProduct = D.idProduct
    WHERE ${ _SQL_VENTA_VALIDA }
      AND S.idSaleType IN (${ _TIPOS_TALLER.join(', ') })
      AND DATE(S.createDate) BETWEEN :desde AND :hasta
      AND NOT EXISTS ( SELECT 1 FROM taller AS TT WHERE TT.idSale = S.idSale )`;

// Por vendedor, para la tabla del día.
const _SQL_UTILIDAD_MOSTRADOR_POR_VENDEDOR = `
    SELECT
        S.idSeller_idUser AS idUser,
        ROUND( IFNULL( SUM( S.utilidad ), 0), 2) AS utilidadNeta,
        ROUND( IFNULL( SUM( S.comisionMonto ), 0), 2) AS comisiones
    FROM sales AS S
    WHERE ${ _SQL_VENTA_VALIDA }
      AND DATE(S.createDate) BETWEEN :desde AND :hasta
    GROUP BY S.idSeller_idUser`;

const fn_sqlVentaFrom = (sFiltro = '') => `
    FROM sales AS S
    INNER JOIN salesdetail AS D ON D.idSale = S.idSale AND D.active = 1
    LEFT JOIN products AS PP ON PP.idProduct = D.idProduct
    WHERE ${ _SQL_VENTA_VALIDA }
      AND DATE(S.createDate) BETWEEN :desde AND :hasta
      ${ sFiltro }`;

// ── COBRADO ──
// Pagos registrados en el rango [:desde, :hasta], vengan de donde
// vengan, siempre que la nota siga activa.
const fn_sqlCobradoFrom = () => `
    FROM payments AS P
    INNER JOIN sales AS S ON S.idSale = P.idRelation AND S.active = 1
    WHERE P.active = 1
      AND P.relationType = 'V'
      AND DATE(P.createDate) BETWEEN :desde AND :hasta`;

// Partición del cobrado: lo que vino de ventas del mismo día y lo que vino
// de abonos a notas anteriores. Sobre payments (P) cruzado con sales (S).
const _SQL_COBRADO_DE_VENTAS_DEL_DIA = `SUM(CASE WHEN DATE(P.createDate) = DATE(S.createDate) THEN P.pago ELSE 0 END)`;
const _SQL_COBRADO_ABONOS = `SUM(CASE WHEN DATE(P.createDate) > DATE(S.createDate) THEN P.pago ELSE 0 END)`;

// ── CARTERA AL CORTE ──
// Apartados (3) y créditos (1) como estaban en la fecha :corte: se
// descuentan solo los pagos hechos hasta ese día, y cuenta como cartera
// la nota que en esa fecha todavía no se entregaba. Consultar una fecha
// pasada con los pagos de hoy le quitaría saldo a notas que en esa
// fecha lo tenían.
const _SQL_CARTERA_BASE = `
    SELECT
        S.idSale,
        S.idSaleType,
        S.idCustomer,
        S.createDate,
        DATEDIFF(:corte, S.createDate) AS dias,
        ROUND(IFNULL(D.importe, 0) - IFNULL(P.pago, 0), 2) AS saldo
    FROM sales AS S
    LEFT JOIN ( SELECT idSale, SUM(importe) AS importe FROM salesdetail WHERE active = 1 GROUP BY idSale ) AS D
        ON D.idSale = S.idSale
    LEFT JOIN (
        SELECT idRelation, SUM(pago) AS pago
        FROM payments
        WHERE active = 1 AND relationType = 'V' AND DATE(createDate) <= :corte
        GROUP BY idRelation
    ) AS P
        ON P.idRelation = S.idSale
    WHERE S.active = 1
      AND S.idSaleType IN (1, 3)
      AND ( S.fechaEntrega IS NULL OR DATE(S.fechaEntrega) > :corte )
      AND DATE(S.createDate) <= :corte
`;

// Sobre el resultado de _SQL_CARTERA_BASE (alias T).
const _SQL_CARTERA_CON_SALDO = `T.saldo > 0.01`;

const _SQL_CARTERA_CUBETA = `
    CASE WHEN T.dias <= 30 THEN 1
         WHEN T.dias <= 60 THEN 2
         WHEN T.dias <= 90 THEN 3
         ELSE 4 END`;

// En el mismo orden que la cubeta del CASE (1..4).
const _CARTERA_CUBETAS = [
    { clave: '0-30', etiqueta: '0 a 30 días' },
    { clave: '31-60', etiqueta: '31 a 60 días' },
    { clave: '61-90', etiqueta: '61 a 90 días' },
    { clave: '+90', etiqueta: 'Más de 90 días' }
];

// ── INVENTARIO (capital dormido) ──
const _SQL_INV_FROM = `
    FROM products AS P
    LEFT JOIN ( SELECT idProduct, MAX(createDate) AS ultima FROM salesdetail WHERE active = 1 GROUP BY idProduct ) AS U
        ON U.idProduct = P.idProduct
    WHERE P.active = 1`;

const _SQL_INV_NUNCA = `U.ultima IS NULL`;
const _SQL_INV_12 = `U.ultima IS NOT NULL AND U.ultima < DATE_SUB(:corte, INTERVAL 12 MONTH)`;
const _SQL_INV_6 = `U.ultima IS NOT NULL AND U.ultima < DATE_SUB(:corte, INTERVAL 6 MONTH) AND U.ultima >= DATE_SUB(:corte, INTERVAL 12 MONTH)`;
// El piso del sistema: precio de venta al menos 30% sobre el costo.
const _SQL_INV_BAJO_PISO = `P.cost > 0 AND P.price < ROUND(P.cost * 1.30, 2)`;

const _INV_ETIQUETAS = {
    nunca: 'Nunca se ha vendido',
    sin12: 'Sin movimiento 12+ meses',
    sin6: 'Sin movimiento 6 a 12 meses',
    bajoPiso: 'Precio bajo su piso'
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// CATÁLOGO DE CONJUNTOS (analisis/015)
//
// Una clave por cifra clicable del panel. Cada una arma su consulta de
// ids y su resumen con las piezas de arriba — nunca con una copia.
//
//   destino  — 'ventas' | 'pagos' | 'productos': qué endpoint la sirve.
//   menu     — linkList del menú que exige la pantalla destino.
//   bCostos  — exige dashboard_VerCostos (el conjunto se deriva de
//              costos, aunque el listado no los enseñe).
//   requiere — parámetros obligatorios además de la fecha.
//   fn_sql   — { ids, resumen }: ids devuelve UNA columna (idSale,
//              idPayment o idProduct); resumen devuelve conteo e importe
//              con la misma definición que la cifra del panel.
//   fn_repl  — replacements de esas dos consultas.
//   fn_etiqueta — descripción en palabras para la leyenda.
//////////////////////////////////////////////////////////////////////////////////////////////////

// 'AAAA-MM-DD' -> 'DD-MM-AAAA', para la leyenda.
const fn_fechaDesc = (sFecha) => {
    const [a, m, d] = String(sFecha).substring(0, 10).split('-');
    return `${ d }-${ m }-${ a }`;
};

const fn_conjuntoVenta = (sFiltro, fn_etiqueta, requiere = []) => ({
    destino: 'ventas',
    menu: 'saleList',
    bCostos: false,
    requiere,
    fn_sql: () => ({
        ids: `SELECT DISTINCT S.idSale ${ fn_sqlVentaFrom(sFiltro) }`,
        resumen: `SELECT COUNT(DISTINCT S.idSale) AS conteo, ${ _SQL_IMPORTE } AS importe ${ fn_sqlVentaFrom(sFiltro) }`
    }),
    fn_repl: (p) => ({ desde: p.fecha, hasta: p.fecha, idVendedor: p.idVendedor || 0 }),
    fn_etiqueta
});

// iCubeta 0 = toda la cartera; 1..4 = cubeta de antigüedad.
const fn_conjuntoCartera = (sFiltroTipo, iCubeta, fn_etiqueta) => {

    const sWhere = [
        _SQL_CARTERA_CON_SALDO,
        sFiltroTipo,
        iCubeta > 0 ? `(${ _SQL_CARTERA_CUBETA }) = ${ Number(iCubeta) }` : ''
    ].filter(Boolean).join(' AND ');

    return {
        destino: 'ventas',
        menu: 'saleList',
        bCostos: false,
        requiere: [],
        // La cifra del panel es el saldo COMO ESTABA en la fecha de corte
        // (pagos hasta ese día). El listado tiene que mostrar pagado y
        // pendiente con ese mismo corte, o con una fecha pasada no cuadra:
        // los abonos posteriores bajarían el pendiente.
        bSaldoAlCorte: true,
        fn_sql: () => ({
            ids: `SELECT T.idSale FROM ( ${ _SQL_CARTERA_BASE } ) AS T WHERE ${ sWhere }`,
            resumen: `SELECT COUNT(*) AS conteo, SUM(T.saldo) AS importe FROM ( ${ _SQL_CARTERA_BASE } ) AS T WHERE ${ sWhere }`
        }),
        fn_repl: (p) => ({ corte: p.fecha }),
        fn_etiqueta
    };

};

const fn_conjuntoInventario = (sCondicion, fn_etiqueta) => ({
    destino: 'productos',
    menu: 'productList',
    bCostos: true,
    requiere: [],
    fn_sql: () => ({
        ids: `SELECT P.idProduct ${ _SQL_INV_FROM } AND ${ sCondicion }`,
        resumen: `SELECT COUNT(*) AS conteo, SUM(P.cost) AS importe ${ _SQL_INV_FROM } AND ${ sCondicion }`
    }),
    fn_repl: (p) => ({ corte: p.fecha }),
    fn_etiqueta
});

const _CONJUNTOS = {

    // ── El día ──
    'dia-vendido': fn_conjuntoVenta('', (p) => `Vendido el ${ fn_fechaDesc(p.fecha) }`),
    'dia-mostrador': fn_conjuntoVenta(_SQL_FILTRO_MOSTRADOR, (p) => `Ventas de mostrador del ${ fn_fechaDesc(p.fecha) }`),
    'dia-taller': fn_conjuntoVenta(_SQL_FILTRO_TALLER, (p) => `Ventas de taller del ${ fn_fechaDesc(p.fecha) }`),

    'dia-cobrado': {
        destino: 'pagos',
        menu: 'rep_pagos',
        bCostos: false,
        requiere: [],
        fn_sql: () => ({
            ids: `SELECT P.idPayment ${ fn_sqlCobradoFrom() }`,
            resumen: `SELECT COUNT(*) AS conteo, SUM(P.pago) AS importe ${ fn_sqlCobradoFrom() }`
        }),
        fn_repl: (p) => ({ desde: p.fecha, hasta: p.fecha }),
        fn_etiqueta: (p) => `Cobrado el ${ fn_fechaDesc(p.fecha) }`
    },

    // ── Por vendedor ──
    'vendedor': fn_conjuntoVenta(
        _SQL_FILTRO_VENDEDOR,
        (p) => `Ventas de ${ p.vendedorDesc || `#${ p.idVendedor }` } del ${ fn_fechaDesc(p.fecha) }`,
        ['idVendedor']
    ),

    // ── Cartera ──
    'cartera-total': fn_conjuntoCartera('', 0, (p) => `Cartera al ${ fn_fechaDesc(p.fecha) }`),
    'cartera-apartados': fn_conjuntoCartera('T.idSaleType = 3', 0, (p) => `Apartados con saldo al ${ fn_fechaDesc(p.fecha) }`),
    'cartera-creditos': fn_conjuntoCartera('T.idSaleType = 1', 0, (p) => `Créditos con saldo al ${ fn_fechaDesc(p.fecha) }`),
    'cartera-0-30': fn_conjuntoCartera('', 1, (p) => `Cartera de ${ _CARTERA_CUBETAS[0].etiqueta } al ${ fn_fechaDesc(p.fecha) }`),
    'cartera-31-60': fn_conjuntoCartera('', 2, (p) => `Cartera de ${ _CARTERA_CUBETAS[1].etiqueta } al ${ fn_fechaDesc(p.fecha) }`),
    'cartera-61-90': fn_conjuntoCartera('', 3, (p) => `Cartera de ${ _CARTERA_CUBETAS[2].etiqueta } al ${ fn_fechaDesc(p.fecha) }`),
    'cartera-90': fn_conjuntoCartera('', 4, (p) => `Cartera de más de 90 días al ${ fn_fechaDesc(p.fecha) }`),

    // Renglón del top de saldos: esa nota y ninguna otra. Búsqueda
    // exacta — el filtro de folio de la consulta normal es un LIKE, y
    // "VENT1-12" traería también VENT1-120 a VENT1-129.
    'nota': {
        destino: 'ventas',
        menu: 'saleList',
        bCostos: false,
        requiere: ['idSale'],
        fn_sql: () => ({
            ids: `SELECT S.idSale FROM sales AS S WHERE S.idSale = :idSale`,
            resumen: `SELECT COUNT(*) AS conteo, 0 AS importe FROM sales AS S WHERE S.idSale = :idSale`
        }),
        fn_repl: (p) => ({ idSale: p.idSale }),
        fn_etiqueta: (p) => `Nota ${ p.idSale }`
    },

    // ── Capital dormido ──
    'inv-nunca': fn_conjuntoInventario(_SQL_INV_NUNCA, () => _INV_ETIQUETAS.nunca),
    'inv-12': fn_conjuntoInventario(_SQL_INV_12, (p) => `${ _INV_ETIQUETAS.sin12 } al ${ fn_fechaDesc(p.fecha) }`),
    'inv-6': fn_conjuntoInventario(_SQL_INV_6, (p) => `${ _INV_ETIQUETAS.sin6 } al ${ fn_fechaDesc(p.fecha) }`),
    'inv-bajo-piso': fn_conjuntoInventario(_SQL_INV_BAJO_PISO, () => _INV_ETIQUETAS.bajoPiso)

};

module.exports = {
    _SQL_VENTA_VALIDA,
    _TIPOS_TALLER,
    _SQL_FILTRO_MOSTRADOR,
    _SQL_FILTRO_TALLER,
    _SQL_IMPORTE,
    _SQL_COSTO,
    _SQL_PIEZAS,
    _SQL_UTILIDAD_MOSTRADOR,
    _SQL_UTILIDAD_TALLER,
    _SQL_VENDIDO_TALLER_VIEJO,
    _SQL_UTILIDAD_MOSTRADOR_POR_VENDEDOR,
    fn_sqlVentaFrom,
    fn_sqlCobradoFrom,
    _SQL_COBRADO_DE_VENTAS_DEL_DIA,
    _SQL_COBRADO_ABONOS,
    _SQL_CARTERA_BASE,
    _SQL_CARTERA_CON_SALDO,
    _SQL_CARTERA_CUBETA,
    _CARTERA_CUBETAS,
    _SQL_INV_FROM,
    _SQL_INV_NUNCA,
    _SQL_INV_12,
    _SQL_INV_6,
    _SQL_INV_BAJO_PISO,
    _INV_ETIQUETAS,
    _CONJUNTOS,
    fn_fechaDesc
};
