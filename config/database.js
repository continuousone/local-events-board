const Sequelize = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

// Render's managed Postgres requires SSL, but local Postgres (no SSL) shouldn't use this
const isProduction = process.env.NODE_ENV === 'production';

module.exports = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: isProduction ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

