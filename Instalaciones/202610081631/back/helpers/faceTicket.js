// ══════════════════════════════════════════════════════════════
// COMPROBANTE DE IDENTIFICACIÓN FACIAL
// (analisis/020-reconocimiento-facial-validado-en-servidor.md)
//
// Cuando el servidor confirma que un rostro coincide, entrega este
// comprobante. Los flujos que dan acceso o dejan registro (login,
// checador, autorización de acciones) lo exigen y toman de aquí QUIÉN es
// — nunca del idUser que mande el navegador.
//
// Es un JWT firmado con la misma llave del sistema. No se confunde con un
// token de sesión:
//   - un token de sesión trae { uid } y no trae la marca `t: 'face'`;
//   - un comprobante trae la marca y no trae `uid`, así que no sirve como
//     sesión.
//
// Uso único: los comprobantes gastados se recuerdan en memoria hasta que
// vencen. Alcanza porque el servidor es un solo proceso y el comprobante
// dura minutos. Si algún día corren varios procesos, esto tiene que
// moverse a la base de datos.
// ══════════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const MARCA = 'face';

// Cubre el tiempo real del checador: identificarse, ver opciones y
// marcar (con disparo automático o eligiendo).
const SEGUNDOS_VIGENCIA = 120;

const PROPOSITOS = ['LOGIN', 'TIMECARD', 'AUTORIZACION'];

// jti gastado -> momento en que vence (ms).
const _gastados = new Map();

const fn_limpiarGastados = () => {
    const ahora = Date.now();
    for (const [jti, vence] of _gastados) {
        if (vence <= ahora) {
            _gastados.delete(jti);
        }
    }
};

const fn_propositoValido = (proposito) => PROPOSITOS.includes(proposito);

// datos: { tipoPersona, idPersona, nombrePersona, similitud, proposito, modo, referencia }
const fn_emitirComprobante = (datos) => {

    const payload = {
        t: MARCA,
        tipoPersona: datos.tipoPersona,
        idPersona: Number(datos.idPersona),
        nombrePersona: datos.nombrePersona || '',
        similitud: datos.similitud,
        proposito: datos.proposito,
        modo: datos.modo,
        referencia: datos.referencia || '',
        jti: crypto.randomUUID()
    };

    return jwt.sign(payload, process.env.SECRETPRIVATEKEY, { expiresIn: SEGUNDOS_VIGENCIA });

};

// Valida un comprobante para un propósito y tipo de persona. Con
// bGastar lo marca como usado en el mismo paso (sin `await` de por
// medio, así dos peticiones simultáneas no pueden pasar las dos).
//
// Devuelve { ok: true, datos } o { ok: false, message }.
const fn_validarComprobante = (sTicket, { proposito, tipoPersona, bGastar = false }) => {

    fn_limpiarGastados();

    if (!sTicket || typeof sTicket !== 'string') {
        return { ok: false, message: 'Falta la identificación facial.' };
    }

    let datos;

    try {
        datos = jwt.verify(sTicket, process.env.SECRETPRIVATEKEY);
    } catch (error) {
        return {
            ok: false,
            message: error && error.name === 'TokenExpiredError'
                ? 'La identificación facial venció. Vuelve a escanear tu rostro.'
                : 'La identificación facial no es válida.'
        };
    }

    if (!datos || datos.t !== MARCA || !datos.jti) {
        return { ok: false, message: 'La identificación facial no es válida.' };
    }

    if (datos.proposito !== proposito) {
        return { ok: false, message: 'Esta identificación facial no corresponde a esta operación.' };
    }

    if (tipoPersona && datos.tipoPersona !== tipoPersona) {
        return { ok: false, message: 'Esta identificación facial no corresponde a esta operación.' };
    }

    if (_gastados.has(datos.jti)) {
        return { ok: false, message: 'Esta identificación facial ya se usó. Vuelve a escanear tu rostro.' };
    }

    if (bGastar) {
        _gastados.set(datos.jti, datos.exp * 1000);
    }

    return { ok: true, datos };

};

// Gasta un comprobante ya validado. Devuelve false si otra petición lo
// gastó primero.
const fn_gastarComprobante = (datos) => {

    fn_limpiarGastados();

    if (!datos || !datos.jti || _gastados.has(datos.jti)) {
        return false;
    }

    _gastados.set(datos.jti, datos.exp * 1000);
    return true;

};

module.exports = {
    PROPOSITOS,
    SEGUNDOS_VIGENCIA,
    fn_propositoValido,
    fn_emitirComprobante,
    fn_validarComprobante,
    fn_gastarComprobante
};
