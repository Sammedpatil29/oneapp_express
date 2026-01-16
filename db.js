// db.js

const { Sequelize } = require('sequelize');

// Initialize Sequelize and connect to PostgreSQL
const sequelize = new Sequelize('postgresql://neondb_owner:npg_Y6yzCORB1KSM@ep-late-frog-a1aglm0l-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', {
  dialect: 'postgres',
  logging: false,  // Set to true if you want to see the raw SQL queries
});

sequelize.authenticate()
  .then(() => console.log('Database connected successfully!'))
  .catch((err) => console.error('Unable to connect to the database:', err));

module.exports = sequelize;
