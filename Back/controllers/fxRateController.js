const { response } = require('express');
const bcryptjs = require('bcryptjs');
const moment = require('moment');

const { createConexion, dbConnection } = require('../database/config');

const getFxRateListWithPage = async(req, res = response) => {

    const {
        search = ''
        , limiter = 10
        , start = 0
       
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getFxRateListWithPage(
            '${ search }'
            ,${ start }
            ,${ limiter }
            )`)

        if(OSQL.length == 0){

            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data:{
                    count: 0,
                    rows: null
                }
            });

        }
        else{

            const iRows = ( OSQL.length > 0 ? OSQL[0].iRows: 0 );
            
            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data:{
                count: iRows,
                rows: OSQL
                }
            });
            
        }
        
    }catch(error){
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

const insertFxRate = async(req, res) => {
   
  const {
    referencia,
    fxRate

    , idUserLogON
    , idSucursalLogON

  } = req.body;

  //console.log(req.body)

  try{

      var OSQL = await dbConnection.query(`call insertFxRate(
          '${referencia}'
          ,'${fxRate}'

          , ${ idUserLogON }
          )`)

        if(OSQL.length == 0){
  
            res.json({
                status: 1,
                message: "No se registró el tipo de cambio."
            });
    
        }
        else{

            res.json({
                status: 0,
                message: "Tipo de Cambio guardado con éxito.",
                insertID: OSQL[0].out_id
            });
    
        }

  }catch(error){

      res.json({
          status: 2,
          message: "Sucedió un error inesperado",
          data: error.message
      });
  }
}

const getFxRateTypesWithLatestRates = async(req, res = response) => {
  try {
    const FxRate = require('../models/FxRate');
    const FxRateType = require('../models/FxRateType');
    const { Op, sequelize } = require('sequelize');

    // Obtener los tipos de cambio activos
    const fxRateTypes = await FxRateType.findAll({
      where: { active: 1 },
      order: [['idFxRateType', 'ASC']]
    });

    // Para cada tipo, obtener el último registro de fxRate
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

      // Siempre incluir la referencia, aunque no tenga registros en fxRate
      result.push({
        idFxRateType: tipo.idFxRateType,
        nombre: tipo.nombre,
        descripcion: tipo.descripcion,
        referencia: tipo.nombre,
        fxRate: latestRate ? latestRate.fxRate : null,
        fxRateCost: latestRate ? latestRate.fxRateCost : null,
        createDate: latestRate ? latestRate.createDate : null
      });
    }

    res.json({
      status: 0,
      message: "Datos obtenidos correctamente.",
      data: result
    });

  } catch (error) {
    res.json({
      status: 2,
      message: "Sucedió un error inesperado",
      data: error.message
    });
  }
};

const saveFxRateChanges = async(req, res = response) => {
  try {
    const FxRate = require('../models/FxRate');

    const { changes, idUserLogON } = req.body;
    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    if (!changes || changes.length === 0) {
      return res.json({
        status: 1,
        message: "No hay cambios para guardar"
      });
    }

    let savedCount = 0;
    let errorCount = 0;

    // Guardar cada cambio como un nuevo registro
    for (const change of changes) {
      try {
        // Obtener el siguiente idFxRate disponible
        const maxIdResult = await dbConnection.query(
          'SELECT COALESCE(MAX(idFxRate), 0) + 1 as nextId FROM fxRate',
          { type: dbConnection.QueryTypes.SELECT }
        );
        const nextId = maxIdResult[0].nextId;

        // Crear nuevo registro de fxRate
        await FxRate.create({
          idFxRate: nextId,
          createDate: oGetDateNow,
          referencia: change.referencia,
          fxRate: parseFloat(change.fxRate),
          fxRateCost: parseFloat(change.fxRateCost),
          active: 1,
          idFxRateType: change.idFxRateType || null
        });

        savedCount++;
      } catch (innerError) {
        console.error('Error guardando cambio:', change, innerError.message);
        errorCount++;
      }
    }

    if (savedCount > 0) {
      res.json({
        status: 0,
        message: `Se guardaron ${savedCount} cambio(s) exitosamente.`,
        data: {
          savedCount: savedCount,
          errorCount: errorCount
        }
      });
    } else {
      res.json({
        status: 2,
        message: "No se pudo guardar ninguno de los cambios",
        data: {
          savedCount: savedCount,
          errorCount: errorCount
        }
      });
    }

  } catch (error) {
    res.json({
      status: 2,
      message: "Sucedió un error inesperado",
      data: error.message
    });
  }
};

const createFxRateType = async(req, res = response) => {
  try {
    const FxRateType = require('../models/FxRateType');
    const { nombre, descripcion } = req.body;
    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    if (!nombre || nombre.trim().length === 0) {
      return res.json({
        status: 1,
        message: "El nombre de la referencia es obligatorio"
      });
    }

    // Verificar que no exista una referencia con el mismo nombre
    const existingType = await FxRateType.findOne({
      where: { nombre: nombre.trim() }
    });

    if (existingType) {
      return res.json({
        status: 1,
        message: `Ya existe una referencia llamada "${nombre}"`
      });
    }

    // Crear nueva referencia
    const newFxRateType = await FxRateType.create({
      nombre: nombre.trim(),
      descripcion: descripcion && descripcion.trim() ? descripcion.trim() : '',
      createDate: oGetDateNow,
      active: 1
    });

    res.json({
      status: 0,
      message: "Referencia creada exitosamente",
      data: newFxRateType
    });

  } catch (error) {
    res.json({
      status: 2,
      message: "Sucedió un error inesperado",
      data: error.message
    });
  }
};

const deleteFxRateType = async(req, res = response) => {
  try {
    const FxRateType = require('../models/FxRateType');
    const FxRate = require('../models/FxRate');

    const { idFxRateType } = req.params;

    if (!idFxRateType) {
      return res.json({
        status: 1,
        message: "El ID de la referencia es obligatorio"
      });
    }

    // Obtener la referencia para saber su nombre
    const fxRateType = await FxRateType.findByPk(idFxRateType);

    if (!fxRateType) {
      return res.json({
        status: 1,
        message: "La referencia no existe"
      });
    }

    // Eliminar completamente el registro
    await FxRateType.destroy({
      where: { idFxRateType: idFxRateType }
    });

    res.json({
      status: 0,
      message: "Referencia eliminada exitosamente"
    });

  } catch (error) {
    res.json({
      status: 2,
      message: "Sucedió un error inesperado",
      data: error.message
    });
  }
};

const updateFxRateType = async(req, res = response) => {
  try {
    const FxRateType = require('../models/FxRateType');

    const { idFxRateType } = req.params;
    const { nombre, descripcion } = req.body;

    if (!idFxRateType) {
      return res.json({
        status: 1,
        message: "El ID de la referencia es obligatorio"
      });
    }

    if (!nombre || nombre.trim().length === 0) {
      return res.json({
        status: 1,
        message: "El nombre de la referencia es obligatorio"
      });
    }

    // Obtener la referencia actual
    const fxRateType = await FxRateType.findByPk(idFxRateType);

    if (!fxRateType) {
      return res.json({
        status: 1,
        message: "La referencia no existe"
      });
    }

    // Verificar que no exista otra referencia con el mismo nombre (si cambió el nombre)
    if (nombre.trim() !== fxRateType.nombre) {
      const existingType = await FxRateType.findOne({
        where: { nombre: nombre.trim() }
      });

      if (existingType) {
        return res.json({
          status: 1,
          message: `Ya existe una referencia llamada "${nombre}"`
        });
      }
    }

    // Actualizar la referencia
    await FxRateType.update(
      {
        nombre: nombre.trim(),
        descripcion: descripcion && descripcion.trim() ? descripcion.trim() : ''
      },
      { where: { idFxRateType: idFxRateType } }
    );

    res.json({
      status: 0,
      message: "Referencia actualizada exitosamente"
    });

  } catch (error) {
    res.json({
      status: 2,
      message: "Sucedió un error inesperado",
      data: error.message
    });
  }
};

const getPriceByKilataje = async(req, res = response) => {
  try {
    const FxRate = require('../models/FxRate');

    const { kilates } = req.params;

    if (!kilates) {
      return res.json({
        status: 1,
        message: "El kilataje es obligatorio"
      });
    }

    // Buscar el último registro de fxRate con este kilataje
    const fxRateRecord = await FxRate.findOne({
      where: { 
        active: 1,
        referencia: `${kilates} Kilates`
      },
      order: [['createDate', 'DESC']],
      attributes: ['fxRate', 'fxRateCost', 'createDate']
    });

    if (!fxRateRecord) {
      return res.json({
        status: 1,
        message: "No se encontró precio para este kilataje"
      });
    }

    res.json({
      status: 0,
      message: "Precio obtenido correctamente",
      data: {
        price: fxRateRecord.fxRate,
        costPrice: fxRateRecord.fxRateCost,
        lastUpdate: fxRateRecord.createDate
      }
    });

  } catch (error) {
    res.json({
      status: 2,
      message: "Sucedió un error inesperado",
      data: error.message
    });
  }
};

module.exports = {
    getFxRateListWithPage
    , insertFxRate
    , getFxRateTypesWithLatestRates
    , saveFxRateChanges
    , createFxRateType
    , deleteFxRateType
    , updateFxRateType
    , getPriceByKilataje
  }