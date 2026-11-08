const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');

const { fn_parsearDescriptor, fn_comparar } = require('../helpers/faceMatch');
const { fn_propositoValido, fn_emitirComprobante } = require('../helpers/faceTicket');
const { fn_logVerificacion } = require('../helpers/faceBitacora');
const { fn_validarSecuencia, fn_validarVida, fn_descriptorPromedio } = require('../helpers/faceLiveness');
const { fn_ipCliente } = require('../helpers/ipCliente');
const { fn_guardarEvidenciaPendiente, fn_esquemaEvidencia } = require('../helpers/faceEvidencia');
const { fn_tieneMenu } = require('../helpers/permisos');
const { fn_propositoRetoValido, fn_generarReto, fn_consumirReto, fn_registrarFalloLogin } = require('../helpers/faceReto');

// Reconocimiento facial (analisis/004-reconocimiento-facial.md y
// analisis/020-reconocimiento-facial-validado-en-servidor.md).
//
// El navegador captura y calcula el descriptor; la COMPARACIÓN ocurre
// aquí. Antes ocurría en el navegador y el servidor creía el resultado:
// cualquiera podía decir "es el usuario X" sin mostrar un rostro. Si
// coincide, se entrega un comprobante firmado de un solo uso que exigen
// login facial, checador y autorización de acciones.
//
// Los descriptores guardados NUNCA salen del servidor.
//
// Queries directas sobre la instancia compartida `dbConnection` (pool
// propio, se libera sola) — nunca createConexion().

// Nombre de la persona dueña de una referencia, según su tipo.
const _SQL_NOMBRE_PERSONA = `
    CASE WHEN FR.tipoPersona = 'CLIENTE' THEN TRIM(CONCAT(IFNULL(C.name,''),' ',IFNULL(C.lastName,'')))
         ELSE U.name END`;

const _SQL_JOIN_PERSONA = `
    LEFT JOIN customers AS C ON FR.tipoPersona = 'CLIENTE' AND C.idCustomer = FR.idPersona
    LEFT JOIN users AS U ON FR.tipoPersona = 'USUARIO' AND U.idUser = FR.idPersona`;

// Validación común de identificar y verificar.
const _fn_validarPeticionRostro = ({ tipoPersona, proposito }) => {

    if (!tipoPersona) {
        return 'Falta el tipo de persona.';
    }

    if (!fn_propositoValido(proposito)) {
        return 'La operación de la identificación no es válida.';
    }

    return null;

};

const MENSAJE_SIN_VIDA = 'No pudimos confirmar que haya una persona frente a la cámara. Intenta de nuevo.';

// IP real del equipo (analisis/039): normalizada y detrás de proxy si lo hay.
const _fn_ip = (req) => fn_ipCliente(req);

// Prueba de vida (analisis/037): gasta el reto, valida la forma de la
// secuencia y revisa los giros de cabeza y que sea la misma cara. Regresa
//   { error, resultado }              la petición no sirve (reto vencido,
//                                     usado, de otra operación, o captura
//                                     mal formada);
//   { descriptor, vida: { ok, motivo } }  el descriptor promedio de la
//                                     secuencia y si pasó la prueba.
// Quien llama compara el descriptor aunque no haya pasado la prueba, para
// dejar en la bitácora a quién se parecía (posible foto de esa persona).
const _fn_leerCaptura = (idReto, frames, proposito) => {

    const oReto = fn_consumirReto(idReto, proposito);

    if (!oReto.ok) {
        return { error: oReto.error, resultado: 'RETO_INVALIDO' };
    }

    const oSecuencia = fn_validarSecuencia(frames);

    if (!oSecuencia.ok) {
        return { error: oSecuencia.error, resultado: 'CAPTURA_INVALIDA' };
    }

    return {
        descriptor: fn_descriptorPromedio(oSecuencia.descriptores),
        vida: fn_validarVida(oSecuencia, oReto.pasos)
    };
};

// ── Aviso de actualizar el Face ID (analisis/038) ──
// Si la similitud de una persona viene baja de forma sostenida, el
// resultado le sugiere volver a registrar su rostro. Promedio de la
// actual y hasta 4 éxitos anteriores, contando solo los posteriores a la
// referencia vigente. Nunca tumba la identificación: si falla, no avisa.
const SIMILITUD_SUGERIR_ACTUALIZAR = 0.57;
const MIN_MUESTRAS_SUGERIR = 3;
const MAX_EXITOS_ANTERIORES = 4;

const _fn_sugerirActualizarFaceId = async (tipoPersona, idPersona, similitudActual) => {

    try {

        const rows = await dbConnection.query(
            `SELECT L.similitud
             FROM face_verification_log AS L
             INNER JOIN face_reference AS FR
                ON FR.tipoPersona = L.tipoPersonaIdentificada AND FR.idPersona = L.idPersonaIdentificada
             WHERE L.resultado = 'EXITO'
             AND L.tipoPersonaIdentificada = :tipoPersona
             AND L.idPersonaIdentificada = :idPersona
             AND L.similitud IS NOT NULL
             AND L.createDate >= IFNULL(FR.updateDate, FR.createDate)
             ORDER BY L.idFaceVerificationLog DESC
             LIMIT ${ MAX_EXITOS_ANTERIORES }`,
            { replacements: { tipoPersona, idPersona }, type: dbConnection.QueryTypes.SELECT }
        );

        const valores = [Number(similitudActual), ...rows.map((r) => Number(r.similitud))];

        if (valores.length < MIN_MUESTRAS_SUGERIR) {
            return false;
        }

        const promedio = valores.reduce((s, v) => s + v, 0) / valores.length;

        return promedio < SIMILITUD_SUGERIR_ACTUALIZAR;

    } catch (error) {
        return false;
    }

};

// ── Pedir reto (analisis/037) ──
// Público como identificar/verificar: login y checador no tienen sesión.
const pedirReto = async(req, res = response) => {

    const { proposito = '' } = req.body;

    if (!fn_propositoRetoValido(proposito)) {
        return res.json({ status: 1, message: 'La operación no es válida.' });
    }

    try {

        res.json({ status: 0, message: 'Reto generado.', data: fn_generarReto(proposito, _fn_ip(req)) });

    } catch (error) {

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// ── Identificar (1:N) ──
// Busca entre todas las referencias del tipo de persona. Con UNA
// coincidencia entrega su comprobante. Con varias NO entrega ninguno:
// regresa los candidatos (sin descriptores) para que el operador elija y
// se verifique 1:1 con una captura nueva.
const identificarRostro = async(req, res = response) => {

    const {
        tipoPersona = '',
        idReto = '',
        frames,
        imgEvidencia = null,
        proposito = '',
        referencia = '',
        idUserLogON = 0
    } = req.body;

    const sError = _fn_validarPeticionRostro({ tipoPersona, proposito });

    if (sError) {
        return res.json({ status: 1, message: sError });
    }

    const oCaptura = _fn_leerCaptura(idReto, frames, proposito);

    if (oCaptura.error) {
        return res.json({ status: 1, message: oCaptura.error, data: { resultado: oCaptura.resultado } });
    }

    const descriptor = oCaptura.descriptor;

    try {

        const rows = await dbConnection.query(
            `SELECT FR.tipoPersona, FR.idPersona, FR.descriptor, ${ _SQL_NOMBRE_PERSONA } AS nombrePersona
             FROM face_reference AS FR
             ${ _SQL_JOIN_PERSONA }
             WHERE FR.tipoPersona = :tipoPersona`,
            { replacements: { tipoPersona }, type: dbConnection.QueryTypes.SELECT }
        );

        const candidatos = [];

        for (const r of rows) {

            const refDescriptor = fn_parsearDescriptor(r.descriptor);

            if (!refDescriptor) {
                continue;
            }

            const oCmp = fn_comparar(descriptor, refDescriptor);

            // La plantilla guardada reenviada: se rechaza la petición
            // completa, no solo ese candidato.
            if (oCmp.bPlantilla) {

                await fn_logVerificacion({
                    ip: _fn_ip(req),
                    modo: 'IDENTIFICAR', resultado: 'FALLO', similitud: oCmp.similitud,
                    referencia: `${ referencia } (captura rechazada: idéntica a la referencia guardada)`,
                    idCreateUser: idUserLogON
                });

                return res.json({ status: 1, message: 'La captura del rostro no es válida. Intenta de nuevo.' });
            }

            if (oCmp.bCoincide) {
                candidatos.push({
                    tipoPersona: r.tipoPersona,
                    idPersona: Number(r.idPersona),
                    nombrePersona: r.nombrePersona || '',
                    similitud: oCmp.similitud,
                    _distancia: oCmp.distancia
                });
            }
        }

        candidatos.sort((a, b) => a._distancia - b._distancia);
        candidatos.forEach((c) => { delete c._distancia; });

        // Sin prueba de vida no hay comprobante, aunque la cara coincida.
        // En la bitácora queda a quién se parecía: posible foto de esa
        // persona.
        if (!oCaptura.vida.ok) {

            const oParecido = candidatos[0] || null;

            await fn_logVerificacion({
                ip: _fn_ip(req),
                modo: 'IDENTIFICAR',
                imgEvidencia,
                resultado: 'SIN_VIDA',
                tipoPersonaIdentificada: oParecido ? oParecido.tipoPersona : null,
                idPersonaIdentificada: oParecido ? oParecido.idPersona : null,
                similitud: oParecido ? oParecido.similitud : 0,
                referencia: `${ referencia } (prueba de vida: ${ oCaptura.vida.motivo })`,
                idCreateUser: idUserLogON
            });

            if (proposito === 'LOGIN') {
                fn_registrarFalloLogin(_fn_ip(req));
            }

            return res.json({ status: 1, message: MENSAJE_SIN_VIDA, data: { resultado: 'SIN_VIDA' } });
        }

        if (candidatos.length === 0) {

            await fn_logVerificacion({
                ip: _fn_ip(req),
                modo: 'IDENTIFICAR', resultado: 'FALLO', similitud: 0, referencia, idCreateUser: idUserLogON
            });

            if (proposito === 'LOGIN') {
                fn_registrarFalloLogin(_fn_ip(req));
            }

            return res.json({ status: 0, message: 'No se encontró coincidencia.', data: { resultado: 'SIN_COINCIDENCIA' } });
        }

        if (candidatos.length > 1) {
            return res.json({ status: 0, message: 'Hay varias coincidencias posibles.', data: { resultado: 'VARIOS', candidatos } });
        }

        const persona = candidatos[0];

        const ticket = fn_emitirComprobante({ ...persona, proposito, modo: 'IDENTIFICAR', referencia, ip: _fn_ip(req) });

        // Checador: la miniatura espera al marcaje (analisis/039).
        if (proposito === 'TIMECARD') {
            fn_guardarEvidenciaPendiente(ticket, imgEvidencia);
        }

        persona.sugerirActualizarFaceId = await _fn_sugerirActualizarFaceId(persona.tipoPersona, persona.idPersona, persona.similitud);

        res.json({ status: 0, message: 'Rostro identificado.', data: { resultado: 'UNICO', persona, ticket } });

    } catch (error) {

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// ── Verificar (1:1) ──
// Compara contra UNA persona. También es el segundo paso cuando la
// identificación dio varios candidatos y el operador eligió uno.
const verificarRostro = async(req, res = response) => {

    const {
        tipoPersona = '',
        idPersona = 0,
        idReto = '',
        frames,
        imgEvidencia = null,
        proposito = '',
        referencia = '',
        idUserLogON = 0
    } = req.body;

    const sError = _fn_validarPeticionRostro({ tipoPersona, proposito });

    if (sError) {
        return res.json({ status: 1, message: sError });
    }

    const oCaptura = _fn_leerCaptura(idReto, frames, proposito);

    if (oCaptura.error) {
        return res.json({ status: 1, message: oCaptura.error, data: { resultado: oCaptura.resultado } });
    }

    const descriptor = oCaptura.descriptor;

    try {

        const [r] = await dbConnection.query(
            `SELECT FR.tipoPersona, FR.idPersona, FR.descriptor, ${ _SQL_NOMBRE_PERSONA } AS nombrePersona
             FROM face_reference AS FR
             ${ _SQL_JOIN_PERSONA }
             WHERE FR.tipoPersona = :tipoPersona AND FR.idPersona = :idPersona
             LIMIT 1`,
            { replacements: { tipoPersona, idPersona }, type: dbConnection.QueryTypes.SELECT }
        );

        const refDescriptor = r ? fn_parsearDescriptor(r.descriptor) : null;

        if (!refDescriptor) {
            return res.json({ status: 1, message: 'Esta persona no tiene un rostro registrado.', data: { resultado: 'SIN_REFERENCIA' } });
        }

        const oCmp = fn_comparar(descriptor, refDescriptor);

        if (oCmp.bPlantilla) {

            await fn_logVerificacion({
                ip: _fn_ip(req),
                modo: 'VERIFICAR', tipoPersonaEsperada: tipoPersona, idPersonaEsperada: idPersona,
                resultado: 'FALLO', similitud: oCmp.similitud,
                referencia: `${ referencia } (captura rechazada: idéntica a la referencia guardada)`,
                idCreateUser: idUserLogON
            });

            return res.json({ status: 1, message: 'La captura del rostro no es válida. Intenta de nuevo.' });
        }

        if (!oCaptura.vida.ok) {

            await fn_logVerificacion({
                ip: _fn_ip(req),
                modo: 'VERIFICAR', tipoPersonaEsperada: tipoPersona, idPersonaEsperada: idPersona,
                imgEvidencia,
                resultado: 'SIN_VIDA', similitud: oCmp.similitud,
                referencia: `${ referencia } (prueba de vida: ${ oCaptura.vida.motivo })`,
                idCreateUser: idUserLogON
            });

            if (proposito === 'LOGIN') {
                fn_registrarFalloLogin(_fn_ip(req));
            }

            return res.json({ status: 1, message: MENSAJE_SIN_VIDA, data: { resultado: 'SIN_VIDA' } });
        }

        if (!oCmp.bCoincide) {

            await fn_logVerificacion({
                ip: _fn_ip(req),
                modo: 'VERIFICAR', tipoPersonaEsperada: tipoPersona, idPersonaEsperada: idPersona,
                resultado: 'FALLO', similitud: oCmp.similitud, referencia, idCreateUser: idUserLogON
            });

            if (proposito === 'LOGIN') {
                fn_registrarFalloLogin(_fn_ip(req));
            }

            return res.json({
                status: 0,
                message: 'No coincide.',
                data: { resultado: 'NO_COINCIDE', similitud: oCmp.similitud, nombrePersona: r.nombrePersona || '' }
            });
        }

        const persona = {
            tipoPersona: r.tipoPersona,
            idPersona: Number(r.idPersona),
            nombrePersona: r.nombrePersona || '',
            similitud: oCmp.similitud
        };

        const ticket = fn_emitirComprobante({ ...persona, proposito, modo: 'VERIFICAR', referencia, ip: _fn_ip(req) });

        if (proposito === 'TIMECARD') {
            fn_guardarEvidenciaPendiente(ticket, imgEvidencia);
        }

        persona.sugerirActualizarFaceId = await _fn_sugerirActualizarFaceId(persona.tipoPersona, persona.idPersona, persona.similitud);

        res.json({ status: 0, message: 'Rostro verificado.', data: { resultado: 'COINCIDE', persona, ticket } });

    } catch (error) {

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// Exige sesión (validarSesion en la ruta): antes era público y cualquiera
// podía poner su propio rostro en la referencia de otra persona.
const saveFaceReference = async(req, res = response) => {

    const {
        tipoPersona,
        idPersona,
        idReto = '',
        frames,
        imgThumb = null
    } = req.body;

    // Si falla la prueba de vida, la miniatura del registro es la evidencia.
    const imgEvidencia = imgThumb;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    // Enrolar también exige prueba de vida (analisis/037): si no, se
    // podría registrar la foto de alguien como su referencia. Se guarda el
    // promedio de la secuencia.
    const oCaptura = _fn_leerCaptura(idReto, frames, 'ENROLAR');

    if (oCaptura.error) {
        return res.json({ status: 1, message: oCaptura.error, data: { resultado: oCaptura.resultado } });
    }

    if (!oCaptura.vida.ok) {

        await fn_logVerificacion({
            ip: _fn_ip(req),
            modo: 'VERIFICAR', tipoPersonaEsperada: tipoPersona, idPersonaEsperada: idPersona,
            imgEvidencia,
                resultado: 'SIN_VIDA', similitud: null,
            referencia: `Registro de Face ID (prueba de vida: ${ oCaptura.vida.motivo })`,
            idCreateUser: req.idUserSesion
        });

        return res.json({ status: 1, message: MENSAJE_SIN_VIDA, data: { resultado: 'SIN_VIDA' } });
    }

    const descriptor = oCaptura.descriptor;

    try{

        await dbConnection.query(
            `INSERT INTO face_reference (createDate, updateDate, tipoPersona, idPersona, descriptor, imgThumb, idCreateUser)
             VALUES (:createDate, :updateDate, :tipoPersona, :idPersona, :descriptor, :imgThumb, :idCreateUser)
             ON DUPLICATE KEY UPDATE
                updateDate = :updateDate,
                descriptor = :descriptor,
                imgThumb = :imgThumb`,
            {
                replacements: {
                    createDate: oGetDateNow,
                    updateDate: oGetDateNow,
                    tipoPersona,
                    idPersona,
                    descriptor: JSON.stringify(descriptor),
                    imgThumb,
                    idCreateUser: req.idUserSesion
                },
                type: dbConnection.QueryTypes.INSERT
            }
        );

        res.json({
            status: 0,
            message: "Rostro de referencia guardado con éxito."
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const getFaceReference = async(req, res = response) => {

    const {
        tipoPersona,
        idPersona
    } = req.body;

    try{

        const row = await dbConnection.query(
            `SELECT idFaceReference, tipoPersona, idPersona, imgThumb, updateDate
             FROM face_reference
             WHERE tipoPersona = :tipoPersona AND idPersona = :idPersona
             LIMIT 1`,
            { replacements: { tipoPersona, idPersona }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: row.length > 0 ? row[0] : null
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const deleteFaceReference = async(req, res = response) => {

    const {
        tipoPersona,
        idPersona
    } = req.body;

    try{

        await dbConnection.query(
            `DELETE FROM face_reference WHERE tipoPersona = :tipoPersona AND idPersona = :idPersona`,
            { replacements: { tipoPersona, idPersona }, type: dbConnection.QueryTypes.DELETE }
        );

        res.json({
            status: 0,
            message: "Rostro de referencia eliminado."
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// (getFaceReferences se eliminó en el análisis 020: era público y
// entregaba los descriptores guardados de todas las personas. Con eso
// cualquiera podía reenviar el descriptor de otro usuario a loginByFace.
// La identificación 1:N ahora ocurre en identificarRostro.)

const logFaceVerification = async(req, res = response) => {

    const {
        modo,
        tipoPersonaEsperada = null,
        idPersonaEsperada = null,
        tipoPersonaIdentificada = null,
        idPersonaIdentificada = null,
        resultado,
        similitud = null,
        referencia = null,

        idUserLogON = 0
    } = req.body;

    // Los éxitos los escribe el servidor al gastar el comprobante. Desde
    // el navegador solo se registra lo que el servidor no puede ver:
    // cámara no disponible, identificación descartada por el operador,
    // candidatos cancelados o autorización manual.
    if (String(resultado).toUpperCase() === 'EXITO') {
        return res.json({ status: 1, message: 'Resultado no permitido.' });
    }

    const idLog = await fn_logVerificacion({
        ip: _fn_ip(req),
        modo,
        tipoPersonaEsperada,
        idPersonaEsperada,
        tipoPersonaIdentificada,
        idPersonaIdentificada,
        resultado,
        similitud,
        referencia,
        idCreateUser: idUserLogON
    });

    res.json(idLog
        ? { status: 0, message: "Registrado." }
        : { status: 2, message: "Sucedió un error inesperado" });
};

// ── Consulta de la bitácora (analisis/039) ──
// Exige sesión y el menú de la Bitácora Facial: muestra fotos de personas.
const MENU_BITACORA_FACIAL = 'facialLog';

const _fn_puedeVerBitacora = (req) => fn_tieneMenu(req.idUserSesion, MENU_BITACORA_FACIAL);

// Nombre de la persona esperada / identificada, según su tipo.
const _SQL_PERSONA_ESPERADA = `CASE L.tipoPersonaEsperada
                    WHEN 'CLIENTE' THEN CONCAT(IFNULL(CE.name,''),' ',IFNULL(CE.lastName,''))
                    WHEN 'USUARIO' THEN UE.name
                    ELSE NULL END`;

const _SQL_PERSONA_IDENTIFICADA = `CASE L.tipoPersonaIdentificada
                    WHEN 'CLIENTE' THEN CONCAT(IFNULL(CI.name,''),' ',IFNULL(CI.lastName,''))
                    WHEN 'USUARIO' THEN UI.name
                    ELSE NULL END`;

const _SQL_JOINS_BITACORA = `
             LEFT JOIN customers AS CE ON L.tipoPersonaEsperada = 'CLIENTE' AND CE.idCustomer = L.idPersonaEsperada
             LEFT JOIN users AS UE ON L.tipoPersonaEsperada = 'USUARIO' AND UE.idUser = L.idPersonaEsperada
             LEFT JOIN customers AS CI ON L.tipoPersonaIdentificada = 'CLIENTE' AND CI.idCustomer = L.idPersonaIdentificada
             LEFT JOIN users AS UI ON L.tipoPersonaIdentificada = 'USUARIO' AND UI.idUser = L.idPersonaIdentificada`;

const _SQL_FILTROS_BITACORA = `
             WHERE ( :modo = '' OR L.modo = :modo )
             AND ( :resultado = '' OR L.resultado = :resultado )
             AND ( :startDate IS NULL OR L.createDate >= :startDate )
             AND ( :endDate IS NULL OR L.createDate < DATE_ADD(:endDate, INTERVAL 1 DAY) )
             AND ( :persona = '' OR ${ _SQL_PERSONA_ESPERADA } LIKE :personaLike OR ${ _SQL_PERSONA_IDENTIFICADA } LIKE :personaLike )`;

const getFaceVerificationLogTrack = async(req, res = response) => {

    const {
        modo = ''
        , resultado = ''
        , startDate = ''
        , endDate = ''
        , persona = ''

        , limiter = 10
        , start = 0
    } = req.body;

    try{

        if (!await _fn_puedeVerBitacora(req)) {
            return res.json({ status: 1, message: 'No tienes acceso a la Bitácora Facial.' });
        }

        // Sin fecha se manda NULL, no '': MySQL en modo estricto marca
        // "Incorrect DATE value: ''" aunque esa parte del OR no aplique.
        const sStart = startDate ? startDate.substring(0, 10) : null;
        const sEnd = endDate ? endDate.substring(0, 10) : null;
        const sPersona = String(persona || '').trim();

        const replacements = {
            modo, resultado, startDate: sStart, endDate: sEnd,
            persona: sPersona, personaLike: `%${ sPersona }%`,
            start: Number(start), limiter: Number(limiter)
        };

        // Sin el script del 039 no hay columna `ip` ni tabla de evidencia.
        const bEsquema = await fn_esquemaEvidencia();

        const [countRow] = await dbConnection.query(
            `SELECT COUNT(*) AS iRows
             FROM face_verification_log AS L
             ${ _SQL_JOINS_BITACORA }
             ${ _SQL_FILTROS_BITACORA }`,
            { replacements, type: dbConnection.QueryTypes.SELECT }
        );

        const rows = await dbConnection.query(
            `SELECT
                L.idFaceVerificationLog,
                L.createDate,
                DATE_FORMAT( L.createDate, '%d-%m-%Y %h:%i %p' ) AS createDateDesc,
                L.modo,
                L.tipoPersonaEsperada,
                L.idPersonaEsperada,
                ${ _SQL_PERSONA_ESPERADA } AS personaEsperadaDesc,
                L.tipoPersonaIdentificada,
                L.idPersonaIdentificada,
                ${ _SQL_PERSONA_IDENTIFICADA } AS personaIdentificadaDesc,
                L.resultado,
                L.similitud,
                L.referencia,
                ${ bEsquema ? 'L.ip' : 'NULL' } AS ip,
                ${ bEsquema ? 'EXISTS ( SELECT 1 FROM face_verification_evidencia AS E WHERE E.idFaceVerificationLog = L.idFaceVerificationLog )' : '0' } AS bEvidencia,
                UC.name AS createUserDesc
             FROM face_verification_log AS L
             ${ _SQL_JOINS_BITACORA }
             LEFT JOIN users AS UC ON UC.idUser = L.idCreateUser
             ${ _SQL_FILTROS_BITACORA }
             ORDER BY L.createDate DESC, L.idFaceVerificationLog DESC
             LIMIT :start, :limiter`,
            { replacements, type: dbConnection.QueryTypes.SELECT }
        );

        rows.forEach((r) => { r.bEvidencia = Number(r.bEvidencia) === 1; });

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                count: countRow.iRows,
                rows
            }
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// Miniatura de evidencia de un renglón, junto con la foto del Face ID de
// la persona (identificada, o la esperada si no se identificó a nadie)
// para compararlas.
const getFaceEvidencia = async(req, res = response) => {

    const { idFaceVerificationLog = 0 } = req.body;

    try{

        if (!await _fn_puedeVerBitacora(req)) {
            return res.json({ status: 1, message: 'No tienes acceso a la Bitácora Facial.' });
        }

        if (!await fn_esquemaEvidencia()) {
            return res.json({ status: 1, message: 'Este renglón no tiene evidencia.' });
        }

        const [fila] = await dbConnection.query(
            `SELECT
                E.imgEvidencia,
                DATE_FORMAT( E.createDate, '%d-%m-%Y %h:%i %p' ) AS createDateDesc,
                L.resultado,
                L.similitud,
                L.referencia,
                L.ip,
                COALESCE( ${ _SQL_PERSONA_IDENTIFICADA }, ${ _SQL_PERSONA_ESPERADA } ) AS personaDesc,
                FR.imgThumb AS imgReferencia
             FROM face_verification_evidencia AS E
             INNER JOIN face_verification_log AS L ON L.idFaceVerificationLog = E.idFaceVerificationLog
             ${ _SQL_JOINS_BITACORA }
             LEFT JOIN face_reference AS FR
                ON FR.tipoPersona = COALESCE(L.tipoPersonaIdentificada, L.tipoPersonaEsperada)
               AND FR.idPersona = COALESCE(L.idPersonaIdentificada, L.idPersonaEsperada)
             WHERE E.idFaceVerificationLog = :idFaceVerificationLog`,
            { replacements: { idFaceVerificationLog: Number(idFaceVerificationLog) }, type: dbConnection.QueryTypes.SELECT }
        );

        if (!fila) {
            return res.json({ status: 1, message: 'Este renglón no tiene evidencia (o ya venció).' });
        }

        res.json({ status: 0, message: "Ejecutado correctamente.", data: fila });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const getCameraPreference = async(req, res = response) => {

    const {
        idUser
    } = req.body;

    try{

        const row = await dbConnection.query(
            `SELECT idUser, deviceId, label FROM face_camera_preference WHERE idUser = :idUser LIMIT 1`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: row.length > 0 ? row[0] : null
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const saveCameraPreference = async(req, res = response) => {

    const {
        idUser,
        deviceId,
        label = null
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        await dbConnection.query(
            `INSERT INTO face_camera_preference (idUser, deviceId, label, updateDate)
             VALUES (:idUser, :deviceId, :label, :updateDate)
             ON DUPLICATE KEY UPDATE deviceId = :deviceId, label = :label, updateDate = :updateDate`,
            { replacements: { idUser, deviceId, label, updateDate: oGetDateNow }, type: dbConnection.QueryTypes.INSERT }
        );

        res.json({
            status: 0,
            message: "Cámara preferida guardada."
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

module.exports = {
    saveFaceReference
    , getFaceReference
    , deleteFaceReference
    , logFaceVerification
    , getFaceVerificationLogTrack
    , getCameraPreference
    , saveCameraPreference
    , identificarRostro
    , verificarRostro
    , pedirReto
    , getFaceEvidencia
}
