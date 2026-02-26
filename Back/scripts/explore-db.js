const { Sequelize } = require('sequelize');
require('dotenv').config({ path: './.env' });

const dbConnection = new Sequelize(process.env.DATABASE, process.env.USERDB, process.env.PASSWORD, {
  host: process.env.SERVER,
  dialect: process.env.DATABASE_TYPE,
  logging: false
});

async function exploreTables() {
  try {
    // Get all tables
    const tables = await dbConnection.query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${process.env.DATABASE}'`);
    
    console.log('\n=== TABLAS EN LA BASE DE DATOS ===');
    tables[0].forEach(t => console.log('  - ' + t.TABLE_NAME));

    // Look for tables related to users and roles
    console.log('\n=== ESTRUCTURA DE TABLA "users" ===');
    const usersColumns = await dbConnection.query(`DESCRIBE users`);
    console.log(usersColumns[0]);

    console.log('\n=== ESTRUCTURA DE TABLA "roles" (si existe) ===');
    try {
      const rolesColumns = await dbConnection.query(`DESCRIBE roles`);
      console.log(rolesColumns[0]);
    } catch (e) {
      console.log('❌ Tabla "roles" no existe');
    }

    // Search for tables that might relate users to roles
    console.log('\n=== TABLAS QUE PODRÍAN RELACIONAR USERS-ROLES ===');
    const userRelatedTables = tables[0].filter(t => 
      t.TABLE_NAME.toLowerCase().includes('user') || 
      t.TABLE_NAME.toLowerCase().includes('role') ||
      t.TABLE_NAME.toLowerCase().includes('permiso') ||
      t.TABLE_NAME.toLowerCase().includes('permission') ||
      t.TABLE_NAME.toLowerCase().includes('config')
    );
    
    for (const table of userRelatedTables) {
      console.log(`\n--- ${table.TABLE_NAME} ---`);
      const columns = await dbConnection.query(`DESCRIBE ${table.TABLE_NAME}`);
      columns[0].forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? '(KEY: ' + col.Key + ')' : ''}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await dbConnection.close();
  }
}

exploreTables();
