// ══════════════════════════════════════════════════════════════
// UTILIDAD DE LA VENTA (analisis/026-utilidad-de-venta.md)
//
// Lo mismo que `tallerUtilidad.js` hace con los folios, aquí con las
// ventas de mostrador: `sales.utilidad` y `sales.utilidadCobrada` viven
// guardadas y quien las consulta solo las lee.
//
// Cómo se forma:
//   Utilidad bruta = SUM(importe) - SUM(cost * cantidad) de los
//                    renglones activos (el criterio de siempre).
//   Utilidad       = bruta - comisión del vendedor.
//   Cobrada        = utilidad x (cobrado / total), tope 1.
//
// La comisión es la REAL cuando la venta ya la generó (incluidas sus
// reversas, que van en negativo); mientras no, la que le tocaría con el
// % vigente del vendedor. El monto y el % usados se guardan también en
// la venta (`sales.comisionMonto` y `sales.comisionPorcentaje`), para
// tenerlos a la mano sin cruzar con `comisiones_track`. Igual que el
// destajo en taller: estimada mientras no se paga, congelada en cuanto
// se paga.
//
// Solo contado, crédito y apartado. Cotización, consignación y los
// folios de taller quedan en 0 — el taller lleva la suya aparte.
// ══════════════════════════════════════════════════════════════

const { dbConnection } = require('../database/config');
const { TIPO_ROL } = require('./constantes');

// Crédito, contado y apartado.
const TIPOS_CON_UTILIDAD = [1, 2, 3];

const _fn_num = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;

// Recalcula y guarda la utilidad de una venta. Devuelve
// { utilidad, utilidadCobrada } o null si la venta no existe.
const fn_recalcularUtilidadVenta = async (idSale, transaction = null) => {

    const oOpts = { type: dbConnection.QueryTypes.SELECT };
    if (transaction) {
        oOpts.transaction = transaction;
    }

    const [oVenta] = await dbConnection.query(
        `SELECT idSale, idSaleType, idSeller_idUser, active FROM sales WHERE idSale = :idSale LIMIT 1`,
        { ...oOpts, replacements: { idSale } }
    );

    if (!oVenta) {
        return null;
    }

    let utilidad = 0;
    let utilidadCobrada = 0;
    // Se guardan también en la venta, para tenerlos a la mano sin cruzar
    // con comisiones_track.
    let nComision = 0;
    let nComisionPorcentaje = 0;

    const bConUtilidad = Number(oVenta.active) === 1 && TIPOS_CON_UTILIDAD.includes(Number(oVenta.idSaleType));

    if (bConUtilidad) {

        const [oTotales] = await dbConnection.query(
            `SELECT
                ROUND( IFNULL( SUM( SD.importe ), 0), 2) AS total,
                ROUND( IFNULL( SUM( SD.cost * SD.cantidad ), 0), 2) AS costoTotal
             FROM salesdetail AS SD WHERE SD.idSale = :idSale AND SD.active = 1`,
            { ...oOpts, replacements: { idSale } }
        );

        const nTotal = _fn_num(oTotales?.total);
        const nUtilidadBruta = _fn_num(nTotal - _fn_num(oTotales?.costoTotal));

        // Comisión ya registrada (con sus reversas). null = todavía no
        // se genera, así que se estima.
        const [oComision] = await dbConnection.query(
            `SELECT SUM( CT.monto ) AS comision
             FROM comisiones_track AS CT
             WHERE CT.idSale = :idSale AND CT.tipo = 'VENTA' AND CT.estatus <> 'CANCELADA'`,
            { ...oOpts, replacements: { idSale } }
        );

        if (oComision && oComision.comision !== null && oComision.comision !== undefined) {

            nComision = _fn_num(oComision.comision);

            // El % con el que se calculó, para tenerlo a la mano en la
            // venta: el del renglón que la generó (las reversas heredan
            // el mismo).
            const [oPorcentaje] = await dbConnection.query(
                `SELECT CT.porcentajeAplicado AS porcentaje
                 FROM comisiones_track AS CT
                 WHERE CT.idSale = :idSale AND CT.tipo = 'VENTA' AND CT.estatus <> 'CANCELADA'
                   AND CT.porcentajeAplicado IS NOT NULL
                 ORDER BY CT.idComisionTrack LIMIT 1`,
                { ...oOpts, replacements: { idSale } }
            );

            nComisionPorcentaje = parseFloat(oPorcentaje?.porcentaje) || 0;

        } else if (nUtilidadBruta > 0) {

            // Mismo criterio que fn_registrarComisionVentaSiPagada: el %
            // solo cuenta si el vendedor sigue activo y con puesto de
            // tipo Vendedor.
            const [oVendedor] = await dbConnection.query(
                `SELECT U.comision AS porcentaje
                 FROM users AS U
                 WHERE U.idUser = :idUser AND U.active = 1
                   AND EXISTS (
                       SELECT 1 FROM rolesconfig AS RC INNER JOIN roles AS R ON R.idRol = RC.idRol
                       WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = :idTipoVendedor
                   )
                 LIMIT 1`,
                { ...oOpts, replacements: { idUser: oVenta.idSeller_idUser, idTipoVendedor: TIPO_ROL.VENDEDOR } }
            );

            const nPorcentaje = parseFloat(oVendedor?.porcentaje) || 0;

            if (nPorcentaje > 0) {
                nComision = _fn_num(nUtilidadBruta * nPorcentaje / 100);
                nComisionPorcentaje = nPorcentaje;
            }

        }

        utilidad = _fn_num(nUtilidadBruta - nComision);

        if (nTotal > 0 && utilidad !== 0) {

            const [oPagos] = await dbConnection.query(
                `SELECT ROUND( IFNULL( SUM( P.pago ), 0), 2) AS cobrado
                 FROM payments AS P
                 WHERE P.idRelation = :idSale AND P.relationType = 'V' AND P.active = 1`,
                { ...oOpts, replacements: { idSale } }
            );

            const nProporcion = Math.min(_fn_num(oPagos?.cobrado) / nTotal, 1);
            utilidadCobrada = _fn_num(utilidad * nProporcion);

        }

    }

    const oUpd = {
        type: dbConnection.QueryTypes.UPDATE,
        replacements: { utilidad, utilidadCobrada, comisionMonto: nComision, comisionPorcentaje: nComisionPorcentaje, idSale }
    };
    if (transaction) {
        oUpd.transaction = transaction;
    }

    await dbConnection.query(
        `UPDATE sales
         SET utilidad = :utilidad, utilidadCobrada = :utilidadCobrada,
             comisionMonto = :comisionMonto, comisionPorcentaje = :comisionPorcentaje
         WHERE idSale = :idSale`,
        oUpd
    );

    return { utilidad, utilidadCobrada, comisionMonto: nComision, comisionPorcentaje: nComisionPorcentaje };

};

// Al cambiarle el % de comisión a un vendedor cambian las ventas que
// TODAVÍA no generan comisión y siguen con saldo: esas son las que
// tienen la comisión por delante. Las que ya la generaron traen el monto
// real y no se mueven.
const fn_recalcularUtilidadVentasAbiertasByVendedor = async (idSeller_idUser, transaction = null) => {

    const oOpts = { type: dbConnection.QueryTypes.SELECT, replacements: { idSeller_idUser } };
    if (transaction) {
        oOpts.transaction = transaction;
    }

    const aVentas = await dbConnection.query(
        `SELECT S.idSale
         FROM sales AS S
         WHERE S.idSeller_idUser = :idSeller_idUser
           AND S.active = 1
           AND S.idSaleType IN (1, 2, 3)
           AND NOT EXISTS (
               SELECT 1 FROM comisiones_track AS CT
               WHERE CT.idSale = S.idSale AND CT.tipo = 'VENTA' AND CT.estatus <> 'CANCELADA'
           )
           AND ROUND( IFNULL(( SELECT SUM( SD.importe ) FROM salesdetail AS SD
                               WHERE SD.idSale = S.idSale AND SD.active = 1 ), 0), 2)
             > ROUND( IFNULL(( SELECT SUM( P.pago ) FROM payments AS P
                               WHERE P.idRelation = S.idSale AND P.relationType = 'V' AND P.active = 1 ), 0), 2)`,
        oOpts
    );

    for (const oVenta of aVentas) {
        await fn_recalcularUtilidadVenta(oVenta.idSale, transaction);
    }

    return aVentas.length;

};

module.exports = {
    fn_recalcularUtilidadVenta
    , fn_recalcularUtilidadVentasAbiertasByVendedor
};
