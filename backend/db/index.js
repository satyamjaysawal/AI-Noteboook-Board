const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL;
const useSsl = process.env.DATABASE_SSL === 'true'
  || process.env.VERCEL
  || /neon\.tech|supabase\.co|render\.com|railway\.app/i.test(DATABASE_URL || '');

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: useSsl ? {
    ssl: { require: true, rejectUnauthorized: false }
  } : {},
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectDB = async () => {
  await sequelize.authenticate();
  console.log('✅ Connected to PostgreSQL');
};

module.exports = { sequelize, connectDB };