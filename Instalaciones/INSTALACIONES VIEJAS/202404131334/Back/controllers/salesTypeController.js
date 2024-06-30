const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { dbConnection } = require('../database/config');


const cbxGetSalesTypeCombo = async(req, res = response) => {

    const {
        search = ''
    } = req.body;

    console.log(req.body)

    try{
        var OSQL = await dbConnection.query(`call cbxGetSalesTypeCombo( '${search}' )`)

        if(OSQL.length == 0){

            res.json({
                status:3,
                message:"No se encontró información.",
                data: null
            });
    
        }
        else{
    
            res.json({
                status:0,
                message:"Ejecutado correctamente.",
                data: OSQL
            });
    
        }

    }catch(error){
                
        res.status(500).json({
            status: 2,
            message:"Sucedió un error inesperado",
            data: error.message
        });
    }

};


module.exports = {
    cbxGetSalesTypeCombo
  }