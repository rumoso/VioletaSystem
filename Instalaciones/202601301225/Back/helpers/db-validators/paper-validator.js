const { Op } = require('sequelize');

const Papers = require('../../models/paper');

const papersNameExist = async(name ='',{req}) =>{
    const id =  req.params.id === undefined ? 0:req.params.id;
    
   const nameValue = await Papers.findOne({ where: { name, idPaper:{[Op.ne]:id} } });
   
    if(nameValue){
        throw new Error(`Nombre de pliego '${ name }' ya está registrado.`);
    }
} 

const paperByIdExist = async(id ='') =>{
    const plateExist = await Plates.findByPk(id);
 
     if(!plateExist){
         throw new Error(`El id ${id} no existe.`);
     }
 } 
 

module.exports = {
    papersNameExist,
    paperByIdExist   
}