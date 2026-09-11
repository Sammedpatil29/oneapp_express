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
      await sequelize.query(`ALTER TABLE "riders" ADD COLUMN IF NOT EXISTS "wallet_balance" FLOAT DEFAULT 0;`);
    } catch (e) {
      console.warn('⚠️ Auto-patch wallet_balance notice:', e.message);
    }
    try {
      await sequelize.query(`ALTER TABLE "riders" ADD COLUMN IF NOT EXISTS "referral_code" VARCHAR(50);`);
    } catch (e) {
      console.warn('⚠️ Auto-patch referral_code notice:', e.message);
    }
    try {
      await sequelize.query(`ALTER TYPE enum_riders_status ADD VALUE IF NOT EXISTS 'onride';`);
    } catch (e) {
      console.warn('⚠️ Auto-patch onride notice:', e.message);
    }
    try {
      const RiderReferral = require('./models/riderReferralModel');
      const PayoutRequest = require('./models/payoutRequestModel');
      await RiderReferral.sync({ alter: false });
      await PayoutRequest.sync({ alter: false });
    } catch (syncErr) {
      console.warn('⚠️ Auto-sync referral/payout tables notice:', syncErr.message);
    }
  })
  .catch((err) => console.error('Unable to connect to the database:', err));

module.exports = sequelize;
