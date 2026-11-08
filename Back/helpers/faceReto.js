// ══════════════════════════════════════════════════════════════
// RETO DE PRUEBA DE VIDA
// (analisis/037-prueba-de-vida-y-encuadre-adaptable.md)
//
// Antes de grabar la secuencia, el navegador pide un reto: una serie
// corta de giros de cabeza, cada uno a la izquierda o a la derecha al
// azar, que el navegador muestra desde el inicio ("Mira a la izquierda y
// luego a la derecha"). Cuántos, según qué tan delicada es la operación:
//   - login y checador: 1 o 2 al azar (lo de todos los días, rápido),
//   - registrar un rostro: 2,
//   - autorización de acciones especiales y login tras un fallo reciente
//     desde el mismo equipo: 3.
// Una foto no gira ni una vez. Los giros extra son contra un video
// grabado: con 1 atina la mitad de las veces, con 3 una de cada 8 (un
// lado se puede repetir; entre giros se regresa al frente).
//
// Sin parpadeo: en la primera prueba con cámara real (2026-11-08) los
// puntos del modelo apenas se movían al parpadear (el ojo "bajaba" a 92–
// 95%), igual que el ruido de una foto. El giro sí lo siguen bien.
//
// El reto es de un solo uso y caduca en 20 s.
//
// En memoria, igual que los comprobantes gastados (helpers/faceTicket.js):
// el servidor es un solo proceso on-premise.
// ══════════════════════════════════════════════════════════════

const crypto = require('crypto');

const SEGUNDOS_VIGENCIA = 20;

const PROPOSITOS_RETO = ['LOGIN', 'TIMECARD', 'AUTORIZACION', 'ENROLAR'];
const LADOS = ['IZQ', 'DER'];
const GIROS_MUY_IMPORTANTE = 3;
const GIROS_ENROLAR = 2;
const GIROS_DIARIO_MIN = 1;
const GIROS_DIARIO_MAX = 2;

// Un login fallido desde este equipo en los últimos minutos hace que el
// siguiente login pida 3 giros.
const MS_FALLO_LOGIN_RECIENTE = 10 * 60 * 1000;

// idReto -> { proposito, pasos, vence (ms) }
const _retos = new Map();
// ip -> último fallo de login (ms)
const _fallosLogin = new Map();

const _fn_limpiar = () => {
    const ahora = Date.now();
    for (const [id, r] of _retos) {
        if (r.vence <= ahora) {
            _retos.delete(id);
        }
    }
    for (const [ip, t] of _fallosLogin) {
        if (ahora - t > MS_FALLO_LOGIN_RECIENTE) {
            _fallosLogin.delete(ip);
        }
    }
};

const fn_propositoRetoValido = (proposito) => PROPOSITOS_RETO.includes(proposito);

const fn_hayFalloLoginReciente = (ip) => {
    const t = _fallosLogin.get(ip);
    return !!t && Date.now() - t <= MS_FALLO_LOGIN_RECIENTE;
};

const fn_registrarFalloLogin = (ip) => {
    _fallosLogin.set(ip, Date.now());
};

const fn_generarReto = (proposito, ip) => {

    _fn_limpiar();

    let iGiros;

    if (proposito === 'AUTORIZACION' || (proposito === 'LOGIN' && fn_hayFalloLoginReciente(ip))) {
        iGiros = GIROS_MUY_IMPORTANTE;
    } else if (proposito === 'ENROLAR') {
        iGiros = GIROS_ENROLAR;
    } else {
        iGiros = crypto.randomInt(GIROS_DIARIO_MIN, GIROS_DIARIO_MAX + 1);
    }

    const pasos = Array.from({ length: iGiros }, () => LADOS[crypto.randomInt(LADOS.length)]);
    const idReto = crypto.randomUUID();

    _retos.set(idReto, { proposito, pasos, vence: Date.now() + SEGUNDOS_VIGENCIA * 1000 });

    return { idReto, pasos, segundosVigencia: SEGUNDOS_VIGENCIA };
};

// Lo borra al usarlo: un reto no sirve dos veces, aunque falle.
const fn_consumirReto = (idReto, proposito) => {

    const r = _retos.get(idReto);
    _retos.delete(idReto);

    if (!r) {
        return { ok: false, error: 'El reto no existe o ya se usó. Intenta de nuevo.' };
    }

    if (r.vence <= Date.now()) {
        return { ok: false, error: 'El tiempo para la captura venció. Intenta de nuevo.' };
    }

    if (r.proposito !== proposito) {
        return { ok: false, error: 'El reto no corresponde a esta operación.' };
    }

    return { ok: true, pasos: r.pasos };
};

module.exports = {
    SEGUNDOS_VIGENCIA,
    fn_propositoRetoValido,
    fn_generarReto,
    fn_consumirReto,
    fn_registrarFalloLogin,
    fn_hayFalloLoginReciente
};
