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


const PORT = 3000;
const app = express();

// ✅ Create HTTP server and attach Socket.IO properly
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "https://localhost",              // your local Ionic/React/Vue app
      "https://hv0ft3xh-8100.inc1.devtunnels.ms",              // your local Ionic/React/Vue app
      "http://localhost",              // your local Ionic/React/Vue app
      "https://your-production-site.com",
      "http://localhost:8100",
      "http://localhost:8200",
      "https://localhost:8100",
      'https://pintu-minutes.app/' // optional - your deployed frontend
    ],
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // if you use cookies/auth
  },
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
const sequelize = require('./db');
const updatePastBookings = require('./cron/bookingStatusUpdater');


// ===== Middleware =====
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// ===== Sequelize sync =====
sequelize
  .sync({ alter: true })
  .then(() => {
    console.log('✅ Models are synced with the database.');
    // Run status check immediately on startup
    updatePastBookings();
    // Schedule to run every 24 hours (86400000 ms)
    setInterval(updatePastBookings, 24 * 60 * 60 * 1000);
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
app.use('/api/dineout/orders', dineoutOrderRoutes);
app.use('/api/dineout', dineoutRoutes);

// ===== Root route =====
app.get('/', (req, res) => {
  res.send('✅ Express + Socket.IO server is running!');
});

// ===== Initialize Socket Handler =====
require('./socketHandler')(io);

// ===== Start the server =====
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});