const { response } = require('express');

const { dbConnection } = require('../database/config');

// Las definiciones de QUÉ registros componen cada cifra viven en un solo
// archivo, compartido con los endpoints de conjunto (analisis/015): así
// el panel y el listado al que lleva un clic no pueden decir cosas
// distintas.
const {
    _TIPOS_TALLER,
    _SQL_FILTRO_MOSTRADOR,
    _SQL_FILTRO_TALLER,
    _SQL_IMPORTE,
    _SQL_COSTO,
    _SQL_PIEZAS,
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
    _CONJUNTOS
} = require('../helpers/panelDefiniciones');

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
// (La consulta vive en helpers/panelDefiniciones.js: _SQL_CARTERA_BASE.)

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
                ${ _SQL_CARTERA_CUBETA } AS bucket,
                COUNT(*) AS notas,
                SUM(T.saldo) AS saldo
             FROM ( ${ _SQL_CARTERA_BASE } ) AS T
             WHERE ${ _SQL_CARTERA_CON_SALDO }
             GROUP BY T.idSaleType, bucket`,
            { replacements: { corte: oFechas.dia }, type: dbConnection.QueryTypes.SELECT }
        );

        const _fn_vacio = () => ({ notas: 0, saldo: 0 });

        const oResp = {
            fecha: oFechas.dia,
            total: _fn_vacio(),
            apartados: _fn_vacio(),
            creditos: _fn_vacio(),
            antiguedad: _CARTERA_CUBETAS.map((c) => ({ clave: c.clave, etiqueta: c.etiqueta, ..._fn_vacio() }))
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
             WHERE ${ _SQL_CARTERA_CON_SALDO }
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

                SUM(CASE WHEN ${ _SQL_INV_NUNCA } THEN 1 ELSE 0 END) AS nuncaPiezas,
                SUM(CASE WHEN ${ _SQL_INV_NUNCA } THEN P.cost ELSE 0 END) AS nuncaCosto,

                SUM(CASE WHEN ${ _SQL_INV_12 } THEN 1 ELSE 0 END) AS sin12Piezas,
                SUM(CASE WHEN ${ _SQL_INV_12 } THEN P.cost ELSE 0 END) AS sin12Costo,

                SUM(CASE WHEN ${ _SQL_INV_6 } THEN 1 ELSE 0 END) AS sin6Piezas,
                SUM(CASE WHEN ${ _SQL_INV_6 } THEN P.cost ELSE 0 END) AS sin6Costo,

                SUM(CASE WHEN ${ _SQL_INV_BAJO_PISO } THEN 1 ELSE 0 END) AS bajoPiso
             ${ _SQL_INV_FROM }`,
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
                _fn_cubeta(_INV_ETIQUETAS.nunca, f.nuncaPiezas, f.nuncaCosto),
                _fn_cubeta(_INV_ETIQUETAS.sin12, f.sin12Piezas, f.sin12Costo),
                _fn_cubeta(_INV_ETIQUETAS.sin6, f.sin6Piezas, f.sin6Costo)
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
            ${ _SQL_PIEZAS } AS piezas
         ${ fn_sqlVentaFrom(sFiltroTipo) }`,
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
            ${ _SQL_COBRADO_DE_VENTAS_DEL_DIA } AS deVentasDelDia,
            ${ _SQL_COBRADO_ABONOS } AS abonos,
            SUM(P.pago) AS total,
            COUNT(*) AS movimientos
         ${ fn_sqlCobradoFrom() }`,
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

        const [oHoy, oAntes, oMostrador, oTaller, oCobrado, aFormasPago, aCajas] = await Promise.all([
            _fn_getVenta(oFechas.dia, oFechas.dia),
            _fn_getVenta(oFechas.diaComparativo, oFechas.diaComparativo),
            _fn_getVenta(oFechas.dia, oFechas.dia, _SQL_FILTRO_MOSTRADOR),
            _fn_getVenta(oFechas.dia, oFechas.dia, _SQL_FILTRO_TALLER),
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
                    ${ _SQL_PIEZAS } AS piezas
                ${ fn_sqlVentaFrom() }
                GROUP BY S.idSeller_idUser
             ) AS V ON V.idUser = U.idUser

             LEFT JOIN (
                SELECT
                    P.idSeller_idUser AS idUser,
                    ${ _SQL_COBRADO_DE_VENTAS_DEL_DIA } AS deVentasDelDia,
                    ${ _SQL_COBRADO_ABONOS } AS abonos
                ${ fn_sqlCobradoFrom() }
                GROUP BY P.idSeller_idUser
             ) AS C ON C.idUser = U.idUser

             WHERE V.idUser IS NOT NULL OR C.idUser IS NOT NULL`,
            { replacements: { desde: oFechas.dia, hasta: oFechas.dia }, type: dbConnection.QueryTypes.SELECT }
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
                 ${ fn_sqlVentaFrom() }
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

//////////////////////////////////////////////////////////////////////////////////////////////////
// CONJUNTOS — lo que hay detrás de cada cifra (analisis/015)
//
// Cuando el usuario hace clic en una cifra del panel, la pantalla
// destino (ventas, pagos o productos) pide aquí EXACTAMENTE los
// registros que el panel contó. La lista de registros se arma con la
// misma definición que la cifra (helpers/panelDefiniciones.js) y se
// cruza del lado del servidor: nunca viaja por la red ni por la URL.
//
// Lo que sí se cuida en cada consulta:
//   - Permiso del panel, permiso del MENÚ de la pantalla destino (las
//     rutas del Front no tienen guardia: el menú es la única puerta) y,
//     si el conjunto se deriva de costos, dashboard_VerCostos.
//   - La misma restricción de sucursal que la pantalla normal. Por eso
//     se devuelven dos números: iConjunto (lo que contó el panel, toda
//     la empresa) e iVisibles (lo que este usuario puede ver).
//   - Los renglones con la MISMA forma que la lista normal, para que la
//     tabla existente los pinte sin cambios.
//////////////////////////////////////////////////////////////////////////////////////////////////

// ¿El usuario tiene el menú de la pantalla destino? Mismo camino que el
// SP `getMenuFathersByPermission` del sistema: por rol ('R', vía
// rolesconfig) o directo al usuario ('U'), con las dos banderas active.
const _fn_tieneMenu = async(idUser, linkList) => {

    const filas = await dbConnection.query(
        `SELECT 1 AS ok
         FROM menus AS M
         INNER JOIN menupermisos AS MP ON MP.idMenu = M.idMenu AND MP.typeRelation = 'R' AND MP.active = 1
         INNER JOIN rolesconfig AS RC ON RC.idRol = MP.idRelation
         WHERE M.linkList = :linkList AND M.active = 1 AND M.idAplication = 1 AND RC.idUser = :idUser
         UNION
         SELECT 1 AS ok
         FROM menus AS M
         INNER JOIN menupermisos AS MP ON MP.idMenu = M.idMenu AND MP.typeRelation = 'U' AND MP.active = 1
         WHERE M.linkList = :linkList AND M.active = 1 AND M.idAplication = 1 AND MP.idRelation = :idUser
         LIMIT 1`,
        { replacements: { idUser, linkList }, type: dbConnection.QueryTypes.SELECT }
    );

    return filas.length > 0;

};

// 'AAAA-MM-DD' que además sea una fecha real (no 2026-02-31).
const _fn_fechaValida = (sFecha) => {

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(sFecha))) {
        return false;
    }

    const d = new Date(`${ sFecha }T12:00:00`);
    const fmt = `${ d.getFullYear() }-${ String(d.getMonth() + 1).padStart(2, '0') }-${ String(d.getDate()).padStart(2, '0') }`;

    return fmt === sFecha;

};

const _fn_entero = (v, iDefault, iMin, iMax) => {
    const n = Number(v);
    if (!Number.isInteger(n)) {
        return iDefault;
    }
    return Math.min(Math.max(n, iMin), iMax);
};

const _fn_error = (message) => ({ oError: { status: 1, message } });

// Valida la petición y resuelve la clave del conjunto. Devuelve
// { oError } si no puede seguir, o { oDef, sIdsJson, meta }.
const _fn_resolverConjunto = async(body, sDestino) => {

    const {
        idUserLogON,
        panel = '',
        fecha = '',
        idVendedor = 0,
        idSale = ''
    } = body;

    const oNoAcceso = await _fn_validarAcceso(idUserLogON);
    if (oNoAcceso) {
        return { oError: oNoAcceso };
    }

    // hasOwnProperty y no `in`: una clave como "constructor" no puede
    // colarse como si fuera un conjunto.
    const oDef = Object.prototype.hasOwnProperty.call(_CONJUNTOS, panel) ? _CONJUNTOS[panel] : null;

    if (!oDef) {
        return _fn_error('La consulta del panel no existe.');
    }

    if (oDef.destino !== sDestino) {
        return _fn_error('Esa consulta del panel no corresponde a esta pantalla.');
    }

    if (fecha && !_fn_fechaValida(fecha)) {
        return _fn_error('La fecha de la consulta no es válida.');
    }

    const p = { fecha: _fn_fechas(fecha).dia };

    if (oDef.requiere.includes('idVendedor')) {

        const nVendedor = Number(idVendedor);

        if (!Number.isInteger(nVendedor) || nVendedor <= 0) {
            return _fn_error('Falta el vendedor de la consulta.');
        }

        p.idVendedor = nVendedor;

        const [oVendedor] = await dbConnection.query(
            `SELECT name FROM users WHERE idUser = :idVendedor LIMIT 1`,
            { replacements: { idVendedor: nVendedor }, type: dbConnection.QueryTypes.SELECT }
        );

        p.vendedorDesc = oVendedor ? oVendedor.name : '';

    }

    if (oDef.requiere.includes('idSale')) {

        const sFolio = String(idSale || '').trim();

        if (!sFolio || sFolio.length > 100) {
            return _fn_error('Falta el folio de la consulta.');
        }

        p.idSale = sFolio;

    }

    const bMenu = await _fn_tieneMenu(idUserLogON, oDef.menu);
    if (!bMenu) {
        return _fn_error('No tienes permiso para ver esa pantalla.');
    }

    // Saber QUÉ productos están bajo su piso ya es información de
    // costo, aunque el listado no enseñe la columna.
    if (oDef.bCostos) {
        const bVerCostos = await _fn_tienePermiso(idUserLogON, 'dashboard_VerCostos');
        if (!bVerCostos) {
            return _fn_error('Esta consulta se deriva de costos y requiere autorización.');
        }
    }

    const oSql = oDef.fn_sql();
    const oRepl = oDef.fn_repl(p);

    // La definición del conjunto se ejecuta UNA sola vez: de aquí sale la
    // lista de ids, y el conteo, los visibles y la página se cruzan contra
    // esa lista por llave primaria (JSON_TABLE). Volver a meter la
    // definición completa en cada una de esas consultas repetiría el
    // cálculo — en cartera eran cuatro pasadas por página.
    const [aResumen, aIds] = await Promise.all([
        dbConnection.query(oSql.resumen, { replacements: oRepl, type: dbConnection.QueryTypes.SELECT }),
        dbConnection.query(oSql.ids, { replacements: oRepl, type: dbConnection.QueryTypes.SELECT })
    ]);

    const oResumen = aResumen[0] || {};

    // Cada consulta de ids devuelve una sola columna (idSale, idPayment o
    // idProduct).
    const aLista = aIds.map((r) => r[Object.keys(r)[0]]);

    return {
        oDef,
        sIdsJson: JSON.stringify(aLista),
        meta: {
            panel,
            etiqueta: oDef.fn_etiqueta(p),
            fecha: p.fecha,
            iConjunto: aLista.length,
            resumen: {
                conteo: Number(oResumen.conteo) || 0,
                importe: _fn_r(oResumen.importe)
            }
        }
    };

};

// ── Ventas ──
// Renglones con la forma de `getVentasListWithPage`. OJO: ese SP excluye
// idSaleType 5 (sobre de taller) y aquí NO — el panel sí los cuenta en
// "Vendido" y en "Taller", y el listado tiene que mostrar lo que el panel
// contó. Tampoco se toca el SP: BackProdLocal lo usa con su firma actual.
const getVentasConjunto = async(req, res = response) => {

    const { idUserLogON, idSucursalLogON = 0, start = 0, limiter = 10 } = req.body;

    try {

        const o = await _fn_resolverConjunto(req.body, 'ventas');
        if (o.oError) {
            return res.json(o.oError);
        }

        const oRepl = {
            ids: o.sIdsJson,
            idUserLogON,
            idSucursal: _fn_entero(idSucursalLogON, 0, 0, 999999),
            start: _fn_entero(start, 0, 0, 100000000),
            limiter: _fn_entero(limiter, 10, 1, 1000)
        };

        // Los mismos INNER JOIN que el SP de la lista: una nota cuyo
        // vendedor o cliente no exista tampoco saldría en la lista normal.
        // FROM y WHERE van separados a propósito: la consulta de renglones
        // mete sus LEFT JOIN entre los dos.
        //
        // La columna de JSON_TABLE lleva la MISMA collation que
        // sales.idSale (utf8mb3_general_ci): con otra, MySQL no puede usar
        // la llave primaria para el cruce.
        const sFromVisibles = `
            FROM JSON_TABLE( :ids, '$[*]' COLUMNS ( idSale VARCHAR(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci PATH '$' ) ) AS CJ
            INNER JOIN sales AS S ON S.idSale = CJ.idSale
            INNER JOIN sucursalesconfig AS SC ON SC.idSucursal = S.idSucursal AND SC.idUser = :idUserLogON
            INNER JOIN sucursales AS SS ON SS.idSucursal = S.idSucursal
            INNER JOIN users AS U ON U.idUser = S.idSeller_idUser
            INNER JOIN customers AS C ON C.idCustomer = S.idCustomer
            INNER JOIN sales_type AS ST ON ST.idSaleType = S.idSaleType`;

        const sWhereVisibles = `WHERE ( :idSucursal = 0 OR S.idSucursal = :idSucursal )`;

        // Total y abonado de una nota, tal como los pinta la tabla.
        // `SD.active = S.active` y `PP.active = S.active` reproducen lo que
        // el SP hace con p_bCancel: de una nota cancelada se suman sus
        // líneas y pagos cancelados. Los usan la página y el sumario, para
        // que las tarjetas sumen exactamente lo que muestra la tabla.
        const sSqlTotal = `ROUND( IFNULL( ( SELECT SUM(SD.importe) FROM salesdetail AS SD WHERE SD.idSale = S.idSale AND SD.active = S.active ), 0), 2)`;
        const sSqlAbonado = `ROUND( IFNULL( ( SELECT SUM(PP.pago) FROM payments AS PP WHERE PP.idRelation = S.idSale AND PP.relationType IN ('V','A') AND PP.active = S.active ), 0), 2)`;

        const [aVisibles, rows, aSumario] = await Promise.all([

            dbConnection.query(`SELECT COUNT(*) AS n ${ sFromVisibles } ${ sWhereVisibles }`, { replacements: oRepl, type: dbConnection.QueryTypes.SELECT }),

            // Total y abonado se calculan solo para la página, no para
            // toda la tabla de ventas.
            dbConnection.query(
                `SELECT
                    R.*,
                    CASE WHEN R.idSaleType = 6 THEN 0 ELSE ROUND(R.total - R.abonado, 2) END AS pendingAmount
                 FROM (
                    SELECT
                        S.keyx AS _orden
                        , S.idSale
                        , S.createDate
                        , DATE_FORMAT( S.createDate, '%d-%m-%Y') AS createDateDate
                        , DATE_FORMAT( S.createDate, '%h:%i:%s %p') AS createDateHours
                        , S.idSucursal
                        , SS.name AS sucursalDesc
                        , S.idSeller_idUser
                        , U.name AS sellerName
                        , S.idCustomer
                        , CONCAT( C.lastName, ' ', C.name ) AS customerName
                        , S.idSaleType
                        , CASE
                            WHEN S.idSaleType = 5 AND STS.fechaEntrega IS NULL THEN CONCAT( ST.name, ' (', SSC.nombre, ')' )
                            WHEN S.idSaleType = 5 AND STS.fechaEntrega IS NOT NULL THEN CONCAT( ST.name, ' (', SSC.nombre, ')', ' FE: ', DATE_FORMAT( STS.fechaEntrega, '%d-%m-%Y') )
                            WHEN S.idSaleType = 3 AND S.fechaEntrega IS NOT NULL THEN CONCAT( ST.name, ' - Entregado ', DATE_FORMAT( S.fechaEntrega, '%d-%m-%Y') )
                            ELSE ST.name END AS saleTypeDesc
                        , ${ sSqlTotal } AS total
                        , ${ sSqlAbonado } AS abonado
                        , IFNULL( (
                            SELECT CASE WHEN S.idSaleType <> 5 THEN GROUP_CONCAT( P.name ) ELSE SD.descriptionTaller END
                            FROM salesdetail AS SD
                            INNER JOIN products AS P ON SD.idProduct = P.idProduct
                            WHERE SD.idSale = S.idSale AND SD.active = S.active
                            GROUP BY SD.idSale, SD.descriptionTaller
                            LIMIT 1
                        ), 0) AS ventaDesc
                        , IFNULL( (
                            SELECT ROUND( SUM( PP.pago ), 2)
                            FROM payments AS PP
                            INNER JOIN corte_caja_ingresos AS CCI ON PP.idPayment = CCI.idPayment
                            WHERE PP.active = 1
                              AND PP.relationType IN ('V','A')
                              AND PP.idRelation = S.idSale
                              AND PP.idFormaPago <> 5
                        ), 0) AS pagosYaEnCorte
                        , S.active
                        , S.fechaEntrega
                        , S.idUserEntrega
                        , UE.name AS userEntregaName
                    ${ sFromVisibles }
                    LEFT JOIN users AS UE ON UE.idUser = S.idUserEntrega
                    LEFT JOIN sobre_taller_status AS STS ON STS.idSale = S.idSale AND STS.idSucursal = S.idSucursal
                    LEFT JOIN sobre_status_cat AS SSC ON SSC.idStatusSobre = STS.idStatusSobre
                    ${ sWhereVisibles }
                    ORDER BY S.keyx DESC
                    LIMIT :start, :limiter
                 ) AS R
                 ORDER BY R._orden DESC`,
                { replacements: oRepl, type: dbConnection.QueryTypes.SELECT }
            ),

            // Sumario para las tarjetas de la pantalla: de TODAS las notas
            // visibles del conjunto, no de la página. Pendiente con la
            // misma regla que la columna (una cotización no debe nada).
            dbConnection.query(
                `SELECT
                    X.idSaleType
                    , X.saleTypeName
                    , COUNT(*) AS notas
                    , ROUND( SUM(X.total), 2) AS total
                    , ROUND( SUM(X.abonado), 2) AS abonado
                    , ROUND( SUM( CASE WHEN X.idSaleType = 6 THEN 0 ELSE ROUND(X.total - X.abonado, 2) END ), 2) AS pendiente
                 FROM (
                    SELECT
                        S.idSaleType
                        , ST.name AS saleTypeName
                        , ${ sSqlTotal } AS total
                        , ${ sSqlAbonado } AS abonado
                    ${ sFromVisibles }
                    ${ sWhereVisibles }
                 ) AS X
                 GROUP BY X.idSaleType, X.saleTypeName
                 ORDER BY notas DESC, X.idSaleType`,
                { replacements: oRepl, type: dbConnection.QueryTypes.SELECT }
            )

        ]);

        const iVisibles = Number(aVisibles[0] && aVisibles[0].n) || 0;

        // Mismo tipo que devuelve el SP (sus totales salen de una tabla
        // temporal FLOAT): números, no los strings de un DECIMAL.
        rows.forEach((r) => {
            delete r._orden;
            r.total = Number(r.total) || 0;
            r.abonado = Number(r.abonado) || 0;
            r.pendingAmount = Number(r.pendingAmount) || 0;
            r.pagosYaEnCorte = Number(r.pagosYaEnCorte) || 0;
        });

        const aTipos = aSumario.map((t) => ({
            idSaleType: t.idSaleType,
            saleTypeName: t.saleTypeName,
            notas: Number(t.notas) || 0,
            total: _fn_r(t.total),
            abonado: _fn_r(t.abonado),
            pendiente: _fn_r(t.pendiente)
        }));

        const sumario = {
            notas: aTipos.reduce((n, t) => n + t.notas, 0),
            total: _fn_r(aTipos.reduce((n, t) => n + t.total, 0)),
            abonado: _fn_r(aTipos.reduce((n, t) => n + t.abonado, 0)),
            pendiente: _fn_r(aTipos.reduce((n, t) => n + t.pendiente, 0)),
            tipos: aTipos
        };

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: { count: iVisibles, rows, meta: { ...o.meta, iVisibles, sumario } }
        });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// ── Pagos ──
// Renglones con la forma de `getRepPagosWithPage`, y la suma en
// `OSQL_Sum[0].sumPagos`, que es donde la pantalla la lee.
const getPagosConjunto = async(req, res = response) => {

    const { idUserLogON, idSucursalLogON = 0, start = 0, limiter = 10 } = req.body;

    try {

        const o = await _fn_resolverConjunto(req.body, 'pagos');
        if (o.oError) {
            return res.json(o.oError);
        }

        const oRepl = {
            ids: o.sIdsJson,
            idUserLogON,
            idSucursal: _fn_entero(idSucursalLogON, 0, 0, 999999),
            start: _fn_entero(start, 0, 0, 100000000),
            limiter: _fn_entero(limiter, 10, 1, 1000)
        };

        // Misma collation que payments.idPayment, por la llave primaria.
        const sFromVisibles = `
            FROM JSON_TABLE( :ids, '$[*]' COLUMNS ( idPayment VARCHAR(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci PATH '$' ) ) AS CJ
            INNER JOIN payments AS P ON P.idPayment = CJ.idPayment
            INNER JOIN sales AS S ON S.idSale = P.idRelation
            INNER JOIN sucursalesconfig AS SC ON SC.idSucursal = S.idSucursal AND SC.idUser = :idUserLogON
            INNER JOIN sucursales AS SS ON SS.idSucursal = S.idSucursal
            INNER JOIN users AS U ON U.idUser = S.idSeller_idUser
            INNER JOIN customers AS C ON C.idCustomer = S.idCustomer
            WHERE ( :idSucursal = 0 OR S.idSucursal = :idSucursal )`;

        const [aVisibles, rows, aFormas] = await Promise.all([

            // Conteo, suma y la misma partición que la tarjeta "Cobrado" del
            // panel (de ventas del día / abonos), de TODOS los pagos
            // visibles, no de la página.
            dbConnection.query(
                `SELECT
                    COUNT(*) AS n
                    , IFNULL(SUM(P.pago), 0) AS sumPagos
                    , IFNULL(${ _SQL_COBRADO_DE_VENTAS_DEL_DIA }, 0) AS deVentasDelDia
                    , IFNULL(${ _SQL_COBRADO_ABONOS }, 0) AS abonos
                 ${ sFromVisibles }`,
                { replacements: oRepl, type: dbConnection.QueryTypes.SELECT }
            ),

            dbConnection.query(
                `SELECT
                    P.idPayment
                    , S.idSale
                    , P.createDate
                    , DATE_FORMAT( P.createDate, '%d-%m-%Y') AS createDateDate
                    , DATE_FORMAT( P.createDate, '%h:%i:%s %p') AS createDateHours
                    , S.idSucursal
                    , SS.name AS sucursalDesc
                    , S.idSeller_idUser
                    , U.name AS sellerName
                    , S.idCustomer
                    , CONCAT( C.lastName, ' ', C.name ) AS customerName
                    , ROUND( IFNULL( P.pago, 0), 2) AS totalPago
                    , IFNULL( ( SELECT CCI.idCorteCaja FROM corte_caja_ingresos AS CCI WHERE CCI.idPayment = P.idPayment LIMIT 1 ), '') AS idCorteCaja
                 ${ sFromVisibles }
                 ORDER BY P.keyx DESC
                 LIMIT :start, :limiter`,
                { replacements: oRepl, type: dbConnection.QueryTypes.SELECT }
            ),

            // Por forma de pago, de los mismos pagos visibles. Se agrupa por
            // id adentro y el nombre se cruza afuera (ONLY_FULL_GROUP_BY).
            dbConnection.query(
                `SELECT
                    IFNULL( F.name, 'Sin forma de pago' ) AS formaPagoDesc
                    , T.movimientos
                    , T.monto
                 FROM (
                    SELECT X.idFormaPago, COUNT(*) AS movimientos, ROUND( SUM(X.pago), 2) AS monto
                    FROM ( SELECT P.idFormaPago, P.pago ${ sFromVisibles } ) AS X
                    GROUP BY X.idFormaPago
                 ) AS T
                 LEFT JOIN forma_pago AS F ON F.idFormaPago = T.idFormaPago
                 ORDER BY T.monto DESC`,
                { replacements: oRepl, type: dbConnection.QueryTypes.SELECT }
            )

        ]);

        const iVisibles = Number(aVisibles[0] && aVisibles[0].n) || 0;

        rows.forEach((r) => { r.totalPago = Number(r.totalPago) || 0; });

        const oVis = aVisibles[0] || {};

        const sumario = {
            movimientos: iVisibles,
            total: _fn_r(oVis.sumPagos),
            deVentasDelDia: _fn_r(oVis.deVentasDelDia),
            abonos: _fn_r(oVis.abonos),
            formas: aFormas.map((f) => ({
                formaPagoDesc: f.formaPagoDesc,
                movimientos: Number(f.movimientos) || 0,
                monto: _fn_r(f.monto)
            }))
        };

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                count: iVisibles,
                rows,
                OSQL_Sum: [{ sumPagos: sumario.total }],
                meta: { ...o.meta, iVisibles, sumario }
            }
        });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// ── Productos ──
// Renglones con la forma de `getProductsListWithPage`. Todos estos
// conjuntos exigen el permiso de costos (lo valida _fn_resolverConjunto).
const getProductosConjunto = async(req, res = response) => {

    const { idUserLogON, start = 0, limiter = 10 } = req.body;

    try {

        const o = await _fn_resolverConjunto(req.body, 'productos');
        if (o.oError) {
            return res.json(o.oError);
        }

        const oRepl = {
            ids: o.sIdsJson,
            idUserLogON,
            start: _fn_entero(start, 0, 0, 100000000),
            limiter: _fn_entero(limiter, 10, 1, 1000)
        };

        // Mismos INNER JOIN que el SP del catálogo (grupos y familias): un
        // producto sin grupo tampoco sale en la lista normal.
        const sFromVisibles = `
            FROM JSON_TABLE( :ids, '$[*]' COLUMNS ( idProduct BIGINT PATH '$' ) ) AS CJ
            INNER JOIN products AS P ON P.idProduct = CJ.idProduct
            INNER JOIN \`groups\` AS G ON G.idGroup = P.idGroup
            INNER JOIN \`families\` AS F ON F.idFamily = P.idFamily
            INNER JOIN sucursalesconfig AS SC ON SC.idSucursal = P.idSucursal AND SC.idUser = :idUserLogON`;

        const [aVisibles, rows] = await Promise.all([

            dbConnection.query(`SELECT COUNT(*) AS n ${ sFromVisibles }`, { replacements: oRepl, type: dbConnection.QueryTypes.SELECT }),

            dbConnection.query(
                `SELECT
                    P.idProduct
                    , P.createDate
                    , P.barCode
                    , CONCAT( UPPER( G.name ), '-', P.name ) AS name
                    , ROUND( P.gramos, 2) AS gramos
                    , ROUND( P.cost, 2) AS cost
                    , ROUND( P.price, 2) AS price
                    , P.active
                    , IFNULL( (
                        SELECT ROUND( SUM( IL.cantidad ), 2)
                        FROM inventarylog AS IL
                        WHERE IL.active = 1 AND IL.idProduct = P.idProduct AND ( IL.firmaVer = 0 OR IL.firmaMost = 0 )
                    ), 0) AS catInventaryVerify
                    , IFNULL( (
                        SELECT ROUND( SUM( IL.cantidad ), 2)
                        FROM inventarylog AS IL
                        WHERE IL.active = 1 AND IL.idProduct = P.idProduct AND IL.firmaVer = 1 AND IL.firmaMost = 1
                    ), 0) AS catInventary
                 ${ sFromVisibles }
                 ORDER BY P.idProduct DESC
                 LIMIT :start, :limiter`,
                { replacements: oRepl, type: dbConnection.QueryTypes.SELECT }
            )

        ]);

        const iVisibles = Number(aVisibles[0] && aVisibles[0].n) || 0;

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: { count: iVisibles, rows, meta: { ...o.meta, iVisibles } }
        });

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
    , getVentasConjunto
    , getPagosConjunto
    , getProductosConjunto
}
