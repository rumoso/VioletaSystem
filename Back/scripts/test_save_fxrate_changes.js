require('dotenv').config();
const { dbConnection } = require('../database/config');
const FxRate = require('../models/FxRate');
const FxRateType = require('../models/FxRateType');
const { sequelize } = require('sequelize');

async function testInsertNewFxRate() {
  try {
    console.log('🔄 Probando inserción de nuevos registros...\n');
    
    await dbConnection.authenticate();
    console.log('✅ Conexión establecida\n');

    // Simular cambios
    const changes = [
      {
        referencia: 'Gramo',
        fxRate: 2700,
        fxRateCost: 2650
      },
      {
        referencia: 'Dólares',
        fxRate: 18.50,
        fxRateCost: 18.00
      }
    ];

    let savedCount = 0;
    let errorCount = 0;

    console.log('📝 Guardando cambios:\n');

    for (const change of changes) {
      try {
        // Obtener el máximo idFxRate
        const maxIdResult = await dbConnection.query(
          'SELECT COALESCE(MAX(idFxRate), 0) + 1 as nextId FROM fxRate',
          { type: dbConnection.QueryTypes.SELECT }
        );
        const nextId = maxIdResult[0].nextId;

        const newRecord = await FxRate.create({
          idFxRate: nextId,
          createDate: new Date(),
          referencia: change.referencia,
          fxRate: change.fxRate,
          fxRateCost: change.fxRateCost,
          active: 1,
          idFxRateType: null
        });

        console.log(`✅ Guardado: ${change.referencia} - Costo: ${change.fxRateCost}, Venta: ${change.fxRate}`);
        savedCount++;
      } catch (innerError) {
        console.error(`❌ Error guardando ${change.referencia}:`, innerError.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Resultados: ${savedCount} guardado(s), ${errorCount} error(es)`);

    // Verificar últimos registros
    console.log('\n📋 Últimos registros de fxRate:\n');
    const latestRecords = await FxRate.findAll({
      order: [['createDate', 'DESC']],
      limit: 5,
      attributes: ['idFxRate', 'createDate', 'referencia', 'fxRate', 'fxRateCost', 'active']
    });

    console.table(latestRecords.map(r => ({
      idFxRate: r.idFxRate,
      referencia: r.referencia,
      fxRate: r.fxRate,
      fxRateCost: r.fxRateCost,
      createDate: r.createDate,
      active: r.active
    })));

    console.log('\n✅ Prueba completada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testInsertNewFxRate();
