const { Op } = require('sequelize');

const Density = require('../../models/density');

const densitySymbolExist = async(symbol ='',{req}) =>{
    const id =  req.params.id === undefined ? 0:req.params.id;
    
    const symbolValue = await Density.findOne({ where: { symbol, idDensity:{[Op.ne]:id} } });
   
    if(symbolValue){
        throw new Error(`Símbolo abreviado ${ symbol } ya está registrado.`);
    }
} 

const densityByIdExist = async(id ='') =>{
    const densityExist = await Density.findByPk(id);
 
     if(!densityExist){
         throw new Error(`El id ${id} no existe.`);
     }
 } 
 

module.exports = {
    densitySymbolExist,
    densityByIdExist   
}