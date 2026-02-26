require('dotenv').config();
const { dbConnection } = require('../database/config');
const FxRateType = require('../models/FxRateType');

async function testCreateFxRateType() {
  try {
    console.log('🔄 Probando crear nueva referencia...\n');
    
    await dbConnection.authenticate();
    console.log('✅ Conexión establecida\n');

    // Intentar crear una nueva referencia
    console.log('📝 Creando referencia "Bitcoin":\n');
    
    const newType = await FxRateType.create({
      nombre: 'Bitcoin',
      descripcion: 'Precio de Bitcoin en USD',
      createDate: new Date(),
      active: 1
    });

    console.log('✅ Referencia creada:\n');
    console.table({
      idFxRateType: newType.idFxRateType,
      nombre: newType.nombre,
      descripcion: newType.descripcion,
      createDate: newType.createDate,
      active: newType.active
    });

    // Intentar crear un duplicado
    console.log('\n📝 Intentando crear duplicado "Bitcoin"...\n');
    
    try {
      const duplicateType = await FxRateType.create({
        nombre: 'Bitcoin',
        descripcion: 'Intento duplicado',
        createDate: new Date(),
        active: 1
      });
      console.log('❌ ERROR: Se permitió crear duplicado');
    } catch (error) {
      console.log('✅ Correctamente rechazado:', error.message);
    }

    // Listar todas las referencias
    console.log('\n📋 Todas las referencias:\n');
    const allTypes = await FxRateType.findAll({
      order: [['idFxRateType', 'ASC']]
    });

    console.table(allTypes.map(t => ({
      idFxRateType: t.idFxRateType,
      nombre: t.nombre,
      descripcion: t.descripcion,
      active: t.active
    })));

    console.log('\n✅ Prueba completada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testCreateFxRateType();
