const { Op } = require('sequelize');

const Roles = require('../../models/role');

const roleNameExist = async(name ='',{req}) =>{
    const id =  req.params.id === undefined ? 0:req.params.id;
    
   const nameValue = await Roles.findOne({ where: { name, idRole:{[Op.ne]:id} } });
   
    if(nameValue){
        throw new Error(`Nombre de rol '${nameValue.name }' ya está registrado.`);
    }
} 

const roleByIdExist = async(id ='') =>{
    const roleExist = await Roles.findByPk(id);
 
     if(!roleExist){
         throw new Error(`El id ${id} no existe.`);
     }
 } 
 

module.exports = {
    roleNameExist,
    roleByIdExist   
}