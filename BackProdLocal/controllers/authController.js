const bcryptjs = require('bcryptjs');
const { response } = require('express');
const { json } = require('express/lib/response');
const { generarJWT } = require('../helpers/generar-jwt');
const { googleVerify } = require('../helpers/google-verify');

const { dbConnection } = require('../database/config');


const login = async(req, res = response)=>{

    const {
        username
        ,pwd
    }= req.body;

    var OSQL = null;

    try{

        OSQL = await dbConnection.query(`call getUserByUserName('${ username }' )`);

        console.log(OSQL);

        //encript pwd
        const salt = bcryptjs.genSaltSync();
        //user.pwd = bcryptjs.hashSync( '1234567890', salt);

        if( OSQL.length == 0 ){
            return res.json({
                status:1,
                message:"Usuario / Password no son correctos",
                //pwd: bcryptjs.hashSync( '1234567890', salt),
                data:null
            })
        }
    
        var user = OSQL[0];

        //Si el usuario está activo
        if( !user.active ){
            return res.json({
                status:1,
                message:"Usuario / Password no son correctos",
                data:null
            })
        }

        //Verificar contraseña
        const validPassword = bcryptjs.compareSync(pwd, user.pwd);

        if(!validPassword){
            return res.json({
                status:1,
                message:"Usuario / Password no son correctos",
                data:null
            })
        }

        //Generar el JWT
        const token = await generarJWT( user.iduser );

        //const salt = bcryptjs.genSaltSync();
        //const token = bcryptjs.hashSync( '112501184', salt);

        res.json({
            status:0,
            message:"Conectado correctamente.",
            data:{
                user,
                token
            }
        });
    }
    catch( error ){
        
        res.status(500).json({
            status:2,
            message:"Sucedió un error inesperado",
            error: error.message,
            data: OSQL
        });
    }
}

const getMenuByPermissions = async(req, res = response)=>{

    const {
        idUser
    }= req.body;

    var OSQL = null;

    try{

        var OMenuList = [];

        OGetMenuFatherList = await dbConnection.query(`call getMenuFathersByPermission(${ idUser })`);

        //console.log(OGetMenuFatherList);

        if( OGetMenuFatherList.length == 0 ){
            return res.json({
                status:1,
                message:"No tiene permisos",
                data:null
            })
        }else{

            for(var i = 0; i < OGetMenuFatherList.length; i++){

                var oMenuFather = OGetMenuFatherList[i];

                var OMenu = {
                    'idMenu': oMenuFather.idMenu,
                    'lugar': oMenuFather.lugar,
                    'name': oMenuFather.name,
                    'icon': oMenuFather.icon,
                    'subMenus': []
                }

                OGetMenuDetailFatherList = await dbConnection.query(`call getMenuDetailsByPermission( ${ idUser }, ${ oMenuFather.idMenu } )`);
                
                var OSubMenus = [];
                for(var n = 0; n < OGetMenuDetailFatherList.length; n++){
                    //console.log(OGetMenuDetailFatherList[n])

                    var oGetMenuDetail = OGetMenuDetailFatherList[n];

                    var OMenuDetail = {
                        'idMenu': oGetMenuDetail.idMenu,
                        'idMenuPadre': oGetMenuDetail.idMenuPadre,
                        'lugar': oGetMenuDetail.lugar,
                        'name': oGetMenuDetail.name,
                        'description': oGetMenuDetail.description,
                        'icon': oGetMenuDetail.icon,
                        'linkCat': oGetMenuDetail.linkCat,
                        'linkList': oGetMenuDetail.linkList,
                        'imgDash': oGetMenuDetail.imgDash,
                        'imgDashSize': oGetMenuDetail.imgDashSize
                    };

                    OMenu.subMenus.push( OMenuDetail );
                }

                OMenuList.push(OMenu);
            }

            console.log( OMenuList )

            res.json({
                status:0,
                message:"Conectado correctamente.",
                data: OMenuList
            });

        }
        
    }
    catch( error ){
        
        res.status(500).json({
            status:2,
            message:"Sucedió un error inesperado",
            error: error.message,
            data: OSQL
        });
    }
}

// const googleSingIn = async( req, res = response) =>{

//     const { id_token } = req.body;

//     try{
//          const { correo, nombre, img} =await googleVerify( id_token );
//           console.log('correo, nombre, img');
//           console.log(correo, nombre, img);
        
//         let usuario = await Usuario.findOne({ email:correo });
//         console.log('USUARIO: ',usuario);

//         if(!usuario){
//             const data = {
//                 name,
//                 email,
//                 password:':P',
//                 rol:'ADMIN_ROLE',
//                 google:true
//             };

//             usuario = new Usuario( data ); 
//             await usuario.save();
//         }

//         console.log('googleVERiFY',correo, nombre, img);

//         //Si el usuario en BD

//         if(!usuario.estado){
//             return res.status(401).json({
//                 msg:'Hable con el administrador, usuario bloqueado'
//             });
//         }

//         //Generar el JWT
//         const token = await generarJWT( usuario.id );


//         res.json({
//            usuario,
//            token
//         });
//     }catch(error){
//         res.status(400).json({
//             ok:false,
//             msg:'El token no se pudo verificar'
//         })
//     }

  

// }

module.exports={
    login
    ,getMenuByPermissions
}