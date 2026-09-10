// db.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

// Initialize Sequelize and connect to PostgreSQL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,  // Set to true if you want to see the raw SQL queries
});

sequelize.authenticate()
  .then(async () => {
    console.log('Database connected successfully!');
    try {
      await sequelize.query(`ALTER TABLE "riders" ADD COLUMN IF NOT EXISTS "commission_due" FLOAT DEFAULT 0;`);
    } catch (e) {
      console.warn('⚠️ Auto-patch commission_due notice:', e.message);
    }
    try {
      await sequelize.query(`ALTER TYPE enum_riders_status ADD VALUE IF NOT EXISTS 'onride';`);
    } catch (e) {
      console.warn('⚠️ Auto-patch onride notice:', e.message);
    }
  })
  .catch((err) => console.error('Unable to connect to the database:', err));

module.exports = sequelize;
