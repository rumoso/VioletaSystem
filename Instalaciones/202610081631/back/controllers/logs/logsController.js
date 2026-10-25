const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { dbConnectionLog } = require('../database/config');

const logRequestResponse = async (params, response) => {
    try {
        // Convierte los objetos en cadenas JSON
        const paramsJson = JSON.stringify(params);
        const responseJson = JSON.stringify(response);

        console.log( paramsJson )
        console.log( responseJson )

        // Llama al procedimiento almacenado de log con las cadenas JSON
        //await dbConnection.query('CALL logRequestResponse(?, ?)', [paramsJson, responseJson]);
    } catch (error) {
        console.error('Error al registrar en el log:', error);
    }
};

module.exports = {
    logRequestResponse
  }