const { DataTypes } = require('sequelize');
const { dbConnection } = require('../database/config');

const FxRateType = dbConnection.define('fxrate_type', {
  idFxRateType: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  createDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nombre: {
    type: DataTypes.STRING(45),
    allowNull: false,
    unique: {
      msg: 'Ya existe una referencia con este nombre'
    },
    validate: {
      notEmpty: {
        msg: 'El nombre no puede estar vacío'
      }
    }
  },
  descripcion: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  active: {
    type: DataTypes.SMALLINT,
    allowNull: true
  }
}, {
  tableName: 'fxrate_type',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['nombre']
    }
  ]
});

module.exports = FxRateType;
