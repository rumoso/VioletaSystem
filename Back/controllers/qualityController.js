const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { dbConnection } = require('../database/config');


const cbxGetQualityCombo = async(req, res = response) => {

  const {
    search = ''
  } = req.body;

  console.log(req.body)
  var OSQL = await dbConnection.query(`call cbxGetQualityCombo( '${search}' )`)

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

};


module.exports = {
    cbxGetQualityCombo
  }