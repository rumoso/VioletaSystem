const { Op } = require('sequelize');

const PrintType = require('../../models/printtype');

const printTypeNameExist = async(name ='',{req}) =>{
    const id =  req.params.id === undefined ? 0:req.params.id;
   const nameValue = await PrintType.findOne({ where: { name, idPrintType:{[Op.ne]:id} } });
   
    if(nameValue){
        throw new Error(`El nombre de tipo de impresión ${ name } ya está registrado.`);
    }
} 

const printTypeByIdExist = async(id ='') =>{
    const printTypeExist = await PrintType.findByPk(id);
 
     if(!printTypeExist){
         throw new Error(`El id ${id} no existe.`);
     }
 } 
 

module.exports = {
    printTypeNameExist,
    printTypeByIdExist   
}