const Roles = require('../../models/role');
const User = require('../../models/user');

const isRoleValid = async(rol = '') => {
    
    const existeRol =  await Roles.findOne({ where:{ rol:rol }});
    if( !existeRol ){
        throw new Error(`El rol ${ rol } no está registrado en la base de datos`);
    }

}

const usernameExist = async(username ='') =>{
    
   const usernameValue = await User.findOne({ where: { username } });
   
    if(usernameValue){
        throw new Error(`El nombre de usuario ${username } ya está registrado`);
    }
} 

const userByIdExist = async(id ='') =>{
    const userExist = await User.findByPk(id);
 
     if(!userExist){
         throw new Error(`El id ${id} no existe.`);
     }
 } 
 

module.exports = {
    isRoleValid,
    usernameExist,
    userByIdExist   
}