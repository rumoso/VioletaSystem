require('dotenv').config();
const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');

async function checkTables() {
  try {
    // Crear conexión con mysql2
    const connection = await mysql.createConnection({
      host: process.env.SERVER,
      user: process.env.USERDB,
      password: process.env.PASSWORD,
      database: process.env.DATABASE,
      port: process.env.PORT_SQL
    });

    console.log('✓ Conectado a la base de datos\n');

    // Obtener estructura de fxrate_type
    console.log('=== ESTRUCTURA DE TABLA: fxrate_type ===');
    const [fxrateTypeRows] = await connection.execute('DESCRIBE fxrate_type');
    console.table(fxrateTypeRows);

    // Obtener datos de ejemplo
    console.log('\n=== DATOS DE EJEMPLO: fxrate_type ===');
    const [fxrateTypeData] = await connection.execute('SELECT * FROM fxrate_type LIMIT 5');
    console.table(fxrateTypeData);

    console.log('\n\n=== ESTRUCTURA DE TABLA: fxRate ===');
    const [fxRateRows] = await connection.execute('DESCRIBE fxRate');
    console.table(fxRateRows);

    // Obtener datos de ejemplo
    console.log('\n=== DATOS DE EJEMPLO: fxRate ===');
    const [fxRateData] = await connection.execute('SELECT * FROM fxRate LIMIT 5');
    console.table(fxRateData);

    // Obtener información de relaciones
    console.log('\n\n=== RELACIONES Y RESTRICCIONES ===');
    const [constraints] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() 
      AND (TABLE_NAME = 'fxrate_type' OR TABLE_NAME = 'fxRate')
    `);
    console.table(constraints);

    await connection.end();
    console.log('\n✓ Consulta completada');
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

checkTables();
