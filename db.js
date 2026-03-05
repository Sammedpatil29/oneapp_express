// db.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

// Initialize Sequelize and connect to PostgreSQL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,  // Set to true if you want to see the raw SQL queries
});

sequelize.authenticate()
  .then(() => console.log('Database connected successfully!'))
  .catch((err) => console.error('Unable to connect to the database:', err));

module.exports = sequelize;
