const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { dbConnection } = require('../database/config');

const getUsersListWithPage = async(req, res = response) => {

    const {
        search = '', limiter = 10, start = 0
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getUsersListWithPage('${ search }',${ start },${ limiter })`)

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

const getUserByID = async(req, res = response) => {

  const {
      idUser
  } = req.body;

  console.log(req.body)
  var OSQL = await dbConnection.query(`call getUserByID(${ idUser })`)

  if(OSQL.length == 0){

        res.json({
            status:0,
            message:"No se encontró el usuario.",
            data: null
        });

    }
    else{

        res.json({
            status:0,
            message:"Ejecutado correctamente.",
            data: OSQL[0]
        });

    }

};

const insertUser = async(req, res) => {
   
  const {
    idUser,
    name,
    userName,
    pwd = '',
    active
  } = req.body;

  console.log(req.body)

  try{

    //encript pwd
    const salt = bcryptjs.genSaltSync();
    const pwdEncrypt = bcryptjs.hashSync( pwd, salt);

      var OSQL = await dbConnection.query(`call insertUser(
          '${name}'
          ,'${userName}'
          ,'${pwdEncrypt}'
          , ${active}
          )`)

      res.json({
          status:0,
          message:"Usuario guardado con éxito.",
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

const updateUser = async(req, res) => {
   
  const {
    idUser,
    name,
    userName,
    pwd = '',
    active
  } = req.body;

  console.log(req.body)

  try{

      var OSQL = await dbConnection.query(`call updateUser(
        ${idUser}
        ,'${name}'
        ,'${userName}'
        , ${active}
          )`)

      res.json({
          status:0,
          message:"Usuario actualizado con éxito.",
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

const changePassword = async(req, res) => {
   
    const {
      idUser,
      pwd = '',
      pwd2 = ''
    } = req.body;
  
    console.log(req.body)
  
    try{

        if(pwd == pwd2){

            //encript pwd
            const salt = bcryptjs.genSaltSync();
            const pwdEncrypt = bcryptjs.hashSync( pwd, salt);
    
            var OSQL = await dbConnection.query(`call updatePWD(
            ${idUser}
            ,'${pwdEncrypt}'
            )`)
    
            res.json({
                status:0,
                message:"Contraseña actualizada con éxito.",
                insertID: OSQL[0].out_id
            });

        }else{

            res.json({
                status: 1,
                message:"Las contraseñas no coinciden",
            });

        }

    }catch(error){
        
        res.status(500).json({
            status:2,
            message:"Sucedió un error inesperado",
            data:error
        });
    }
  }

const deleteUser = async(req, res) => {
   
  const {
    idUser
  } = req.body;

  console.log(req.body)

  try{

      var OSQL = await dbConnection.query(`call deleteUser(
          ${ idUser }
          )`)

      res.json({
          status:0,
          message:"Usuario eliminado con éxito.",
          insertID: OSQL[0].out_id
      });
      
  }catch(error){
      
      res.status(500).json({
          status:2,
          message:"Sucedió un error inesperado",
          data: error.message
      });
  }
}

module.exports = {
    getUsersListWithPage
    , getUserByID
    , insertUser
    , updateUser
    , changePassword
    , deleteUser
  }