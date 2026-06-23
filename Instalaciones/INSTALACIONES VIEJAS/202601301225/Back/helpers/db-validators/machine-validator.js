const { Op } = require('sequelize');

const Machines = require('../../models/machine');

const machinesNameExist = async(name ='',{req}) =>{
    const id =  req.params.id === undefined ? 0:req.params.id;    
    const nameValue = await Machines.findOne({ where: { name, idMachine:{[Op.ne]:id} } });
   
    if(nameValue){
        throw new Error(`Nombre de máquina '${ name }' ya está registrada.`);
    }
} 

const machinesByIdExist = async(id ='') =>{
    const machineExist = await Machines.findByPk(id);
 
     if(!machineExist){
         throw new Error(`El id ${id} no existe.`);
     }
 } 
 

module.exports = {
    machinesNameExist,
    machinesByIdExist   
}