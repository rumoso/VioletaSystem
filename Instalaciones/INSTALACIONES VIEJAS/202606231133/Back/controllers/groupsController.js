const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { dbConnection } = require('../database/config');


const cbxGetGroupsCombo = async(req, res = response) => {

  const {
    search = ''
  } = req.body;

  //console.log(req.body)
  var OSQL = await dbConnection.query(`call cbxGetGroupsCombo( '${search}' )`)

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
    cbxGetGroupsCombo
  }