const { DataTypes } = require('sequelize');
const { dbConnection } = require('../database/config');

const Product = dbConnection.define('Product', {
  idProduct: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  createDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  idSucursal: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idFamily: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idGroup: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idQuality: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idOrigin: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idSupplier: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  barCode: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  gramos: {
    type: DataTypes.DECIMAL(18, 4),
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true
  },
  active: {
    type: DataTypes.SMALLINT,
    allowNull: true
  },
  addInv: {
    type: DataTypes.DECIMAL(18, 4),
    allowNull: true
  },
  noEntrada: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  idUserLogON: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'Products',
  timestamps: false
});

module.exports = Product;
