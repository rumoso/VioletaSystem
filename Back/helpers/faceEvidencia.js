// ══════════════════════════════════════════════════════════════
// EVIDENCIA DE LA BITÁCORA FACIAL
// (analisis/039-bitacora-facial-evidencia-y-equipo.md)
//
// Miniatura de lo que vio la cámara, solo en:
//   - intentos SIN_VIDA (posible foto o video),
//   - marcajes faciales del checador.
// Se guarda en `face_verification_evidencia`, ligada al renglón de la
// bitácora. Se apaga con la constante FACIAL_EVIDENCIA_ACTIVA y se borra
// a los FACIAL_EVIDENCIA_DIAS (analisis/040; defaults: activa, 30 días).
//
// Checador: la captura llega al identificar, pero el renglón EXITO se
// escribe al gastar el comprobante en insertMarcaje. Mientras tanto la
// miniatura espera en memoria ligada al `jti` del comprobante y vence
// con él (como los comprobantes gastados de faceTicket.js).
//
// Nada de esto tumba el flujo: si falla, se deja en consola y se sigue.
// Si todavía no se corre `SQL/face_bitacora_evidencia.sql`, no se guarda
// IP ni evidencia y todo funciona como antes.
// ══════════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');
const moment = require('moment');

const { dbConnection } = require('../database/config');
const { fn_getConstanteBool, fn_getConstanteEntero } = require('./constantesSistema');

const PREFIJO_IMG = 'data:image/jpeg;base64,';
const MAX_BYTES_IMG = 20000;
const DIAS_DEFAULT = 30;
const MS_ENTRE_PURGAS = 5 * 60 * 1000;
const MS_RECHEQUEO_ESQUEMA = 60 * 1000;

// ── ¿Ya se corrió el script? ──
let _bEsquema = false;
let _tUltimoChequeo = 0;

const fn_esquemaEvidencia = async () => {

    if (_bEsquema || Date.now() - _tUltimoChequeo < MS_RECHEQUEO_ESQUEMA) {
        return _bEsquema;
    }

    _tUltimoChequeo = Date.now();

    try {
        const [fila] = await dbConnection.query(
            `SELECT
                ( SELECT COUNT(*) FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'face_verification_log' AND COLUMN_NAME = 'ip' ) AS bIp,
                ( SELECT COUNT(*) FROM information_schema.TABLES
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'face_verification_evidencia' ) AS bTabla`,
            { type: dbConnection.QueryTypes.SELECT }
        );
        _bEsquema = Number(fila.bIp) > 0 && Number(fila.bTabla) > 0;
    } catch (error) {
        _bEsquema = false;
    }

    return _bEsquema;
};

const fn_evidenciaValida = (img) => typeof img === 'string'
    && img.startsWith(PREFIJO_IMG)
    && img.length <= MAX_BYTES_IMG
    && /^[A-Za-z0-9+/=]+$/.test(img.substring(PREFIJO_IMG.length));

// ── Pendientes del checador (jti → { img, vence }) ──
const _pendientes = new Map();

const _fn_limpiarPendientes = () => {
    const ahora = Date.now();
    for (const [jti, p] of _pendientes) {
        if (p.vence <= ahora) {
            _pendientes.delete(jti);
        }
    }
};

const fn_guardarEvidenciaPendiente = (ticket, img) => {

    if (!fn_evidenciaValida(img)) {
        return;
    }

    _fn_limpiarPendientes();

    const datos = jwt.decode(ticket);

    if (datos && datos.jti && datos.exp) {
        _pendientes.set(datos.jti, { img, vence: datos.exp * 1000 });
    }
};

const fn_tomarEvidenciaPendiente = (jti) => {
    const p = jti ? _pendientes.get(jti) : null;
    _pendientes.delete(jti);
    return p && p.vence > Date.now() ? p.img : null;
};

// ── Borrado de lo vencido ──
let _tUltimaPurga = 0;

const fn_purgarEvidencia = async () => {

    if (Date.now() - _tUltimaPurga < MS_ENTRE_PURGAS || !await fn_esquemaEvidencia()) {
        return;
    }

    _tUltimaPurga = Date.now();

    try {
        const iDias = await fn_getConstanteEntero('FACIAL_EVIDENCIA_DIAS', DIAS_DEFAULT, 1, 3650);
        await dbConnection.query(
            `DELETE FROM face_verification_evidencia WHERE createDate < :limite`,
            { replacements: { limite: moment().subtract(iDias, 'days').format('YYYY-MM-DD HH:mm:ss') }, type: dbConnection.QueryTypes.DELETE }
        );
    } catch (error) {
        console.log('No se pudo purgar la evidencia facial:', error.message);
    }
};

// Para pruebas: forzar la siguiente purga.
const fn_reiniciarPurga = () => { _tUltimaPurga = 0; };

// ── Guardar la evidencia de un renglón ──
const fn_guardarEvidencia = async (idFaceVerificationLog, img) => {

    if (!idFaceVerificationLog || !fn_evidenciaValida(img) || !await fn_esquemaEvidencia()) {
        return false;
    }

    try {

        if (!await fn_getConstanteBool('FACIAL_EVIDENCIA_ACTIVA', true)) {
            return false;
        }

        await dbConnection.query(
            `INSERT INTO face_verification_evidencia (idFaceVerificationLog, createDate, imgEvidencia)
             VALUES (:idFaceVerificationLog, :createDate, :img)`,
            {
                replacements: { idFaceVerificationLog, createDate: moment().format('YYYY-MM-DD HH:mm:ss'), img },
                type: dbConnection.QueryTypes.INSERT
            }
        );

        return true;

    } catch (error) {
        console.log('No se pudo guardar la evidencia facial:', error.message);
        return false;
    }
};

module.exports = {
    fn_esquemaEvidencia,
    fn_evidenciaValida,
    fn_guardarEvidenciaPendiente,
    fn_tomarEvidenciaPendiente,
    fn_purgarEvidencia,
    fn_reiniciarPurga,
    fn_guardarEvidencia
};
