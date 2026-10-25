const { response } = require("express");
const { json } = require("express/lib/response");


const esAdminRole = ( req, res = response, next) => {

    if( !req.user ){
        return res.status( 500 ),json({
            msg:'Se quiere validar el rol sin validar el token primero'
        });
    }

    const { rol, username} = req.user;

    if( rol !=='ADMIN_ROLE' ){
        return res.status(401).json({
            msg: `${ username } no es administrador - No puede hacer esto`
        });
    }

    next();
}

const tieneRole = ( ...roles ) => {

    return (req, res = response, next)=>{
        
        if( !req.user ){
            return res.status( 500 ),json({
                msg:'Se quiere validar el rol sin validar el token primero'
            });
        }

        if( !roles.includes( req.user.rol ) ){
            return res.status(401).json({
                msg:`El servicio requiere uno de estos roles ${ roles }`
            });
        }        
        
        next();
    }
}



module.exports = {
    esAdminRole,
    tieneRole
}