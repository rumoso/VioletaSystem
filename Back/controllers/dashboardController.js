const { response } = require('express');

const { dbConnection } = require('../database/config');

// ══════════════════════════════════════════════════════════════
// PANEL DEL DIRECTOR (analisis/014-dashboard-directivo.md)
//
// Solo lectura: ningún endpoint de este archivo escribe. Un endpoint
// por bloque a propósito — es lo que permite que un bloque lento o
// caído no tumbe a los otros cuatro.
//
// Las tres definiciones que NO se pueden mezclar (regla del análisis):
//   VENDIDO  — importe de las notas levantadas en el rango.
//   COBRADO  — pagos registrados en el rango, vengan de donde vengan.
//   UTILIDAD — se calcula SIEMPRE sobre lo vendido, nunca sobre lo
//              cobrado: la utilidad de un apartado se generó el día
//              que se vendió, no el día que terminó de pagarse.
// ══════════════════════════════════════════════════════════════

// Exclusiones fijas, en un solo lugar para que seis consultas no se
// desincronicen: cotizaciones (idSaleType 6) no son ventas, y lo
// cancelado no cuenta en ningún número.
const _SQL_VENTA_VALIDA = `S.active = 1 AND S.idSaleType <> 6`;

// Los tipos que son taller, para separar mostrador de taller.
const _TIPOS_TALLER = [5, 7];

// ── Permisos ──
// Mismo camino que el SP `haveActionPermiso` del propio sistema: primero
// por rol (relationType 'R'), luego por usuario directo ('U'). No hay
// bypass por rol administrador.
//
// Las DOS banderas de active importan y son distintas:
//   A.active  = 1 -> el permiso existe y sigue vigente en el catálogo.
//   AC.active = 1 -> la ASIGNACIÓN a ese rol/usuario sigue vigente.
// La pantalla de permisos revoca poniendo `actionsconf.active = 0`, no
// borrando el renglón; sin ese segundo filtro un permiso revocado se
// seguiría concediendo. (Detectado al probar el panel de Sarita: al
// revocar `dashboard_VerCostos` el servidor seguía mandando los costos.)
const _fn_tienePermiso = async(idUser, actionName) => {

    const porRol = await dbConnection.query(
        `SELECT AC.idAction
         FROM actions AS A
         INNER JOIN actionsconf AS AC ON A.idAction = AC.idAction
         INNER JOIN rolesconfig AS RC ON AC.idRelation = RC.idRol
         WHERE AC.relationType = 'R' AND AC.active = 1
           AND RC.idUser = :idUser AND A.name = :actionName AND A.active = 1
         LIMIT 1`,
        { replacements: { idUser, actionName }, type: dbConnection.QueryTypes.SELECT }
    );

    if (porRol.length > 0) {
        return true;
    }

    const porUsuario = await dbConnection.query(
        `SELECT AC.idAction
         FROM actions AS A
         INNER JOIN actionsconf AS AC ON A.idAction = AC.idAction
         WHERE AC.relationType = 'U' AND AC.active = 1
           AND AC.idRelation = :idUser AND A.name = :actionName AND A.active = 1
         LIMIT 1`,
        { replacements: { idUser, actionName }, type: dbConnection.QueryTypes.SELECT }
    );

    return porUsuario.length > 0;

};

// Guarda común de todos los endpoints. Devuelve null si puede seguir,
// o la respuesta a mandar si no.
const _fn_validarAcceso = async(idUserLogON) => {

    if (!idUserLogON) {
        return { status: 1, message: "No se identificó al usuario." };
    }

    const bPuedeVer = await _fn_tienePermiso(idUserLogON, 'dashboard_VerPanel');

    if (!bPuedeVer) {
        return { status: 1, message: "No tienes permiso para ver el panel." };
    }

    return null;

};

// ── Fechas ──
// El comparativo del día es contra el MISMO DÍA DE LA SEMANA anterior
// (un lunes no se parece a un domingo), y el del mes contra el mes
// anterior AL MISMO DÍA DEL MES (comparar 12 días contra 31 no dice
// nada).
const _fn_fechas = (fecha) => {

    const sHoy = (fecha && String(fecha).substring(0, 10)) || new Date().toISOString().substring(0, 10);

    const oDia = new Date(`${ sHoy }T12:00:00`);

    const oSemanaAnterior = new Date(oDia);
    oSemanaAnterior.setDate(oSemanaAnterior.getDate() - 7);

    const iDiaDelMes = oDia.getDate();

    const oMesIni = new Date(oDia);
    oMesIni.setDate(1);

    // Mismo día del mes anterior. Si ese mes no llega a ese día (31 de
    // marzo → febrero), Date lo desborda al mes siguiente, así que se
    // topa al último día real del mes anterior.
    const oMesAntIni = new Date(oDia);
    oMesAntIni.setDate(1);
    oMesAntIni.setMonth(oMesAntIni.getMonth() - 1);

    const iUltimoDiaMesAnterior = new Date(oMesAntIni.getFullYear(), oMesAntIni.getMonth() + 1, 0).getDate();

    const oMesAntFin = new Date(oMesAntIni);
    oMesAntFin.setDate(Math.min(iDiaDelMes, iUltimoDiaMesAnterior));

    const fmt = (d) => `${ d.getFullYear() }-${ String(d.getMonth() + 1).padStart(2, '0') }-${ String(d.getDate()).padStart(2, '0') }`;

    return {
        dia: sHoy,
        diaComparativo: fmt(oSemanaAnterior),
        mesIni: fmt(oMesIni),
        mesFin: sHoy,
        mesAntIni: fmt(oMesAntIni),
        mesAntFin: fmt(oMesAntFin)
    };

};

// ── Utilidad ──
// Fórmula única: importe menos costo por cantidad.
//
// El LEFT JOIN a products y el CASE no son decorativos: el reporte
// `rep_getUtilidades` suma importe y costo con un INNER JOIN a
// products, así que una línea cuyo idProduct no exista en el catálogo
// (taller/sobre, que van con idProduct = 0) no aporta ni importe ni
// costo. El panel hace lo mismo para no diferir del reporte por esa
// razón. (Sí difiere por otra, ver la nota de `getResumenDia`.)
const _SQL_IMPORTE = `SUM(CASE WHEN PP.idProduct IS NOT NULL THEN D.importe ELSE 0 END)`;
const _SQL_COSTO = `SUM(CASE WHEN PP.idProduct IS NOT NULL THEN D.cost * D.cantidad ELSE 0 END)`;

// Redondeo de salida. Toda cantidad que sale de aquí va redondeada:
// es la regla del proyecto y aquí son los números que ve el dueño.
const _fn_r = (v) => Math.round((Number(v) || 0) * 100) / 100;

// Arma el bloque de venta/utilidad de un rango, aplicando el permiso
// de costos: sin `dashboard_VerCostos` los campos de costo, utilidad y
// margen NO se incluyen en la respuesta — no se mandan ocultos para
// que el Front los esconda.
const _fn_armarVenta = (fila, bVerCostos) => {

    const vendido = _fn_r(fila && fila.vendido);
    const costo = _fn_r(fila && fila.costo);

    const oVenta = {
        vendido,
        notas: Number((fila && fila.notas) || 0),
        piezas: _fn_r(fila && fila.piezas)
    };

    if (bVerCostos) {
        oVenta.costo = costo;
        oVenta.utilidad = _fn_r(vendido - costo);
        oVenta.margen = vendido > 0 ? _fn_r((vendido - costo) / vendido * 100) : 0;
    }

    return oVenta;

};

// Variación porcentual contra el periodo comparativo. null cuando no
// hay base: "creció infinito" no es una lectura útil.
const _fn_variacion = (actual, anterior) => {
    const a = Number(anterior) || 0;
    if (a === 0) {
        return null;
    }
    return _fn_r(((Number(actual) || 0) - a) / a * 100);
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// BLOQUE 1 — CARTERA
//////////////////////////////////////////////////////////////////////////////////////////////////

// Cartera viva = apartados (3) y créditos (1) SIN fecha de entrega y
// con saldo. Un apartado ya entregado dejó de ser cartera aunque tenga
// historia de pagos.
//
// La antigüedad se cuenta desde la fecha de la VENTA, no desde el
// último abono: un cliente que abona $50 al mes sobre una nota de
// $30,000 no "refresca" su antigüedad.
//
// TODO el bloque está cortado a `:corte`, no solo las ventas: los
// pagos se suman hasta esa fecha y la entrega se evalúa contra ella.
// Con el corte en hoy da igual, pero con el selector de periodo en una
// fecha pasada la mezcla sería incoherente — contaría las notas que
// existían entonces descontándoles pagos que todavía no ocurrían, y
// escondería como "entregadas" notas que en esa fecha seguían siendo
// cartera.
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

const getCartera = async(req, res = response) => {

    const { idUserLogON, fecha = '' } = req.body;

    try {

        const oNoAcceso = await _fn_validarAcceso(idUserLogON);
        if (oNoAcceso) {
            return res.json(oNoAcceso);
        }

        const oFechas = _fn_fechas(fecha);

        const filas = await dbConnection.query(
            `SELECT
                T.idSaleType,
                CASE WHEN T.dias <= 30 THEN 1
                     WHEN T.dias <= 60 THEN 2
                     WHEN T.dias <= 90 THEN 3
                     ELSE 4 END AS bucket,
                COUNT(*) AS notas,
                SUM(T.saldo) AS saldo
             FROM ( ${ _SQL_CARTERA_BASE } ) AS T
             WHERE T.saldo > 0.01
             GROUP BY T.idSaleType, bucket`,
            { replacements: { corte: oFechas.dia }, type: dbConnection.QueryTypes.SELECT }
        );

        const _fn_vacio = () => ({ notas: 0, saldo: 0 });

        const oResp = {
            fecha: oFechas.dia,
            total: _fn_vacio(),
            apartados: _fn_vacio(),
            creditos: _fn_vacio(),
            antiguedad: [
                { clave: '0-30', etiqueta: '0 a 30 días', ..._fn_vacio() },
                { clave: '31-60', etiqueta: '31 a 60 días', ..._fn_vacio() },
                { clave: '61-90', etiqueta: '61 a 90 días', ..._fn_vacio() },
                { clave: '+90', etiqueta: 'Más de 90 días', ..._fn_vacio() }
            ]
        };

        for (const f of filas) {

            const notas = Number(f.notas) || 0;
            const saldo = Number(f.saldo) || 0;

            oResp.total.notas += notas;
            oResp.total.saldo += saldo;

            const destino = Number(f.idSaleType) === 3 ? oResp.apartados : oResp.creditos;
            destino.notas += notas;
            destino.saldo += saldo;

            const cubeta = oResp.antiguedad[Number(f.bucket) - 1];
            cubeta.notas += notas;
            cubeta.saldo += saldo;

        }

        oResp.total.saldo = _fn_r(oResp.total.saldo);
        oResp.apartados.saldo = _fn_r(oResp.apartados.saldo);
        oResp.creditos.saldo = _fn_r(oResp.creditos.saldo);
        oResp.antiguedad.forEach((c) => {
            c.saldo = _fn_r(c.saldo);
            c.porcentaje = oResp.total.saldo > 0 ? _fn_r(c.saldo / oResp.total.saldo * 100) : 0;
        });

        oResp.bSinDatos = oResp.total.notas === 0;

        res.json({ status: 0, message: "Ejecutado correctamente.", data: oResp });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// Los 10 clientes con mayor saldo vencido. Un listado que no se puede
// accionar no sirve, así que va con teléfono e idSale para navegar.
const getCarteraTop = async(req, res = response) => {

    const { idUserLogON, fecha = '', iTop = 10 } = req.body;

    try {

        const oNoAcceso = await _fn_validarAcceso(idUserLogON);
        if (oNoAcceso) {
            return res.json(oNoAcceso);
        }

        const oFechas = _fn_fechas(fecha);

        const filas = await dbConnection.query(
            `SELECT
                T.idSale,
                T.idSaleType,
                T.dias,
                T.saldo,
                T.createDate,
                C.name,
                C.lastName,
                C.tel
             FROM ( ${ _SQL_CARTERA_BASE } ) AS T
             LEFT JOIN customers AS C ON C.idCustomer = T.idCustomer
             WHERE T.saldo > 0.01
             ORDER BY T.saldo DESC
             LIMIT :iTop`,
            {
                replacements: { corte: oFechas.dia, iTop: Number(iTop) || 10 },
                type: dbConnection.QueryTypes.SELECT
            }
        );

        const rows = filas.map((f) => ({
            idSale: f.idSale,
            clienteDesc: `${ f.name || '' } ${ f.lastName || '' }`.trim() || 'Sin cliente',
            tel: f.tel || '',
            tipoDesc: Number(f.idSaleType) === 3 ? 'Apartado' : 'Crédito',
            saldo: _fn_r(f.saldo),
            dias: Number(f.dias) || 0,
            fechaVenta: f.createDate
        }));

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: { rows, bSinDatos: rows.length === 0 }
        });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// BLOQUE 2 — CAPITAL DORMIDO
//////////////////////////////////////////////////////////////////////////////////////////////////

const getInventario = async(req, res = response) => {

    const { idUserLogON, fecha = '' } = req.body;

    try {

        const oNoAcceso = await _fn_validarAcceso(idUserLogON);
        if (oNoAcceso) {
            return res.json(oNoAcceso);
        }

        // El valor a costo es dato de costo: sin el permiso, este
        // bloque completo no tiene nada que mostrar.
        const bVerCostos = await _fn_tienePermiso(idUserLogON, 'dashboard_VerCostos');

        if (!bVerCostos) {
            return res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data: { bSinPermiso: true }
            });
        }

        const oFechas = _fn_fechas(fecha);

        // Una sola pasada sobre products: totales, las tres cubetas de
        // no-rotación y los que están por debajo de su piso.
        const filas = await dbConnection.query(
            `SELECT
                COUNT(*) AS piezas,
                SUM(P.cost) AS costo,
                SUM(P.price) AS lista,

                SUM(CASE WHEN U.ultima IS NULL THEN 1 ELSE 0 END) AS nuncaPiezas,
                SUM(CASE WHEN U.ultima IS NULL THEN P.cost ELSE 0 END) AS nuncaCosto,

                SUM(CASE WHEN U.ultima IS NOT NULL AND U.ultima < DATE_SUB(:corte, INTERVAL 12 MONTH) THEN 1 ELSE 0 END) AS sin12Piezas,
                SUM(CASE WHEN U.ultima IS NOT NULL AND U.ultima < DATE_SUB(:corte, INTERVAL 12 MONTH) THEN P.cost ELSE 0 END) AS sin12Costo,

                SUM(CASE WHEN U.ultima IS NOT NULL AND U.ultima < DATE_SUB(:corte, INTERVAL 6 MONTH) AND U.ultima >= DATE_SUB(:corte, INTERVAL 12 MONTH) THEN 1 ELSE 0 END) AS sin6Piezas,
                SUM(CASE WHEN U.ultima IS NOT NULL AND U.ultima < DATE_SUB(:corte, INTERVAL 6 MONTH) AND U.ultima >= DATE_SUB(:corte, INTERVAL 12 MONTH) THEN P.cost ELSE 0 END) AS sin6Costo,

                SUM(CASE WHEN P.cost > 0 AND P.price < ROUND(P.cost * 1.30, 2) THEN 1 ELSE 0 END) AS bajoPiso
             FROM products AS P
             LEFT JOIN ( SELECT idProduct, MAX(createDate) AS ultima FROM salesdetail WHERE active = 1 GROUP BY idProduct ) AS U
                ON U.idProduct = P.idProduct
             WHERE P.active = 1`,
            { replacements: { corte: oFechas.dia }, type: dbConnection.QueryTypes.SELECT }
        );

        const f = filas[0] || {};

        const costo = _fn_r(f.costo);

        const _fn_cubeta = (etiqueta, piezas, valor) => ({
            etiqueta,
            piezas: Number(piezas) || 0,
            costo: _fn_r(valor),
            porcentaje: costo > 0 ? _fn_r(_fn_r(valor) / costo * 100) : 0
        });

        const oResp = {
            fecha: oFechas.dia,
            piezas: Number(f.piezas) || 0,
            costo,
            lista: _fn_r(f.lista),
            // Cuántas veces el costo vale el inventario a precio de lista.
            factorLista: costo > 0 ? _fn_r(_fn_r(f.lista) / costo) : 0,
            cubetas: [
                _fn_cubeta('Nunca se ha vendido', f.nuncaPiezas, f.nuncaCosto),
                _fn_cubeta('Sin movimiento 12+ meses', f.sin12Piezas, f.sin12Costo),
                _fn_cubeta('Sin movimiento 6 a 12 meses', f.sin6Piezas, f.sin6Costo)
            ],
            bajoPiso: Number(f.bajoPiso) || 0,
            bSinDatos: (Number(f.piezas) || 0) === 0
        };

        res.json({ status: 0, message: "Ejecutado correctamente.", data: oResp });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// BLOQUE 3 — EL DÍA
//////////////////////////////////////////////////////////////////////////////////////////////////

// Venta (y su costo) de un rango de fechas.
const _fn_getVenta = async(desde, hasta, sFiltroTipo = '') => {

    const filas = await dbConnection.query(
        `SELECT
            COUNT(DISTINCT S.idSale) AS notas,
            ${ _SQL_IMPORTE } AS vendido,
            ${ _SQL_COSTO } AS costo,
            SUM(CASE WHEN PP.idProduct IS NOT NULL THEN D.cantidad ELSE 0 END) AS piezas
         FROM sales AS S
         INNER JOIN salesdetail AS D ON D.idSale = S.idSale AND D.active = 1
         LEFT JOIN products AS PP ON PP.idProduct = D.idProduct
         WHERE ${ _SQL_VENTA_VALIDA }
           AND DATE(S.createDate) BETWEEN :desde AND :hasta
           ${ sFiltroTipo }`,
        { replacements: { desde, hasta }, type: dbConnection.QueryTypes.SELECT }
    );

    return filas[0] || {};

};

// Cobranza de un rango, partida en lo que vino de ventas del mismo día
// y lo que vino de abonos a notas anteriores. Esa partición es el
// corazón del bloque: en noviembre 2024 los abonos fueron el 44% del
// dinero del mes y en 13 de 30 días superaron a la venta del día.
const _fn_getCobrado = async(desde, hasta) => {

    const filas = await dbConnection.query(
        `SELECT
            SUM(CASE WHEN DATE(P.createDate) = DATE(S.createDate) THEN P.pago ELSE 0 END) AS deVentasDelDia,
            SUM(CASE WHEN DATE(P.createDate) > DATE(S.createDate) THEN P.pago ELSE 0 END) AS abonos,
            SUM(P.pago) AS total,
            COUNT(*) AS movimientos
         FROM payments AS P
         INNER JOIN sales AS S ON S.idSale = P.idRelation AND S.active = 1
         WHERE P.active = 1
           AND P.relationType = 'V'
           AND DATE(P.createDate) BETWEEN :desde AND :hasta`,
        { replacements: { desde, hasta }, type: dbConnection.QueryTypes.SELECT }
    );

    return filas[0] || {};

};

const getResumenDia = async(req, res = response) => {

    const { idUserLogON, fecha = '' } = req.body;

    try {

        const oNoAcceso = await _fn_validarAcceso(idUserLogON);
        if (oNoAcceso) {
            return res.json(oNoAcceso);
        }

        const bVerCostos = await _fn_tienePermiso(idUserLogON, 'dashboard_VerCostos');
        const oFechas = _fn_fechas(fecha);

        const sTaller = _TIPOS_TALLER.join(', ');

        const [oHoy, oAntes, oMostrador, oTaller, oCobrado, aFormasPago, aCajas] = await Promise.all([
            _fn_getVenta(oFechas.dia, oFechas.dia),
            _fn_getVenta(oFechas.diaComparativo, oFechas.diaComparativo),
            _fn_getVenta(oFechas.dia, oFechas.dia, `AND S.idSaleType NOT IN (${ sTaller })`),
            _fn_getVenta(oFechas.dia, oFechas.dia, `AND S.idSaleType IN (${ sTaller })`),
            _fn_getCobrado(oFechas.dia, oFechas.dia),

            dbConnection.query(
                `SELECT F.name AS formaPagoDesc, SUM(P.pago) AS monto, COUNT(*) AS movimientos
                 FROM payments AS P
                 LEFT JOIN forma_pago AS F ON F.idFormaPago = P.idFormaPago
                 WHERE P.active = 1 AND DATE(P.createDate) = :dia
                 GROUP BY F.name
                 ORDER BY monto DESC`,
                { replacements: { dia: oFechas.dia }, type: dbConnection.QueryTypes.SELECT }
            ),

            // Cajas activas que no tienen corte del día: riesgo
            // operativo que solo se nota en vivo.
            dbConnection.query(
                `SELECT CJ.idCaja, CJ.name AS cajaDesc
                 FROM cajas AS CJ
                 WHERE CJ.active = 1
                   AND NOT EXISTS (
                       SELECT 1 FROM corte_caja AS CC
                       WHERE CC.idCaja = CJ.idCaja AND CC.active = 1 AND DATE(CC.createDate) = :dia
                   )`,
                { replacements: { dia: oFechas.dia }, type: dbConnection.QueryTypes.SELECT }
            )
        ]);

        const venta = _fn_armarVenta(oHoy, bVerCostos);
        const ventaAntes = _fn_armarVenta(oAntes, bVerCostos);

        const cobrado = {
            total: _fn_r(oCobrado.total),
            deVentasDelDia: _fn_r(oCobrado.deVentasDelDia),
            abonos: _fn_r(oCobrado.abonos),
            movimientos: Number(oCobrado.movimientos) || 0
        };

        cobrado.porcentajeAbonos = cobrado.total > 0 ? _fn_r(cobrado.abonos / cobrado.total * 100) : 0;

        const oResp = {
            fecha: oFechas.dia,
            fechaComparativo: oFechas.diaComparativo,

            venta,
            ventaComparativo: ventaAntes,
            variacionVendido: _fn_variacion(venta.vendido, ventaAntes.vendido),

            cobrado,

            mostrador: _fn_armarVenta(oMostrador, bVerCostos),
            taller: _fn_armarVenta(oTaller, bVerCostos),

            formasPago: aFormasPago.map((f) => ({
                formaPagoDesc: f.formaPagoDesc || 'Sin forma de pago',
                monto: _fn_r(f.monto),
                movimientos: Number(f.movimientos) || 0
            })),

            cajasSinCorte: aCajas,

            bVerCostos,
            // "Sin ventas registradas hoy" y "$0.00" significan cosas
            // distintas: el Front necesita poder distinguirlas.
            bSinDatos: venta.notas === 0 && cobrado.movimientos === 0
        };

        if (bVerCostos) {
            oResp.variacionUtilidad = _fn_variacion(venta.utilidad, ventaAntes.utilidad);
        }

        res.json({ status: 0, message: "Ejecutado correctamente.", data: oResp });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// BLOQUE 3b — POR VENDEDOR
//////////////////////////////////////////////////////////////////////////////////////////////////

// Un renglón por vendedor con actividad en el día, ordenado por
// UTILIDAD GENERADA y no por importe vendido: dos vendedores con el
// mismo importe pueden tener utilidades muy distintas.
//
// El detalle que decide la consulta: las ventas se agrupan por
// `S.idSeller_idUser` y los cobros por `P.idSeller_idUser`, y se unen
// con LEFT JOIN desde `users` (no con un INNER JOIN entre las dos
// agrupaciones). Con un INNER JOIN desaparecería el vendedor que solo
// recibió abonos y no vendió nada — que es justo el caso que este
// bloque existe para mostrar.
//
// Ojo con la atribución de los abonos: `payments.idSeller_idUser` NO
// registra quién cobró, se hereda del vendedor de la nota (verificado:
// en los 4,511 abonos posteriores al día de la venta coincide el 100%
// de las veces). Es la atribución correcta para comisión, pero el
// Front tiene que rotularla para que nadie la lea como "cobranza que
// hizo esa persona hoy".
const getResumenPorVendedor = async(req, res = response) => {

    const { idUserLogON, fecha = '' } = req.body;

    try {

        const oNoAcceso = await _fn_validarAcceso(idUserLogON);
        if (oNoAcceso) {
            return res.json(oNoAcceso);
        }

        const bVerCostos = await _fn_tienePermiso(idUserLogON, 'dashboard_VerCostos');
        const oFechas = _fn_fechas(fecha);

        const filas = await dbConnection.query(
            `SELECT
                U.idUser,
                U.name AS vendedorDesc,
                U.userName,
                IFNULL(V.notas, 0) AS notas,
                IFNULL(V.vendido, 0) AS vendido,
                IFNULL(V.costo, 0) AS costo,
                IFNULL(V.piezas, 0) AS piezas,
                IFNULL(C.deVentasDelDia, 0) AS deVentasDelDia,
                IFNULL(C.abonos, 0) AS abonos
             FROM users AS U

             LEFT JOIN (
                SELECT
                    S.idSeller_idUser AS idUser,
                    COUNT(DISTINCT S.idSale) AS notas,
                    ${ _SQL_IMPORTE } AS vendido,
                    ${ _SQL_COSTO } AS costo,
                    SUM(CASE WHEN PP.idProduct IS NOT NULL THEN D.cantidad ELSE 0 END) AS piezas
                FROM sales AS S
                INNER JOIN salesdetail AS D ON D.idSale = S.idSale AND D.active = 1
                LEFT JOIN products AS PP ON PP.idProduct = D.idProduct
                WHERE ${ _SQL_VENTA_VALIDA } AND DATE(S.createDate) = :dia
                GROUP BY S.idSeller_idUser
             ) AS V ON V.idUser = U.idUser

             LEFT JOIN (
                SELECT
                    P.idSeller_idUser AS idUser,
                    SUM(CASE WHEN DATE(P.createDate) = DATE(S.createDate) THEN P.pago ELSE 0 END) AS deVentasDelDia,
                    SUM(CASE WHEN DATE(P.createDate) > DATE(S.createDate) THEN P.pago ELSE 0 END) AS abonos
                FROM payments AS P
                INNER JOIN sales AS S ON S.idSale = P.idRelation AND S.active = 1
                WHERE P.active = 1 AND P.relationType = 'V' AND DATE(P.createDate) = :dia
                GROUP BY P.idSeller_idUser
             ) AS C ON C.idUser = U.idUser

             WHERE V.idUser IS NOT NULL OR C.idUser IS NOT NULL`,
            { replacements: { dia: oFechas.dia }, type: dbConnection.QueryTypes.SELECT }
        );

        const rows = filas.map((f) => {

            const vendido = _fn_r(f.vendido);
            const costo = _fn_r(f.costo);
            const notas = Number(f.notas) || 0;

            const oFila = {
                idUser: f.idUser,
                vendedorDesc: f.vendedorDesc,
                userName: f.userName,
                notas,
                vendido,
                piezas: _fn_r(f.piezas),
                deVentasDelDia: _fn_r(f.deVentasDelDia),
                abonos: _fn_r(f.abonos),
                // Bandera explícita para el caso que importa: recibió
                // dinero pero no vendió nada. El Front pinta guiones,
                // no ceros, porque "$0" se lee como "vendió cero".
                bSoloCobranza: notas === 0
            };

            if (bVerCostos) {
                oFila.costo = costo;
                oFila.utilidad = _fn_r(vendido - costo);
                oFila.margen = vendido > 0 ? _fn_r((vendido - costo) / vendido * 100) : 0;
            }

            return oFila;

        });

        // Orden por utilidad generada. Sin el permiso de costos no hay
        // utilidad que ordenar, así que cae a importe vendido.
        rows.sort((a, b) => (bVerCostos ? (b.utilidad - a.utilidad) : (b.vendido - a.vendido)));

        const oTotales = {
            notas: rows.reduce((s, x) => s + x.notas, 0),
            vendido: _fn_r(rows.reduce((s, x) => s + x.vendido, 0)),
            deVentasDelDia: _fn_r(rows.reduce((s, x) => s + x.deVentasDelDia, 0)),
            abonos: _fn_r(rows.reduce((s, x) => s + x.abonos, 0))
        };

        if (bVerCostos) {
            oTotales.utilidad = _fn_r(rows.reduce((s, x) => s + x.utilidad, 0));
            oTotales.margen = oTotales.vendido > 0 ? _fn_r(oTotales.utilidad / oTotales.vendido * 100) : 0;
        }

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: { fecha: oFechas.dia, rows, totales: oTotales, bVerCostos, bSinDatos: rows.length === 0 }
        });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// BLOQUE 4 — EL MES
//////////////////////////////////////////////////////////////////////////////////////////////////

const getResumenMes = async(req, res = response) => {

    const { idUserLogON, fecha = '' } = req.body;

    try {

        const oNoAcceso = await _fn_validarAcceso(idUserLogON);
        if (oNoAcceso) {
            return res.json(oNoAcceso);
        }

        const bVerCostos = await _fn_tienePermiso(idUserLogON, 'dashboard_VerCostos');
        const oFechas = _fn_fechas(fecha);

        const [oMes, oMesAnterior, aDiaria] = await Promise.all([
            _fn_getVenta(oFechas.mesIni, oFechas.mesFin),
            _fn_getVenta(oFechas.mesAntIni, oFechas.mesAntFin),

            dbConnection.query(
                `SELECT DATE(S.createDate) AS fecha, ${ _SQL_IMPORTE } AS vendido, COUNT(DISTINCT S.idSale) AS notas
                 FROM sales AS S
                 INNER JOIN salesdetail AS D ON D.idSale = S.idSale AND D.active = 1
                 LEFT JOIN products AS PP ON PP.idProduct = D.idProduct
                 WHERE ${ _SQL_VENTA_VALIDA }
                   AND DATE(S.createDate) BETWEEN :desde AND :hasta
                 GROUP BY DATE(S.createDate)
                 ORDER BY fecha`,
                { replacements: { desde: oFechas.mesIni, hasta: oFechas.mesFin }, type: dbConnection.QueryTypes.SELECT }
            )
        ]);

        const venta = _fn_armarVenta(oMes, bVerCostos);
        const ventaAnterior = _fn_armarVenta(oMesAnterior, bVerCostos);

        const oResp = {
            desde: oFechas.mesIni,
            hasta: oFechas.mesFin,
            desdeComparativo: oFechas.mesAntIni,
            hastaComparativo: oFechas.mesAntFin,

            venta,
            ventaComparativo: ventaAnterior,

            variacionVendido: _fn_variacion(venta.vendido, ventaAnterior.vendido),

            ticket: venta.notas > 0 ? _fn_r(venta.vendido / venta.notas) : 0,
            ticketComparativo: ventaAnterior.notas > 0 ? _fn_r(ventaAnterior.vendido / ventaAnterior.notas) : 0,

            diaria: aDiaria.map((d) => ({
                fecha: d.fecha,
                vendido: _fn_r(d.vendido),
                notas: Number(d.notas) || 0
            })),

            bVerCostos,
            bSinDatos: venta.notas === 0
        };

        oResp.variacionTicket = _fn_variacion(oResp.ticket, oResp.ticketComparativo);

        if (bVerCostos) {
            oResp.variacionUtilidad = _fn_variacion(venta.utilidad, ventaAnterior.utilidad);
            // El margen se compara en PUNTOS porcentuales, no en % de %:
            // "el margen subió 14.5 puntos" se entiende, "subió 79%" no.
            oResp.variacionMargenPuntos = _fn_r(venta.margen - ventaAnterior.margen);
        }

        res.json({ status: 0, message: "Ejecutado correctamente.", data: oResp });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// BLOQUE 5 — OPERACIÓN
//////////////////////////////////////////////////////////////////////////////////////////////////

const getOperacion = async(req, res = response) => {

    const { idUserLogON, fecha = '' } = req.body;

    try {

        const oNoAcceso = await _fn_validarAcceso(idUserLogON);
        if (oNoAcceso) {
            return res.json(oNoAcceso);
        }

        const oFechas = _fn_fechas(fecha);
        const sTaller = _TIPOS_TALLER.join(', ');

        const [aTaller, aDetenidos, aAsistencia, aComisiones] = await Promise.all([

            // Estatus ACTUAL de cada folio: el renglón más reciente de
            // su bitácora, no todos los renglones.
            //
            // El JOIN a `sales` no sobra: `sobre_taller_status` NO es
            // solo de taller — guarda el sobre físico de cualquier
            // venta que lleve uno (10,655 folios de taller, pero
            // también 2,653 de contado, 214 de apartado, 27 de crédito
            // y 19 de consignación). Sin acotar a los tipos de taller,
            // este bloque mezclaría el flujo del taller con sobres de
            // mostrador y los "más detenidos" saldrían siendo
            // apartados.
            dbConnection.query(
                `SELECT SC.idStatusSobre, SC.nombre AS estatusDesc, COUNT(*) AS folios
                 FROM sobre_taller_status AS ST
                 INNER JOIN (
                    SELECT idSale, MAX(idSobreTallerStatus) AS ultimo
                    FROM sobre_taller_status
                    WHERE createDate <= :hasta
                    GROUP BY idSale
                 ) AS U ON U.ultimo = ST.idSobreTallerStatus
                 INNER JOIN sobre_status_cat AS SC ON SC.idStatusSobre = ST.idStatusSobre
                 INNER JOIN sales AS S ON S.idSale = ST.idSale AND S.active = 1
                 WHERE S.idSaleType IN (${ sTaller })
                 GROUP BY SC.idStatusSobre, SC.nombre
                 ORDER BY folios DESC`,
                { replacements: { hasta: `${ oFechas.dia } 23:59:59` }, type: dbConnection.QueryTypes.SELECT }
            ),

            // Los que llevan más días sin cambiar de estatus. Sin
            // "Entregado" (5): un folio entregado ya terminó, no está
            // detenido.
            dbConnection.query(
                `SELECT ST.idSale, SC.nombre AS estatusDesc, ST.createDate,
                        DATEDIFF(:dia, ST.createDate) AS dias
                 FROM sobre_taller_status AS ST
                 INNER JOIN (
                    SELECT idSale, MAX(idSobreTallerStatus) AS ultimo
                    FROM sobre_taller_status
                    WHERE createDate <= :hasta
                    GROUP BY idSale
                 ) AS U ON U.ultimo = ST.idSobreTallerStatus
                 INNER JOIN sobre_status_cat AS SC ON SC.idStatusSobre = ST.idStatusSobre
                 INNER JOIN sales AS S ON S.idSale = ST.idSale AND S.active = 1
                 WHERE ST.idStatusSobre <> 5
                   AND S.idSaleType IN (${ sTaller })
                 ORDER BY dias DESC
                 LIMIT 5`,
                {
                    replacements: { dia: oFechas.dia, hasta: `${ oFechas.dia } 23:59:59` },
                    type: dbConnection.QueryTypes.SELECT
                }
            ),

            dbConnection.query(
                `SELECT
                    COUNT(*) AS jornadas,
                    SUM(CASE WHEN J.bFalta = 1 THEN 1 ELSE 0 END) AS faltas,
                    SUM(CASE WHEN J.bRetardo = 1 THEN 1 ELSE 0 END) AS retardos,
                    SUM(CASE WHEN J.bIncompleta = 1 THEN 1 ELSE 0 END) AS incompletas
                 FROM timecard_jornadas AS J
                 WHERE J.fecha = :dia`,
                { replacements: { dia: oFechas.dia }, type: dbConnection.QueryTypes.SELECT }
            ),

            dbConnection.query(
                `SELECT COUNT(*) AS renglones, IFNULL(SUM(CT.monto), 0) AS monto
                 FROM comisiones_track AS CT
                 WHERE CT.estatus = 'PENDIENTE' AND CT.fecha <= :dia`,
                { replacements: { dia: oFechas.dia }, type: dbConnection.QueryTypes.SELECT }
            )
        ]);

        const oAsistencia = aAsistencia[0] || {};
        const oComisiones = aComisiones[0] || {};

        const iJornadas = Number(oAsistencia.jornadas) || 0;
        const iComisiones = Number(oComisiones.renglones) || 0;

        const oResp = {
            fecha: oFechas.dia,

            taller: {
                estatus: aTaller.map((t) => ({
                    idStatusSobre: t.idStatusSobre,
                    estatusDesc: t.estatusDesc,
                    folios: Number(t.folios) || 0
                })),
                detenidos: aDetenidos.map((d) => ({
                    idSale: d.idSale,
                    estatusDesc: d.estatusDesc,
                    dias: Number(d.dias) || 0
                })),
                bSinDatos: aTaller.length === 0
            },

            asistencia: {
                jornadas: iJornadas,
                faltas: Number(oAsistencia.faltas) || 0,
                retardos: Number(oAsistencia.retardos) || 0,
                incompletas: Number(oAsistencia.incompletas) || 0,
                // Sin registros NO es lo mismo que "todos faltaron".
                bSinDatos: iJornadas === 0
            },

            comisiones: {
                renglones: iComisiones,
                monto: _fn_r(oComisiones.monto),
                bSinDatos: iComisiones === 0
            }
        };

        res.json({ status: 0, message: "Ejecutado correctamente.", data: oResp });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

module.exports = {
    getCartera
    , getCarteraTop
    , getInventario
    , getResumenDia
    , getResumenPorVendedor
    , getResumenMes
    , getOperacion
}
