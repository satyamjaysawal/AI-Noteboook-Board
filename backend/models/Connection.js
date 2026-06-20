const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Connection = sequelize.define('Connection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  source: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'notes', key: 'id' }
  },
  target: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'notes', key: 'id' }
  },
  sourceHandle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  targetHandle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  label: {
    type: DataTypes.STRING,
    defaultValue: ''
  }
}, {
  tableName: 'connections',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false
});

Connection.prototype.toJSON = function () {
  const values = { ...this.get() };
  values._id = values.id;
  return values;
};

module.exports = Connection;