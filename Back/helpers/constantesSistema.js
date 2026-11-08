// Constantes configurables del sistema (analisis/040), tabla `constantes`.
//
// No confundir con `helpers/constantes.js` (valores fijos de código).
//
// Siempre con un DEFAULT: si la tabla no existe, la constante falta, está
// inactiva o su valor no sirve, se regresa el default y el flujo sigue.
// Se lee de la base en cada llamada: un cambio en la pantalla aplica en
// la siguiente operación, sin reiniciar el Back.

const { dbConnection } = require('../database/config');

// Valor (`sValue`) de una constante activa, o el default.
const fn_getConstante = async (sKey, sDefault = null) => {

    try {

        const [fila] = await dbConnection.query(
            `SELECT sValue FROM constantes WHERE sKey = :sKey AND active = 1 LIMIT 1`,
            { replacements: { sKey }, type: dbConnection.QueryTypes.SELECT }
        );

        return fila && fila.sValue !== null && fila.sValue !== undefined ? String(fila.sValue).trim() : sDefault;

    } catch (error) {
        return sDefault;
    }

};

// Entero dentro de [iMin, iMax]; fuera de rango o no numérico → default.
const fn_getConstanteEntero = async (sKey, iDefault, iMin = Number.MIN_SAFE_INTEGER, iMax = Number.MAX_SAFE_INTEGER) => {

    const sValor = await fn_getConstante(sKey, null);

    if (sValor === null || !/^-?\d+$/.test(sValor)) {
        return iDefault;
    }

    const iValor = Number(sValor);

    return iValor >= iMin && iValor <= iMax ? iValor : iDefault;

};

// Sí/no: 1/0, SI/NO, TRUE/FALSE. Cualquier otra cosa → default.
const fn_getConstanteBool = async (sKey, bDefault) => {

    const sValor = await fn_getConstante(sKey, null);

    if (sValor === null) {
        return bDefault;
    }

    const s = sValor.toUpperCase();

    if (['1', 'SI', 'SÍ', 'TRUE'].includes(s)) {
        return true;
    }

    if (['0', 'NO', 'FALSE'].includes(s)) {
        return false;
    }

    return bDefault;

};

module.exports = {
    fn_getConstante,
    fn_getConstanteEntero,
    fn_getConstanteBool
};
