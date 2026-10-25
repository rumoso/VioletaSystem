const { response } = require('express');
const bcryptjs = require('bcryptjs');
const moment = require('moment');

const { dbConnectionLog } = require('../database/config');

const logRequestResponse = async (params, response, idUserLogOn = 0, idSucursal = 0) => {
    try {
        // Convierte los objetos en cadenas JSON
        const paramsJson = JSON.stringify(params);
        const responseJson = JSON.stringify(response);

        const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

        console.log( paramsJson )
        console.log( responseJson )

        // Llama al procedimiento almacenado de log con las cadenas JSON
        var OSQL = await dbConnectionLog.query(`call insertLogs(
            '${ oGetDateNow }'
            , '${ paramsJson }'
            , '${ responseJson }'
            , ${ idUserLogOn }
            , ${ idSucursal }
            )`)
    } catch (error) {
        console.error('Error al registrar en el log:', error);
    }
};

module.exports = {
    logRequestResponse
  }