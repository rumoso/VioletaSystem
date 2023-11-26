const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { dbConnection } = require('../database/config');

const getUsersListWithPage = async(req, res = response) => {

    const idUserLogON = req.header('idUserLogON')

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
                status: 0,
                message: "Ejecutado correctamente.",
                data:{
                    count: iRows,
                    rows: OSQL
                }
            });
            
        }
        
    }catch(error){
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

const getUserByID = async(req, res = response) => {

    const {
        idUser
    } = req.body;

    console.log(req.body)

    try{
        
        var OSQL = await dbConnection.query(`call getUserByID(${ idUser })`)

        if(OSQL.length == 0){

            res.json({
                status: 0,
                message: "No se encontró el usuario.",
                data: null
            });

        }
        else{

            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data: OSQL[0]
            });

        }
        
    }catch(error){
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const insertUser = async(req, res) => {
    
    const {
        name,
        userName,
        pwd = '',
        authorizationCode = '',
        active,

        idUserLogON,
        idSucursalLogON
        
    } = req.body;

    console.log(req.body)

    try{

        //encript pwd
        const salt = bcryptjs.genSaltSync();
        const pwdEncrypt = bcryptjs.hashSync( pwd, salt);

        var OSQL = await dbConnection.query(`call insertUser(
        '${ name }'
        ,'${ userName }'
        ,'${ pwdEncrypt }'
        , '${ authorizationCode }'
        , ${ active }

        , ${ idUserLogON }
        )`)

        res.json({
            status: OSQL[0].out_id > 0 ? 0 : 1,
            message: OSQL[0].message,
            insertID: OSQL[0].out_id
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const updateUser = async(req, res) => {
   
    const {
        idUser,
        name,
        userName,
        pwd = '',
        authorizationCode = '',
        active
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call updateUser(
        ${ idUser }
        ,'${ name }'
        ,'${ userName }'
        ,'${ authorizationCode }'
        , ${ active }
        )`)

        //var ODeleteSync_up = await dbConnection.query(`call deleteSync_up( 'Users', ${ idUser } )`);

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

            var ODeleteSync_up = await dbConnection.query(`call deleteSync_up( 'Users', ${ idUser } )`);

            res.json({
                status: 0,
                message: "Contraseña actualizada con éxito.",
                insertID: OSQL[0].out_id
            });

        }else{

            res.json({
            status: 1,
            message: "Las contraseñas no coinciden",
            });

        }

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const disabledUser = async(req, res) => {
   
    const {
        idUser
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call disabledUser(
        ${ idUser }
        )`)

        var ODeleteSync_up = await dbConnection.query(`call deleteSync_up( 'Users', ${ idUser } )`);

        res.json({
            status:0,
            message:"Usuario deshabilitado con éxito.",
            insertID: OSQL[0].out_id
        });

    }catch(error){

        res.json({
        status:2,
        message: "Sucedió un error inesperado",
        data: error.message
        });

    }
}

const cbxGetSellersCombo = async(req, res = response) => {

    const {
        idUser,
        search = ''
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call cbxGetSellersCombo( ${ idUser },'${ search }' )`)

        if(OSQL.length == 0){

            res.json({
                status: 3,
                message: "No se encontró información.",
                data: null
            });

        }
        else{

            res.json({
                status:  0,
                message:"Ejecutado correctamente.",
                data: OSQL
            });

        }

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }

};

module.exports = {
    getUsersListWithPage
    , getUserByID
    , insertUser
    , updateUser
    , changePassword
    , disabledUser
    , cbxGetSellersCombo
}