const { Op } = require('sequelize');

const Products = require('../../models/product');

const productNameExist = async(name ='',{req}) =>{
    const id =  req.params.id === undefined ? 0:req.params.id;
    
   const nameValue = await Products.findOne({ where: { name, idProduct:{[Op.ne]:id} } });
   
    if(nameValue){
        throw new Error(`Nombre de producto '${nameValue.name }' ya está registrado.`);
    }
} 

const productByIdExist = async(id ='') =>{
    const productExist = await Products.findByPk(id);
 
     if(!productExist){
         throw new Error(`El id ${id} no existe.`);
     }
 } 
 

module.exports = {
    productNameExist,
    productByIdExist   
}