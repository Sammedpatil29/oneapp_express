// db.js

const { Sequelize } = require('sequelize');

// Initialize Sequelize and connect to PostgreSQL
const sequelize = new Sequelize('postgresql://neondb_owner:npg_o79MFwUCWVhg@ep-still-sunset-a8uihvoy-pooler.eastus2.azure.neon.tech/neondb?sslmode=require', {
  dialect: 'postgres',
  logging: false,  // Set to true if you want to see the raw SQL queries
});

sequelize.authenticate()
  .then(() => console.log('Database connected successfully!'))
  .catch((err) => console.error('Unable to connect to the database:', err));

module.exports = sequelize;
