// Bitácora de verificaciones faciales escrita por el SERVIDOR
// (analisis/020). Los éxitos se registran al gastar el comprobante, que
// es cuando de verdad se usó la identificación; los fallos, cuando el
// servidor compara y no coincide. El navegador ya no puede escribir un
// éxito.

const moment = require('moment');

const { dbConnection } = require('../database/config');

// oLog: { modo, tipoPersonaEsperada, idPersonaEsperada,
//         tipoPersonaIdentificada, idPersonaIdentificada,
//         resultado, similitud, referencia, idCreateUser }
//
// La bitácora nunca debe tumbar el flujo que la llama: si falla el
// INSERT se deja en consola y se sigue.
const fn_logVerificacion = async (oLog) => {

    try {

        await dbConnection.query(
            `INSERT INTO face_verification_log
                (createDate, modo, tipoPersonaEsperada, idPersonaEsperada, tipoPersonaIdentificada, idPersonaIdentificada, resultado, similitud, referencia, idCreateUser)
             VALUES
                (:createDate, :modo, :tipoPersonaEsperada, :idPersonaEsperada, :tipoPersonaIdentificada, :idPersonaIdentificada, :resultado, :similitud, :referencia, :idCreateUser)`,
            {
                replacements: {
                    createDate: moment().format('YYYY-MM-DD HH:mm:ss'),
                    modo: oLog.modo || 'IDENTIFICAR',
                    tipoPersonaEsperada: oLog.tipoPersonaEsperada || null,
                    idPersonaEsperada: oLog.idPersonaEsperada || null,
                    tipoPersonaIdentificada: oLog.tipoPersonaIdentificada || null,
                    idPersonaIdentificada: oLog.idPersonaIdentificada || null,
                    resultado: oLog.resultado,
                    similitud: oLog.similitud === undefined ? null : oLog.similitud,
                    referencia: oLog.referencia || null,
                    idCreateUser: oLog.idCreateUser || 0
                },
                type: dbConnection.QueryTypes.INSERT
            }
        );

    } catch (error) {
        console.log('No se pudo escribir la bitácora facial:', error.message);
    }

};

// Éxito al gastar un comprobante: los datos salen del comprobante mismo.
const fn_logExitoComprobante = (datos, sReferencia = null) => fn_logVerificacion({
    modo: datos.modo,
    tipoPersonaEsperada: datos.modo === 'VERIFICAR' ? datos.tipoPersona : null,
    idPersonaEsperada: datos.modo === 'VERIFICAR' ? datos.idPersona : null,
    tipoPersonaIdentificada: datos.tipoPersona,
    idPersonaIdentificada: datos.idPersona,
    resultado: 'EXITO',
    similitud: datos.similitud,
    referencia: sReferencia || datos.referencia,
    idCreateUser: datos.idPersona
});

module.exports = {
    fn_logVerificacion,
    fn_logExitoComprobante
};
