
const { validationResult } = require('express-validator');

const validarCampos = (req,res, next)=>{
    const errors = validationResult(req);
   
    if(!errors.isEmpty()){
       const msg = errors.array(0)[0].msg;
       
        return res.status(400).json({
            status: 2,
            message: msg,
            data: errors
        });
    }

    next();
}


module.exports ={
    validarCampos
}