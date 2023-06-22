const { Sequelize } = require('sequelize');

const dbConnection = new Sequelize(process.env.DATABASE, process.env.USERDB, process.env.PASSWORD, {
    host: process.env.SERVER,
    dialect: process.env.DATABASE_TYPE,
    define: { freezeTableName: true }
  });

module.exports={
    dbConnection 
}