const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { dbConnection } = require('../database/config');

const getPacientesListWithPage = async(req, res = response) => {

    const {
        search = '', limiter = 10, start = 0
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getPacientesListWithPage('${ search }',${ start },${ limiter })`)

        if(OSQL.length == 0){

            res.json({
                status:0,
                message:"Ejecutado correctamente.",
                data:{
                count: 0,
                rows: null
                }
            });

        }
        else{

            const iRows = ( OSQL.length > 0 ? OSQL[0].iRows: 0 );
            
            res.json({
                status:0,
                message:"Ejecutado correctamente.",
                data:{
                count: iRows,
                rows: OSQL
                }
            });
            
        }
        
    }catch(error){
      
        res.status(500).json({
            status:2,
            message:"Sucedió un error inesperado",
            data:error
        });
    }
};

const getClientByID = async(req, res = response) => {

  const {
      idClient
  } = req.body;

  console.log(req.body)
  var OSQL = await dbConnection.query(`call getClientByID(${ idClient })`)

  const iRows = ( OSQL.length > 0 ? OSQL[0].iRows: 0 );
      
  res.json({
      status:0,
      message:"Ejecutado correctamente.",
      data: OSQL
    });

};

const insertPaciente = async(req, res) => {
   
  const {
    name,
    fechaNacimiento = ''
  } = req.body;

  console.log(req.body)

  try{

      var OSQL = await dbConnection.query(`call insertPaciente(
          '${name}'
          , '${fechaNacimiento}'
          )`)

      res.json({
          status:0,
          message:"Paciente guardado con éxito.",
          insertID: OSQL[0].out_id
      });
      
  }catch(error){
      
      res.status(500).json({
          status:2,
          message:"Sucedió un error inesperado",
          data:error
      });
  }
}

const updatePaciente = async(req, res) => {
   
  const {
    idPaciente,
    name = '',
    fechaNacimiento = ''
  } = req.body;

  console.log(req.body)

  try{

      var OSQL = await dbConnection.query(`call updatePaciente(
          ${idPaciente}  
          , '${name}'
          , '${fechaNacimiento}'
          )`)

      res.json({
          status:0,
          message:"Paciente actualizado con éxito.",
          insertID: OSQL[0].out_id
      });
      
  }catch(error){
      
      res.status(500).json({
          status:2,
          message:"Sucedió un error inesperado",
          data:error
      });
  }
}

const deletePaciente = async(req, res) => {
   
  const {
    idPaciente
  } = req.body;

  console.log(req.body)

  try{

      var OSQL = await dbConnection.query(`call deletePaciente(
          ${idPaciente}
          )`)

      res.json({
          status:0,
          message:"Paciente eliminado con éxito.",
          insertID: OSQL[0].out_id
      });
      
  }catch(error){
      
      res.status(500).json({
          status:2,
          message:"Sucedió un error inesperado",
          data:error
      });
  }
}

module.exports = {
    getPacientesListWithPage
    ,getClientByID
    ,insertPaciente
    ,updatePaciente
    ,deletePaciente
  }