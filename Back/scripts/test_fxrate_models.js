require('dotenv').config();
const { dbConnection } = require('../database/config');
const FxRate = require('../models/FxRate');
const FxRateType = require('../models/FxRateType');
const { Op } = require('sequelize');

async function testConnection() {
  try {
    console.log('🔄 Probando conexión a la base de datos...\n');
    
    // Verificar conexión
    await dbConnection.authenticate();
    console.log('✅ Conexión establecida\n');

    // Obtener tipos de cambio
    console.log('📋 Obteniendo tipos de cambio activos...');
    const fxRateTypes = await FxRateType.findAll({
      where: { active: 1 },
      order: [['idFxRateType', 'ASC']]
    });
    console.log(`✅ Se encontraron ${fxRateTypes.length} tipos\n`);

    // Para cada tipo, obtener el último registro
    console.log('📊 Obteniendo últimas tasas por tipo:\n');
    const result = [];

    for (const tipo of fxRateTypes) {
      const latestRate = await FxRate.findOne({
        where: { 
          active: 1,
          referencia: tipo.nombre
        },
        order: [['createDate', 'DESC']],
        attributes: ['idFxRate', 'createDate', 'referencia', 'fxRate', 'fxRateCost']
      });

      if (latestRate) {
        const item = {
          idFxRateType: tipo.idFxRateType,
          nombre: tipo.nombre,
          descripcion: tipo.descripcion,
          referencia: latestRate.referencia,
          fxRate: latestRate.fxRate,
          fxRateCost: latestRate.fxRateCost,
          createDate: latestRate.createDate
        };
        result.push(item);
        console.table(item);
      }
    }

    console.log('\n✅ Prueba completada exitosamente');
    console.log(`Total de registros: ${result.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testConnection();
