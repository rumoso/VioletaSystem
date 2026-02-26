const { DataTypes } = require('sequelize');
const { dbConnection } = require('../database/config');

const FxRate = dbConnection.define('fxRate', {
  keyx: {
    type: DataTypes.BIGINT,
    unique: true,
    autoIncrement: true
  },
  idFxRate: {
    type: DataTypes.BIGINT,
    primaryKey: true
  },
  createDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  referencia: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  fxRate: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  active: {
    type: DataTypes.SMALLINT,
    allowNull: true
  },
  idFxRateType: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fxRateCost: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true
  }
}, {
  tableName: 'fxRate',
  timestamps: false
});

module.exports = FxRate;
