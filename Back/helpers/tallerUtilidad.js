// ══════════════════════════════════════════════════════════════
// UTILIDAD DEL TALLER (analisis/023-utilidad-de-taller.md)
//
// La utilidad vive guardada en el folio (`taller.utilidad` y
// `taller.utilidadCobrada`): quien la consulta solo la lee. Aquí se
// recalcula, y se llama desde los dos lugares donde puede cambiar:
//
//   - cuando cambia el folio  → `_fn_recalcularTotalSaleTaller`
//   - cuando cambia el dinero → al guardar o cancelar un pago
//
// Cómo se forma:
//   Mano de obra   → precio − destajo del técnico
//   Refacciones    → (precio − costo) × cantidad
//   Metal empresa  → valor − costo
//   Servicios externos, metal del cliente y metal final NO entran.
//
// El % de destajo sale del renglón de mano de obra (`porcentajeDestajo`)
// cuando ya se le pagó al técnico; mientras no, del % vigente en su
// ficha. Así, cambiarle el % a un técnico no mueve la utilidad de un
// folio que ya se le pagó.
//
// Garantías y talleres cancelados quedan en 0: el cliente todavía no
// define cómo se maneja la utilidad de una garantía.
// ══════════════════════════════════════════════════════════════

const { dbConnection } = require('../database/config');

const ESTATUS_CANCELADO = 7;

const _fn_num = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;

// Recalcula y guarda la utilidad de un folio. Devuelve
// { utilidad, utilidadCobrada } o null si el folio no existe.
const fn_recalcularUtilidadTaller = async (idTaller, transaction = null) => {

    const oOpts = { type: dbConnection.QueryTypes.SELECT };
    if (transaction) {
        oOpts.transaction = transaction;
    }

    const [oFolio] = await dbConnection.query(
        `SELECT idTaller, idSale, idTallerStatus, idTallerOrigen, manoObraPrecio, precioTotal
         FROM taller WHERE idTaller = :idTaller LIMIT 1`,
        { ...oOpts, replacements: { idTaller } }
    );

    if (!oFolio) {
        return null;
    }

    let utilidad = 0;
    let utilidadCobrada = 0;

    const bSinUtilidad = !!oFolio.idTallerOrigen || Number(oFolio.idTallerStatus) === ESTATUS_CANCELADO;

    if (!bSinUtilidad) {

        // Mano de obra: si el folio no tiene renglones por técnico, vale
        // el precio general del folio — ahí no hay destajo que pagar.
        const [oManoObra] = await dbConnection.query(
            `SELECT
                COUNT(*) AS iRenglones,
                ROUND( IFNULL( SUM( TMO.precio - ROUND( TMO.precio * IFNULL( TMO.porcentajeDestajo, IFNULL( U.destajo, 0) ) / 100, 2) ), 0), 2) AS utilidad
             FROM taller_mano_obra AS TMO
             LEFT JOIN users AS U ON U.idUser = TMO.idUserTecnico
             WHERE TMO.idTaller = :idTaller`,
            { ...oOpts, replacements: { idTaller } }
        );

        const utilidadManoObra = Number(oManoObra?.iRenglones) > 0
            ? _fn_num(oManoObra.utilidad)
            : _fn_num(oFolio.manoObraPrecio);

        const [oRefacciones] = await dbConnection.query(
            `SELECT ROUND( IFNULL( SUM( ( R.precio - R.costo ) * R.cantidad ), 0), 2) AS utilidad
             FROM taller_refacciones AS R WHERE R.idTaller = :idTaller`,
            { ...oOpts, replacements: { idTaller } }
        );

        const [oMetal] = await dbConnection.query(
            `SELECT ROUND( IFNULL( SUM( MA.valorMetal - MA.costoMetal ), 0), 2) AS utilidad
             FROM taller_metal_agranel AS MA WHERE MA.idTaller = :idTaller`,
            { ...oOpts, replacements: { idTaller } }
        );

        utilidad = _fn_num(utilidadManoObra + _fn_num(oRefacciones?.utilidad) + _fn_num(oMetal?.utilidad));

        // Cobrado: pagos activos de la venta del folio. La utilidad
        // cobrada es proporcional a lo que se lleva cobrado.
        const nPrecioTotal = _fn_num(oFolio.precioTotal);

        if (nPrecioTotal > 0 && utilidad !== 0) {

            const [oPagos] = await dbConnection.query(
                `SELECT ROUND( IFNULL( SUM( P.pago ), 0), 2) AS cobrado
                 FROM payments AS P
                 WHERE P.idRelation = :idSale AND P.relationType = 'V' AND P.active = 1`,
                { ...oOpts, replacements: { idSale: oFolio.idSale } }
            );

            const nCobrado = _fn_num(oPagos?.cobrado);
            const nProporcion = Math.min(nCobrado / nPrecioTotal, 1);

            utilidadCobrada = _fn_num(utilidad * nProporcion);

        }

    }

    const oUpd = { type: dbConnection.QueryTypes.UPDATE, replacements: { utilidad, utilidadCobrada, idTaller } };
    if (transaction) {
        oUpd.transaction = transaction;
    }

    await dbConnection.query(
        `UPDATE taller SET utilidad = :utilidad, utilidadCobrada = :utilidadCobrada WHERE idTaller = :idTaller`,
        oUpd
    );

    return { utilidad, utilidadCobrada };

};

// Igual que la anterior, pero a partir de la venta: si esa venta es un
// folio de taller, recalcula su utilidad. Para usarse después de un
// pago o de su cancelación, donde solo se conoce el idSale.
const fn_recalcularUtilidadTallerByIdSale = async (idSale, transaction = null) => {

    const oOpts = { type: dbConnection.QueryTypes.SELECT, replacements: { idSale } };
    if (transaction) {
        oOpts.transaction = transaction;
    }

    const [oFolio] = await dbConnection.query(
        `SELECT idTaller FROM taller WHERE idSale = :idSale LIMIT 1`,
        oOpts
    );

    if (!oFolio) {
        return null;
    }

    return fn_recalcularUtilidadTaller(oFolio.idTaller, transaction);

};

module.exports = {
    fn_recalcularUtilidadTaller
    , fn_recalcularUtilidadTallerByIdSale
};
