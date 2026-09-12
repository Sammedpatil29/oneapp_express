require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const fs = require('fs');
const axios = require('axios');
require('./cron/markOffline.job');


const pool = require('./db'); // Only if you actually use it


const PORT = process.env.PORT || 8080;
const app = express();
app.set('trust proxy', 1);

// ✅ Create HTTP server and attach Socket.IO properly
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for broader access. Re-add strict array without trailing slashes for production if needed.
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  pingTimeout: 60000,   // Wait 60 seconds before disconnecting a client
  pingInterval: 25000,  // Send a ping every 25 seconds
});

module.exports.io = io;
module.exports.socketMap = io.sockets.sockets;
app.set('io', io); // ✅ Make io accessible in controllers via req.app.get('io')
const rideRoutes = require('./Routes/rideRoutes');
const riderRoutes = require('./Routes/riderRoutes');
const authRoutes = require('./Routes/authRoutes');
const serviceRoutes = require('./Routes/serviceRoutes');
const addressRoutes = require('./Routes/addressRoutes');
const bannerRoutes = require('./Routes/bannerRoutes');
const homeRoutes = require('./Routes/homeRoutes');
const eventsRoutes = require('./Routes/eventsRoutes');
const paymentRoutes = require('./Routes/paymentRoutes');
const historyRoutes = require('./Routes/historyRoutes');
const notificationRoutes = require('./Routes/notificationRoutes');
const groceryRoutes = require('./Routes/groceryRoutes');
const groceryCategoryRoutes = require('./Routes/groceryCategoryRoutes');
const groceryBrandRoutes = require('./Routes/groceryBrandRoutes');
const groceryCartRoutes = require('./Routes/groceryCartRoutes');
const groceryHomeRoutes = require('./Routes/groceryHomeRoutes');
const dineoutRoutes = require('./Routes/dineoutRoutes');
const dineoutOrderRoutes = require('./Routes/dineoutOrderRoutes');
const groceryOrderRoutes = require('./Routes/groceryOrderRoutes');
const metadataRoutes = require('./Routes/metadataRoutes');
const adminRoutes = require('./Routes/adminRoutes');
const adminOrderRoutes = require('./Routes/adminOrderRoutes');
const sidebarItemRoutes = require('./Routes/sidebarItemRoutes');
const groceryCouponRoutes = require('./Routes/couponRoutes');
const ticketRoutes = require('./Routes/ticketRoutes');
const payoutRoutes = require('./Routes/payoutRoutes');
const emailRoutes = require('./Routes/emailRoutes');
const groceryDamage = require('./Routes/groceryDamageRoutes');
const askPintuRoutes = require('./Routes/askPintuRoutes.js');
const otaRoutes = require('./Routes/otaRoutes');
const serviceAreaRoutes = require('./Routes/serviceAreaRoutes');
const path = require('path');




const sequelize = require('./db');
const updatePastBookings = require('./cron/bookingStatusUpdater');
const updateStaleDineoutOrders = require('./cron/dineoutOrderStatusUpdater');
const startMorningNotificationJob = require('./cron/dailyMorningNotification');


// ===== Middleware =====
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

require('./models/riderTransactionModel');

// ===== Sequelize sync =====
sequelize
  .sync() // Removed { alter: true } to stop it from crashing on the User table
  .then(async () => {
    // Safely add new columns to metadata without affecting existing data
    try {
      await sequelize.query(`
        ALTER TABLE "metadata" 
        ADD COLUMN IF NOT EXISTS "locations" JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "status" JSONB DEFAULT '["active"]'::jsonb,
        ADD COLUMN IF NOT EXISTS "categories" JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "roles" JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "routes" JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "ride_commission" JSONB DEFAULT '{"type":"fixed","value":3,"enabled":true,"min_fare":0}'::jsonb;
      `);
    } catch (alterErr) {
      console.log('⚠️ Metadata alter skipped (already updated or table missing)');
    }

    try {
      await sequelize.query(`
        ALTER TABLE "grocery coupons" 
        ADD COLUMN IF NOT EXISTS "max_discount" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "include" JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "exclude" JSONB DEFAULT '[]'::jsonb;
      `);
    } catch (alterErr) {
      console.log('⚠️ Grocery coupons alter skipped (already updated or table missing)');
    }

    try {
      await sequelize.query(`
        ALTER TABLE "riders" 
        ADD COLUMN IF NOT EXISTS "email" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "fcm_token" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "commission_due" FLOAT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "payout_account" JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE "riders" ALTER COLUMN "password" DROP NOT NULL;
        ALTER TABLE "riders" ALTER COLUMN "name" DROP NOT NULL;
        ALTER TABLE "riders" ALTER COLUMN "name" SET DEFAULT '';
        ALTER TABLE "riders" ALTER COLUMN "contact" DROP NOT NULL;
      `);
    } catch (alterErr) {
      console.log('⚠️ Riders alter skipped (already updated or table missing):', alterErr.message);
    }

    try {
      await sequelize.query(`
        ALTER TYPE enum_riders_status ADD VALUE IF NOT EXISTS 'onride';
      `);
    } catch (enumErr) {
      console.log('⚠️ Enum onride update notice:', enumErr.message);
    }

    console.log('✅ Models are synced with the database.');
    // Run status check immediately on startup
    updatePastBookings();
    updateStaleDineoutOrders();
    // Schedule to run every 24 hours (86400000 ms)
    setInterval(updatePastBookings, 24 * 60 * 60 * 1000);
    // Schedule to run every 30 minutes (1800000 ms)
    setInterval(updateStaleDineoutOrders, 30 *60 * 1000);

    // Initialize Daily Cron Jobs
    startMorningNotificationJob();
  })
  .catch((err) => console.error('❌ Error syncing models:', err));

// ===== Routes =====
app.use(rideRoutes);
app.use('/api/rider', riderRoutes);
app.use(authRoutes);
app.use(serviceRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/grocery/cart', groceryCartRoutes);
app.use('/api/grocery', groceryRoutes);
app.use('/api/grocery-categories', groceryCategoryRoutes);
app.use('/api/grocery-brands', groceryBrandRoutes);
app.use('/api/grocery-home', groceryHomeRoutes);
app.use('/api/grocery-order', groceryOrderRoutes);
app.use('/api/dineout/orders', dineoutOrderRoutes);
app.use('/api/dineout', dineoutRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/sidebar-items', sidebarItemRoutes);
app.use('/api/grocery-coupons', groceryCouponRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/grocery-damage', groceryDamage)
app.use('/api/ask-pintu', askPintuRoutes);
app.use('/api/ota', otaRoutes);
app.use('/api/service-areas', serviceAreaRoutes);

// ✅ OTA Updates static route (serves manifests and update bundles for OtaKit)
const otaPublicDir = path.join(__dirname, 'public', 'ota');
if (!fs.existsSync(otaPublicDir)) {
  fs.mkdirSync(path.join(otaPublicDir, 'bundles'), { recursive: true });
}
app.use('/ota', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.path.endsWith('.json')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
}, express.static(otaPublicDir));

// ✅ Public uploads static route (serves KYC document archives and assets)
const uploadsPublicDir = path.join(__dirname, 'public', 'uploads');
const kycZipsDir = path.join(uploadsPublicDir, 'kyc_zips');
if (!fs.existsSync(kycZipsDir)) {
  fs.mkdirSync(kycZipsDir, { recursive: true });
}
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(uploadsPublicDir));

app.get(['/ota', '/ota/'], (req, res) => {
  res.json({
    success: true,
    message: '🚀 OtaKit OTA Update Server is running!',
    endpoints: {
      oneapp_manifest: '/ota/manifests/io.ionic.oneapp/__base__/__default__/manifest.json',
      partner_manifest: '/ota/manifests/io.oneapp.partner/__base__/__default__/manifest.json',
      bundles: '/ota/bundles/'
    }
  });
});

// ===== Root route =====
app.get('/', (req, res) => {
  res.send('✅ Express + Socket.IO server is running!');
});

// ===== Initialize Socket Handler =====
require('./socketHandler')(io);

// ===== Initialize Cron Jobs =====
require('./cron/markOffline.job');

// ===== Start the server =====
// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
