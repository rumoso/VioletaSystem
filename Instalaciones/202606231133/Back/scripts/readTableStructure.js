const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

const getTableStructure = async() => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.SERVER,
            user: process.env.USERDB,
            password: process.env.PASSWORD,
            database: process.env.DATABASE,
            port: process.env.PORT_SQL,
        });

        console.log('\n\n📊 ============ ESTRUCTURA DE TABLE: cat_taller_servicios_externos ============\n');
        
        // Consultar estructura
        const [structure] = await connection.query(`
            SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'cat_taller_servicios_externos'
            AND TABLE_SCHEMA = DATABASE()
            ORDER BY ORDINAL_POSITION
        `);

        console.log('📋 COLUMNAS:');
        console.table(structure);

        // Consultar datos de ejemplo
        const [samples] = await connection.query(`
            SELECT * FROM cat_taller_servicios_externos LIMIT 5
        `);

        console.log('\n📋 DATOS DE EJEMPLO:');
        console.table(samples);

        // Mostrar SQL para model Sequelize
        console.log('\n📝 CÓDIGO SUGERIDO PARA Sequelize Model:');
        console.log('');
        console.log('const { DataTypes } = require("sequelize");');
        console.log('const srv = require("../database/config");');
        console.log('');
        console.log('const ServicioExternoModel = srv.define("cat_taller_servicios_externos", {');
        
        structure.forEach((col, index) => {
            let type = 'DataTypes.STRING';
            if (col.COLUMN_TYPE.includes('int')) type = 'DataTypes.INTEGER';
            if (col.COLUMN_TYPE.includes('decimal') || col.COLUMN_TYPE.includes('double')) type = 'DataTypes.DECIMAL(10,2)';
            if (col.COLUMN_TYPE.includes('datetime') || col.COLUMN_TYPE.includes('timestamp')) type = 'DataTypes.DATE';
            if (col.COLUMN_TYPE.includes('text')) type = 'DataTypes.TEXT';
            
            const nullable = col.IS_NULLABLE === 'YES' ? ', allowNull: true' : ', allowNull: false';
            const primaryKey = col.COLUMN_KEY === 'PRI' ? ', primaryKey: true, autoIncrement: true' : '';
            
            const comma = index < structure.length - 1 ? ',' : '';
            console.log(`    ${col.COLUMN_NAME}: { type: ${type}${nullable}${primaryKey} }${comma}`);
        });

        console.log('});');
        console.log('\nmodule.exports = ServicioExternoModel;');
        console.log('\n============================================================================\n\n');

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

getTableStructure();
