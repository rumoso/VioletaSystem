const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');

// Reconocimiento facial (analisis/004-reconocimiento-facial.md).
// Todo el reconocimiento (comparacion de rostros) ocurre en el
// navegador; aqui solo se guarda/entrega el descriptor y el resultado
// de cada intento. Queries directas sobre la instancia compartida
// `dbConnection` (pool propio, se libera sola) — nunca createConexion().

const saveFaceReference = async(req, res = response) => {

    const {
        tipoPersona,
        idPersona,
        descriptor,
        imgThumb = null,

        idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

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
                    idCreateUser: idUserLogON
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
            `SELECT idFaceReference, tipoPersona, idPersona, descriptor, imgThumb, updateDate
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

const getFaceReferences = async(req, res = response) => {

    const {
        tipoPersona = ''
    } = req.body;

    try{

        const rows = await dbConnection.query(
            `SELECT
                FR.idFaceReference, FR.tipoPersona, FR.idPersona, FR.descriptor,
                CASE WHEN FR.tipoPersona = 'CLIENTE' THEN CONCAT(IFNULL(C.name,''),' ',IFNULL(C.lastName,''))
                     ELSE U.name END AS nombrePersona
             FROM face_reference AS FR
             LEFT JOIN customers AS C ON FR.tipoPersona = 'CLIENTE' AND C.idCustomer = FR.idPersona
             LEFT JOIN users AS U ON FR.tipoPersona = 'USUARIO' AND U.idUser = FR.idPersona
             WHERE ( :tipoPersona = '' OR FR.tipoPersona = :tipoPersona )`,
            { replacements: { tipoPersona }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: rows
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

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

        idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

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
    , getFaceReferences
    , logFaceVerification
    , getFaceVerificationLogTrack
    , getCameraPreference
    , saveCameraPreference
}
