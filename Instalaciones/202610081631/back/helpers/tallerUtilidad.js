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
// Cómo se forma (analisis/028):
//   Utilidad bruta = mano de obra + refacciones + metal, menos costos.
//                    Servicios externos, metal del cliente y metal final
//                    NO entran.
//   − Destajo      = % del técnico SOLO sobre su mano de obra.
//   − Comisión     = % del vendedor sobre (bruta − destajo).
//   = Utilidad neta, y `comisiones` es la suma de las dos.
//
// El desglose por persona vive en `taller_comisiones`; un renglón que
// ya se le cargó a alguien (idComisionTrack con valor) queda congelado
// y no se recalcula.
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
const { TIPO_ROL } = require('./constantes');

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
        `SELECT idTaller, idSale, idTallerStatus, idTallerOrigen, idSeller_idUser, manoObraPrecio, precioTotal
         FROM taller WHERE idTaller = :idTaller LIMIT 1`,
        { ...oOpts, replacements: { idTaller } }
    );

    if (!oFolio) {
        return null;
    }

    let utilidad = 0;
    let utilidadCobrada = 0;
    // Lo que se le restó por destajo, guardado también en el folio para
    // que el panel desglose bruta / comisiones / neta (analisis/027).
    let comisiones = 0;
    // Renglones de taller_comisiones que se van a reescribir.
    let aRenglones = [];

    const bSinUtilidad = !!oFolio.idTallerOrigen || Number(oFolio.idTallerStatus) === ESTATUS_CANCELADO;

    if (!bSinUtilidad) {

        // Mano de obra: si el folio no tiene renglones por técnico, vale
        // el precio general del folio — ahí no hay destajo que pagar.
        const [oManoObra] = await dbConnection.query(
            `SELECT
                COUNT(*) AS iRenglones,
                ROUND( IFNULL( SUM( TMO.precio - ROUND( TMO.precio * IFNULL( TMO.porcentajeDestajo, IFNULL( U.destajo, 0) ) / 100, 2) ), 0), 2) AS utilidad,
                ROUND( IFNULL( SUM( ROUND( TMO.precio * IFNULL( TMO.porcentajeDestajo, IFNULL( U.destajo, 0) ) / 100, 2) ), 0), 2) AS destajo
             FROM taller_mano_obra AS TMO
             LEFT JOIN users AS U ON U.idUser = TMO.idUserTecnico
             WHERE TMO.idTaller = :idTaller`,
            { ...oOpts, replacements: { idTaller } }
        );

        const utilidadManoObra = Number(oManoObra?.iRenglones) > 0
            ? _fn_num(oManoObra.utilidad) + _fn_num(oManoObra.destajo)
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

        // Utilidad BRUTA: la mano de obra entra completa; el destajo se
        // resta después, junto con la comisión.
        const nUtilidadBruta = _fn_num(utilidadManoObra + _fn_num(oRefacciones?.utilidad) + _fn_num(oMetal?.utilidad));

        // ── Destajo: por técnico, sobre SU mano de obra ──
        const aDestajos = await dbConnection.query(
            `SELECT
                TMO.idUserTecnico AS idUser,
                IFNULL( MAX( TMO.porcentajeDestajo ), IFNULL( MAX( U.destajo ), 0) ) AS porcentaje,
                ROUND( IFNULL( SUM( TMO.precio ), 0), 2) AS montoBase,
                ROUND( IFNULL( SUM( ROUND( TMO.precio * IFNULL( TMO.porcentajeDestajo, IFNULL( U.destajo, 0) ) / 100, 2) ), 0), 2) AS monto
             FROM taller_mano_obra AS TMO
             LEFT JOIN users AS U ON U.idUser = TMO.idUserTecnico
             WHERE TMO.idTaller = :idTaller
             GROUP BY TMO.idUserTecnico`,
            { ...oOpts, replacements: { idTaller } }
        );

        let nDestajo = 0;

        for (const d of aDestajos) {
            const monto = _fn_num(d.monto);
            if (monto > 0) {
                nDestajo = _fn_num(nDestajo + monto);
                aRenglones.push({ idUser: d.idUser, tipo: 'DESTAJO', porcentaje: _fn_num(d.porcentaje), montoBase: _fn_num(d.montoBase), monto });
            }
        }

        // ── Comisión del vendedor: sobre lo que quedó ──
        const nBaseComision = _fn_num(nUtilidadBruta - nDestajo);
        let nComision = 0;

        if (nBaseComision > 0 && oFolio.idSeller_idUser) {

            const [oVendedor] = await dbConnection.query(
                `SELECT U.comision AS porcentaje
                 FROM users AS U
                 WHERE U.idUser = :idUser AND U.active = 1
                   AND EXISTS (
                       SELECT 1 FROM rolesconfig AS RC INNER JOIN roles AS R ON R.idRol = RC.idRol
                       WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = :idTipoVendedor
                   )
                 LIMIT 1`,
                { ...oOpts, replacements: { idUser: oFolio.idSeller_idUser, idTipoVendedor: TIPO_ROL.VENDEDOR } }
            );

            const nPorcentaje = parseFloat(oVendedor?.porcentaje) || 0;

            if (nPorcentaje > 0) {
                nComision = _fn_num(nBaseComision * nPorcentaje / 100);
                if (nComision > 0) {
                    aRenglones.push({
                        idUser: oFolio.idSeller_idUser, tipo: 'COMISION',
                        porcentaje: nPorcentaje, montoBase: nBaseComision, monto: nComision
                    });
                }
            }

        }

        comisiones = _fn_num(nDestajo + nComision);
        utilidad = _fn_num(nUtilidadBruta - comisiones);

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

    // ── Renglones del folio (analisis/028) ──
    // Los que ya se le cargaron a alguien (idComisionTrack con valor) no
    // se tocan: conservan el % y el monto que se pagó. Su importe sí
    // cuenta para `comisiones`.
    const oDel = { type: dbConnection.QueryTypes.DELETE, replacements: { idTaller } };
    if (transaction) {
        oDel.transaction = transaction;
    }

    await dbConnection.query(
        `DELETE FROM taller_comisiones WHERE idTaller = :idTaller AND idComisionTrack IS NULL`,
        oDel
    );

    const aCongelados = await dbConnection.query(
        `SELECT idUser, tipo, monto FROM taller_comisiones
         WHERE idTaller = :idTaller AND active = 1`,
        { ...oOpts, replacements: { idTaller } }
    );

    let nCongelado = 0;

    for (const c of aCongelados) {
        nCongelado = _fn_num(nCongelado + _fn_num(c.monto));
    }

    // Lo ya cargado manda sobre lo estimado del mismo tipo y persona.
    const aPorInsertar = aRenglones.filter(
        (r) => !aCongelados.some((c) => Number(c.idUser) === Number(r.idUser) && c.tipo === r.tipo)
    );

    for (const r of aPorInsertar) {
        const oIns = {
            type: dbConnection.QueryTypes.INSERT,
            replacements: { idTaller, idUser: r.idUser, tipo: r.tipo, porcentaje: r.porcentaje, montoBase: r.montoBase, monto: r.monto }
        };
        if (transaction) {
            oIns.transaction = transaction;
        }
        await dbConnection.query(
            `INSERT INTO taller_comisiones (createDate, idTaller, idUser, tipo, porcentaje, montoBase, monto, active)
             VALUES (NOW(), :idTaller, :idUser, :tipo, :porcentaje, :montoBase, :monto, 1)`,
            oIns
        );
    }

    // Un folio cancelado o una garantía no dejan utilidad ni comisiones,
    // aunque tengan renglones ya cargados: esos se reversan por su lado
    // (analisis/028, regla 5).
    if (aCongelados.length > 0 && !bSinUtilidad) {
        // Con renglones congelados, las comisiones son los congelados más
        // lo que se acaba de estimar; la utilidad se cierra con esa suma.
        const nEstimado = aPorInsertar.reduce((t, r) => _fn_num(t + r.monto), 0);
        const nComisionesReales = _fn_num(nCongelado + nEstimado);
        utilidad = _fn_num(utilidad + comisiones - nComisionesReales);
        comisiones = nComisionesReales;

        const nPrecioTotal = _fn_num(oFolio.precioTotal);
        if (nPrecioTotal > 0 && utilidad !== 0) {
            const [oPagos2] = await dbConnection.query(
                `SELECT ROUND( IFNULL( SUM( P.pago ), 0), 2) AS cobrado
                 FROM payments AS P
                 WHERE P.idRelation = :idSale AND P.relationType = 'V' AND P.active = 1`,
                { ...oOpts, replacements: { idSale: oFolio.idSale } }
            );
            utilidadCobrada = _fn_num(utilidad * Math.min(_fn_num(oPagos2?.cobrado) / nPrecioTotal, 1));
        } else {
            utilidadCobrada = 0;
        }
    }

    const oUpd = {
        type: dbConnection.QueryTypes.UPDATE,
        replacements: { utilidad, utilidadCobrada, comisiones, idTaller }
    };
    if (transaction) {
        oUpd.transaction = transaction;
    }

    await dbConnection.query(
        `UPDATE taller
         SET utilidad = :utilidad, utilidadCobrada = :utilidadCobrada, comisiones = :comisiones
         WHERE idTaller = :idTaller`,
        oUpd
    );

    return { utilidad, utilidadCobrada, comisiones };

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

// Al cambiarle el % de destajo a un técnico, los folios que TODAVIA no
// le pagan destajo (porcentajeDestajo en NULL) cambian de utilidad: se
// recalculan aquí. Los que ya se le pagaron traen el % congelado y no
// se tocan. Devuelve cuántos folios se recalcularon.
const fn_recalcularUtilidadTalleresAbiertosByTecnico = async (idUserTecnico, transaction = null) => {

    const oOpts = { type: dbConnection.QueryTypes.SELECT, replacements: { idUserTecnico, cancelado: ESTATUS_CANCELADO } };
    if (transaction) {
        oOpts.transaction = transaction;
    }

    const aFolios = await dbConnection.query(
        `SELECT DISTINCT T.idTaller
         FROM taller_mano_obra AS TMO
         INNER JOIN taller AS T ON T.idTaller = TMO.idTaller
         WHERE TMO.idUserTecnico = :idUserTecnico
           AND TMO.porcentajeDestajo IS NULL
           AND T.idTallerOrigen IS NULL
           AND T.idTallerStatus <> :cancelado`,
        oOpts
    );

    for (const oFolio of aFolios) {
        await fn_recalcularUtilidadTaller(oFolio.idTaller, transaction);
    }

    return aFolios.length;

};

module.exports = {
    fn_recalcularUtilidadTaller
    , fn_recalcularUtilidadTallerByIdSale
    , fn_recalcularUtilidadTalleresAbiertosByTecnico
};
