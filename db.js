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
      const ServiceArea = require('./models/serviceAreaModel');
      await RiderReferral.sync({ alter: false });
      await PayoutRequest.sync({ alter: false });
      await ServiceArea.sync({ alter: false });

      try {
        await sequelize.query(`ALTER TABLE service_areas ADD COLUMN IF NOT EXISTS "isOffline" BOOLEAN DEFAULT false;`);
        await sequelize.query(`ALTER TABLE service_areas ADD COLUMN IF NOT EXISTS "offlineMessage" VARCHAR(500) DEFAULT '';`);
      } catch (colErr) {
        console.warn('⚠️ ServiceArea columns auto-patch notice:', colErr.message);
      }

      // Auto-seed default service area from Metadata if empty
      const existingCount = await ServiceArea.count();
      if (existingCount === 0) {
        const Metadata = require('./models/metadataModel');
        const meta = await Metadata.findOne();
        if (meta && meta.polygon && Array.isArray(meta.polygon) && meta.polygon.length >= 3) {
          const lats = meta.polygon.map(p => Number(p.lat));
          const lngs = meta.polygon.map(p => Number(p.lng));
          const center = {
            lat: lats.reduce((a, b) => a + b, 0) / lats.length,
            lng: lngs.reduce((a, b) => a + b, 0) / lngs.length
          };
          await ServiceArea.create({
            cityName: 'Jamkhandi',
            polygon: meta.polygon,
            center,
            radiusKm: 5.0,
            strokeColor: '#a000e2',
            areaColor: '#a000e2',
            isActive: true,
            description: 'Primary Service Area (Jamkhandi)'
          });
          console.log('✅ Auto-seeded initial ServiceArea "Jamkhandi" from existing metadata polygon.');
        }
      }
    } catch (syncErr) {
      console.warn('⚠️ Auto-sync tables notice:', syncErr.message);
    }
  })
  .catch((err) => console.error('Unable to connect to the database:', err));

module.exports = sequelize;
