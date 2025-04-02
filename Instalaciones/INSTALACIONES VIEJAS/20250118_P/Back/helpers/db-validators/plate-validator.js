const { Op } = require('sequelize');

const Plates = require('../../models/plate');

const plateNameExist = async(name ='',{req}) =>{
    const id =  req.params.id === undefined ? 0:req.params.id;
    
   const nameValue = await Plates.findOne({ where: { name, idPlate:{[Op.ne]:id} } });
   
    if(nameValue){
        throw new Error(`Nombre de placa '${nameValue.name }' ya está registrada.`);
    }
} 

const plateByIdExist = async(id ='') =>{
    const plateExist = await Plates.findByPk(id);
 
     if(!plateExist){
         throw new Error(`El id ${id} no existe.`);
     }
 } 
 

module.exports = {
    plateNameExist,
    plateByIdExist   
}