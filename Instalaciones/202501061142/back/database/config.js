const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');

const dbConnection = new Sequelize(process.env.DATABASE, process.env.USERDB, process.env.PASSWORD, {
  host: process.env.SERVER,
  dialect: process.env.DATABASE_TYPE,
  define: { freezeTableName: true },
  port: process.env.PORT_SQL
});

const createConexion = async() => {

  const dbConnection = new Sequelize(process.env.DATABASE, process.env.USERDB, process.env.PASSWORD, {
    host: process.env.SERVER,
    dialect: process.env.DATABASE_TYPE,
    define: { freezeTableName: true },
    port: process.env.PORT_SQL
  });

  return dbConnection;
};

const dbConnectionLog = new Sequelize(process.env.DATABASE_LOG, process.env.USERDB, process.env.PASSWORD, {
  host: process.env.SERVER,
  dialect: process.env.DATABASE_TYPE,
  define: { freezeTableName: true },
  port: process.env.PORT_SQL
});

const createConexionLog = async() => {

  const dbConnectionLog = new Sequelize(process.env.DATABASE_LOG, process.env.USERDB, process.env.PASSWORD, {
    host: process.env.SERVER,
    dialect: process.env.DATABASE_TYPE,
    define: { freezeTableName: true },
    port: process.env.PORT_SQL
  });

  return dbConnectionLog;
};

const dbSPConnection = mysql.createPool({
  host: process.env.SERVER,
  user: process.env.USERDB,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  port: process.env.PORT_SQL,
  waitForConnections: true,
  connectionLimit: 30,
  queueLimit: 0
});

module.exports={
  createConexion
  , dbConnection
  
  , createConexionLog
  , dbConnectionLog
  , dbSPConnection
}