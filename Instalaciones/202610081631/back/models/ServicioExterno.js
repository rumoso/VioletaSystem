const { DataTypes } = require('sequelize');
const { dbConnection } = require('../database/config');

const ServicioExterno = dbConnection.define('cat_taller_servicios_externos', {
  idServicioExterno: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  createDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  description: {
    type: DataTypes.STRING(5000),
    allowNull: true
  },
  active: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  }
}, {
  tableName: 'cat_taller_servicios_externos',
  timestamps: false
});

module.exports = ServicioExterno;
