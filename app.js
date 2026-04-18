require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const fs = require('fs');
const axios = require('axios');
// require('./cron/markOffline.job');


const pool = require('./db'); // Only if you actually use it


const PORT = process.env.PORT || 8080;
const app = express();

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
const groceryCartRoutes = require('./Routes/groceryCartRoutes');
const groceryHomeRoutes = require('./Routes/groceryHomeRoutes');
const dineoutRoutes = require('./Routes/dineoutRoutes');
const dineoutOrderRoutes = require('./Routes/dineoutOrderRoutes');
const groceryOrderRoutes = require('./Routes/groceryOrderRoutes');
const metadataRoutes = require('./Routes/metadataRoutes');
const adminRoutes = require('./Routes/adminRoutes');
const adminOrderRoutes = require('./Routes/adminOrderRoutes');

const sequelize = require('./db');
const updatePastBookings = require('./cron/bookingStatusUpdater');
const updateStaleDineoutOrders = require('./cron/dineoutOrderStatusUpdater');
const startMorningNotificationJob = require('./cron/dailyMorningNotification');


// ===== Middleware =====
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===== Sequelize sync =====
sequelize
  .sync({ alter: true })
  .then(() => {
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
app.use('/api/grocery-home', groceryHomeRoutes);
app.use('/api/grocery-order', groceryOrderRoutes);
app.use('/api/dineout/orders', dineoutOrderRoutes);
app.use('/api/dineout', dineoutRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/orders', adminOrderRoutes);

// ===== Root route =====
app.get('/', (req, res) => {
  res.send('✅ Express + Socket.IO server is running!');
});

// ===== Initialize Socket Handler =====
require('./socketHandler')(io);

// ===== Start the server =====
// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
