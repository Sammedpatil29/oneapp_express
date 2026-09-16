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
      await sequelize.query(`ALTER TABLE "user_customuser" ADD COLUMN IF NOT EXISTS "referral_code" VARCHAR(30);`);
      await sequelize.query(`ALTER TABLE "user_customuser" ADD COLUMN IF NOT EXISTS "referred_by_code" VARCHAR(30);`);
      await sequelize.query(`ALTER TABLE "user_customuser" ADD COLUMN IF NOT EXISTS "referred_by_id" INTEGER;`);
      await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_customuser_referral_code ON "user_customuser" ("referral_code") WHERE "referral_code" IS NOT NULL;`);
    } catch (e) {
      console.warn('⚠️ Auto-patch user referral columns notice:', e.message);
    }
    try {
      const RiderReferral = require('./models/riderReferralModel');
      const UserReferral = require('./models/userReferralModel');
      const PayoutRequest = require('./models/payoutRequestModel');
      const ServiceArea = require('./models/serviceAreaModel');
      await RiderReferral.sync({ alter: false });
      await UserReferral.sync({ alter: false });
      await PayoutRequest.sync({ alter: false });
      await ServiceArea.sync({ alter: false });

      try {
        await sequelize.query(`ALTER TABLE service_areas ADD COLUMN IF NOT EXISTS "isOffline" BOOLEAN DEFAULT false;`);
        await sequelize.query(`ALTER TABLE service_areas ADD COLUMN IF NOT EXISTS "offlineMessage" VARCHAR(500) DEFAULT '';`);
      } catch (colErr) {
        console.warn('⚠️ ServiceArea columns auto-patch notice:', colErr.message);
      }

      // Auto-patch: add is_primary column to addresses table
      try {
        await sequelize.query(`ALTER TABLE addresses ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN DEFAULT false;`);
      } catch (colErr) {
        console.warn('⚠️ Address is_primary auto-patch notice:', colErr.message);
      }

      // Auto-patch: add new banner columns
      try {
        await sequelize.query(`ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "title" VARCHAR(150) DEFAULT '';`);
        await sequelize.query(`ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "service_id" BIGINT;`);
        await sequelize.query(`ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "service_title" VARCHAR(100) DEFAULT '';`);
        await sequelize.query(`ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "cities" JSONB DEFAULT '[]'::jsonb;`);
        await sequelize.query(`ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "placement" VARCHAR(50) DEFAULT 'hometop';`);
        await sequelize.query(`ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "placements" JSONB DEFAULT '["hometop"]'::jsonb;`);
        await sequelize.query(`ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "priority" INTEGER DEFAULT 0;`);
        await sequelize.query(`UPDATE "banners" SET "placements" = jsonb_build_array("placement") WHERE "placements" IS NULL OR jsonb_array_length("placements") = 0;`);
      } catch (bannerErr) {
        console.warn('⚠️ Banner columns auto-patch notice:', bannerErr.message);
      }

      // Auto-patch: add videoUrl column to properties table
      try {
        await sequelize.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;`);
      } catch (colErr) {
        console.warn('⚠️ Property videoUrl auto-patch notice:', colErr.message);
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
