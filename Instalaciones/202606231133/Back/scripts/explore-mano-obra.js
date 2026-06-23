const { Sequelize } = require('sequelize');
require('dotenv').config({ path: './.env' });

const dbConnection = new Sequelize(process.env.DATABASE, process.env.USERDB, process.env.PASSWORD, {
  host: process.env.SERVER,
  dialect: process.env.DATABASE_TYPE,
  logging: false
});

async function exploreTables() {
  try {
    console.log('\n=== ESTRUCTURA DE TABLA "taller_mano_obra" ===');
    try {
      const manoObraColumns = await dbConnection.query(`DESCRIBE taller_mano_obra`);
      console.log(manoObraColumns[0]);

      console.log('\n--- Ejemplo de registros en taller_mano_obra ---');
      const manoObraRecords = await dbConnection.query(`SELECT * FROM taller_mano_obra LIMIT 3`);
      console.log(manoObraRecords[0]);
    } catch (e) {
      console.log('❌ Tabla "taller_mano_obra" no existe');
      console.log('Error:', e.message);
    }

    console.log('\n=== ESTRUCTURA DE TABLA "taller_mano_obra_log" ===');
    try {
      const manoObraLogColumns = await dbConnection.query(`DESCRIBE taller_mano_obra_log`);
      console.log(manoObraLogColumns[0]);

      console.log('\n--- Ejemplo de registros en taller_mano_obra_log ---');
      const manoObraLogRecords = await dbConnection.query(`SELECT * FROM taller_mano_obra_log LIMIT 3`);
      console.log(manoObraLogRecords[0]);
    } catch (e) {
      console.log('❌ Tabla "taller_mano_obra_log" no existe');
      console.log('Error:', e.message);
    }

    console.log('\n=== ESTRUCTURA DE TABLA "taller" (para referencia) ===');
    const tallerColumns = await dbConnection.query(`DESCRIBE taller`);
    console.log(tallerColumns[0]);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await dbConnection.close();
  }
}

exploreTables();
