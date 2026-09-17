const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');

const { fn_descriptorValido, fn_parsearDescriptor, fn_comparar } = require('../helpers/faceMatch');
const { fn_propositoValido, fn_emitirComprobante } = require('../helpers/faceTicket');
const { fn_logVerificacion } = require('../helpers/faceBitacora');

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
const _fn_validarPeticionRostro = ({ tipoPersona, descriptor, proposito }) => {

    if (!tipoPersona) {
        return 'Falta el tipo de persona.';
    }

    if (!fn_propositoValido(proposito)) {
        return 'La operación de la identificación no es válida.';
    }

    if (!fn_descriptorValido(descriptor)) {
        return 'La captura del rostro no es válida. Intenta de nuevo.';
    }

    return null;

};

// ── Identificar (1:N) ──
// Busca entre todas las referencias del tipo de persona. Con UNA
// coincidencia entrega su comprobante. Con varias NO entrega ninguno:
// regresa los candidatos (sin descriptores) para que el operador elija y
// se verifique 1:1 con una captura nueva.
const identificarRostro = async(req, res = response) => {

    const {
        tipoPersona = '',
        descriptor,
        proposito = '',
        referencia = '',
        idUserLogON = 0
    } = req.body;

    const sError = _fn_validarPeticionRostro({ tipoPersona, descriptor, proposito });

    if (sError) {
        return res.json({ status: 1, message: sError });
    }

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

        if (candidatos.length === 0) {

            await fn_logVerificacion({
                modo: 'IDENTIFICAR', resultado: 'FALLO', similitud: 0, referencia, idCreateUser: idUserLogON
            });

            return res.json({ status: 0, message: 'No se encontró coincidencia.', data: { resultado: 'SIN_COINCIDENCIA' } });
        }

        if (candidatos.length > 1) {
            return res.json({ status: 0, message: 'Hay varias coincidencias posibles.', data: { resultado: 'VARIOS', candidatos } });
        }

        const persona = candidatos[0];

        const ticket = fn_emitirComprobante({ ...persona, proposito, modo: 'IDENTIFICAR', referencia });

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
        descriptor,
        proposito = '',
        referencia = '',
        idUserLogON = 0
    } = req.body;

    const sError = _fn_validarPeticionRostro({ tipoPersona, descriptor, proposito });

    if (sError) {
        return res.json({ status: 1, message: sError });
    }

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
                modo: 'VERIFICAR', tipoPersonaEsperada: tipoPersona, idPersonaEsperada: idPersona,
                resultado: 'FALLO', similitud: oCmp.similitud,
                referencia: `${ referencia } (captura rechazada: idéntica a la referencia guardada)`,
                idCreateUser: idUserLogON
            });

            return res.json({ status: 1, message: 'La captura del rostro no es válida. Intenta de nuevo.' });
        }

        if (!oCmp.bCoincide) {

            await fn_logVerificacion({
                modo: 'VERIFICAR', tipoPersonaEsperada: tipoPersona, idPersonaEsperada: idPersona,
                resultado: 'FALLO', similitud: oCmp.similitud, referencia, idCreateUser: idUserLogON
            });

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

        const ticket = fn_emitirComprobante({ ...persona, proposito, modo: 'VERIFICAR', referencia });

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
        descriptor,
        imgThumb = null
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    if (!fn_descriptorValido(descriptor)) {
        return res.json({ status: 1, message: 'La captura del rostro no es válida. Intenta de nuevo.' });
    }

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

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    // Los éxitos los escribe el servidor al gastar el comprobante. Desde
    // el navegador solo se registra lo que el servidor no puede ver:
    // cámara no disponible, identificación descartada por el operador,
    // candidatos cancelados o autorización manual.
    if (String(resultado).toUpperCase() === 'EXITO') {
        return res.json({ status: 1, message: 'Resultado no permitido.' });
    }

    try{

        await dbConnection.query(
            `INSERT INTO face_verification_log
                (createDate, modo, tipoPersonaEsperada, idPersonaEsperada, tipoPersonaIdentificada, idPersonaIdentificada, resultado, similitud, referencia, idCreateUser)
             VALUES
                (:createDate, :modo, :tipoPersonaEsperada, :idPersonaEsperada, :tipoPersonaIdentificada, :idPersonaIdentificada, :resultado, :similitud, :referencia, :idCreateUser)`,
            {
                replacements: {
                    createDate: oGetDateNow,
                    modo,
                    tipoPersonaEsperada,
                    idPersonaEsperada,
                    tipoPersonaIdentificada,
                    idPersonaIdentificada,
                    resultado,
                    similitud,
                    referencia,
                    idCreateUser: idUserLogON
                },
                type: dbConnection.QueryTypes.INSERT
            }
        );

        res.json({
            status: 0,
            message: "Registrado."
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const getFaceVerificationLogTrack = async(req, res = response) => {

    const {
        modo = ''
        , resultado = ''
        , startDate = ''
        , endDate = ''

        , limiter = 10
        , start = 0
    } = req.body;

    try{

        const sStart = startDate.substring(0, 10);
        const sEnd = endDate.substring(0, 10);

        const [countRow] = await dbConnection.query(
            `SELECT COUNT(*) AS iRows
             FROM face_verification_log AS L
             WHERE ( :modo = '' OR L.modo = :modo )
             AND ( :resultado = '' OR L.resultado = :resultado )
             AND ( :startDate = '' OR DATE(L.createDate) >= :startDate )
             AND ( :endDate = '' OR DATE(L.createDate) <= :endDate )`,
            { replacements: { modo, resultado, startDate: sStart, endDate: sEnd }, type: dbConnection.QueryTypes.SELECT }
        );

        const rows = await dbConnection.query(
            `SELECT
                L.idFaceVerificationLog,
                L.createDate,
                DATE_FORMAT( L.createDate, '%d-%m-%Y %h:%i %p' ) AS createDateDesc,
                L.modo,
                L.tipoPersonaEsperada,
                L.idPersonaEsperada,
                CASE L.tipoPersonaEsperada
                    WHEN 'CLIENTE' THEN CONCAT(IFNULL(CE.name,''),' ',IFNULL(CE.lastName,''))
                    WHEN 'USUARIO' THEN UE.name
                    ELSE NULL END AS personaEsperadaDesc,
                L.tipoPersonaIdentificada,
                L.idPersonaIdentificada,
                CASE L.tipoPersonaIdentificada
                    WHEN 'CLIENTE' THEN CONCAT(IFNULL(CI.name,''),' ',IFNULL(CI.lastName,''))
                    WHEN 'USUARIO' THEN UI.name
                    ELSE NULL END AS personaIdentificadaDesc,
                L.resultado,
                L.similitud,
                L.referencia,
                UC.name AS createUserDesc
             FROM face_verification_log AS L
             LEFT JOIN customers AS CE ON L.tipoPersonaEsperada = 'CLIENTE' AND CE.idCustomer = L.idPersonaEsperada
             LEFT JOIN users AS UE ON L.tipoPersonaEsperada = 'USUARIO' AND UE.idUser = L.idPersonaEsperada
             LEFT JOIN customers AS CI ON L.tipoPersonaIdentificada = 'CLIENTE' AND CI.idCustomer = L.idPersonaIdentificada
             LEFT JOIN users AS UI ON L.tipoPersonaIdentificada = 'USUARIO' AND UI.idUser = L.idPersonaIdentificada
             LEFT JOIN users AS UC ON UC.idUser = L.idCreateUser
             WHERE ( :modo = '' OR L.modo = :modo )
             AND ( :resultado = '' OR L.resultado = :resultado )
             AND ( :startDate = '' OR DATE(L.createDate) >= :startDate )
             AND ( :endDate = '' OR DATE(L.createDate) <= :endDate )
             ORDER BY L.createDate DESC, L.idFaceVerificationLog DESC
             LIMIT :start, :limiter`,
            { replacements: { modo, resultado, startDate: sStart, endDate: sEnd, start: Number(start), limiter: Number(limiter) }, type: dbConnection.QueryTypes.SELECT }
        );

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
}
