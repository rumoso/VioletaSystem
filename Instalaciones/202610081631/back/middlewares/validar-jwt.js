
const { request, response } = require('express');
const jwt =require('jsonwebtoken');

const User = require('../models/user');

const validarJWT = async( req = request, res = response, next) =>{

    const token = req.header( 'x-token');

    if( !token ){
        return res.status(401).json({
            status:1,
            message:"No hay token en la petición",
            data:null
        });
    }

    try{
        const { uid } = jwt.verify( token, process.env.SECRETPRIVATEKEY );
        console.log("uid");
        console.log(uid);
        const user = await User.findByPk(uid);
     
        if( !user ){
            return req.status(401).json({
                status:1,
                message:"Token no válido - usuario no existe en la BD",
                data:null

            })
        }
     
        //Verificar si uid tiene estado en true
        if( !user.active ){
            return res.status(401).json({
                status:1,
                message:"Token no válido - usuario con estado false",
                data:null
            })
        }
        console.log("4");
        req.user = user;
        console.log("5");
        next();

    } catch( error ){

        console.log(error);
        res.status(401).json({
            status:2,
            message:"Token no válido",
            data:null
        })
    }

}


module.exports ={
    validarJWT
}