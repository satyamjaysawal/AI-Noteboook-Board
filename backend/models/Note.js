const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Note = sequelize.define('Note', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    defaultValue: 'Untitled',
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  position: {
    type: DataTypes.JSONB,
    defaultValue: { x: 100, y: 100 }
  },
  styling: {
    type: DataTypes.JSONB,
    defaultValue: { backgroundColor: '#ffffff', fontSize: 16 }
  },
  imageUrl: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  tags: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'notes',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

Note.prototype.toJSON = function () {
  const values = { ...this.get() };
  values._id = values.id;
  return values;
};

module.exports = Note;