const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');

const getMetalInventarioSaldos = async(req, res = response) => {

    const {
        tipoPropietario = ''
        , idPropietario = 0

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    try{

        var OSQL = await dbConnection.query(
            `call getMetalInventarioSaldos(:tipoPropietario, :idPropietario)`,
            { replacements: { tipoPropietario, idPropietario }, type: dbConnection.QueryTypes.RAW }
        )

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                rows: OSQL
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

const getMetalInventarioTrack = async(req, res = response) => {

    const {
        tipoPropietario = ''
        , idPropietario = 0
        , startDate = ''
        , endDate = ''

        , limiter = 10
        , start = 0

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    try{

        var OSQL = await dbConnection.query(
            `call getMetalInventarioTrack(:tipoPropietario, :idPropietario, :startDate, :endDate, :start, :limiter)`,
            { replacements: {
                tipoPropietario, idPropietario,
                startDate: startDate.substring(0, 10), endDate: endDate.substring(0, 10),
                start, limiter
            }, type: dbConnection.QueryTypes.RAW }
        )

        const iRows = ( OSQL.length > 0 ? OSQL[0].iRows : 0 );

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                count: iRows,
                rows: OSQL
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

const addMetalInventarioMovimiento = async(req, res = response) => {

    const {
        tipoMovimiento = 'ENTRADA'
        , tipoOrigen = 'EXTERNO'
        , idOrigen = 0
        , tipoDestino
        , idDestino
        , idProduct
        , gramos = 0
        , referencia = ''

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var OSQL = await dbConnection.query(
            `call insertMetalInventarioMovimiento(:oGetDateNow, :tipoMovimiento, :tipoOrigen, :idOrigen, :tipoDestino, :idDestino, :idProduct, :gramos, :referencia, :idUserLogON)`,
            { replacements: {
                oGetDateNow, tipoMovimiento,
                tipoOrigen, idOrigen: idOrigen || 0,
                tipoDestino, idDestino: idDestino || 0,
                idProduct, gramos, referencia, idUserLogON
            }, type: dbConnection.QueryTypes.RAW }
        )

        res.json({
            status: OSQL[0].out_id > 0 ? 0 : 1,
            message: OSQL[0].message
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const cbxGetProductosMetal = async(req, res = response) => {

    try{

        var OSQL = await dbConnection.query(
            `SELECT idProduct, barCode, name,
                CASE WHEN barCode LIKE 'METAL-ORO-%' THEN 'oro' ELSE 'plata' END AS tipoMetal,
                CAST( SUBSTRING_INDEX( barCode, '-', -1 ) AS DECIMAL(18,2) ) AS medida
            FROM products
            WHERE barCode LIKE 'METAL-%' AND active = 1
            ORDER BY tipoMetal, medida DESC`,
            { type: dbConnection.QueryTypes.SELECT }
        )

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: OSQL
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
    getMetalInventarioSaldos
    , getMetalInventarioTrack
    , addMetalInventarioMovimiento
    , cbxGetProductosMetal
}
