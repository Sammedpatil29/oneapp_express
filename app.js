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

// Define allowed origins and CORS options centrally
const allowedOrigins = [
  "https://localhost",              // your local Ionic/React/Vue app
  "https://hv0ft3xh-8100.inc1.devtunnels.ms",              // your local Ionic/React/Vue app
  "http://localhost",              // your local Ionic/React/Vue app
  "https://your-production-site.com",
  "http://localhost:8100",
  "http://localhost:8200",
  "https://localhost:8100",
  'https://pintu-minutes.app/' // optional - your deployed frontend
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // if you use cookies/auth
};

// ✅ Create HTTP server and attach Socket.IO properly
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

module.exports.io = io;
const rideRoutes = require('./Routes/rideRoutes');
const authRoutes = require('./Routes/authRoutes');
const serviceRoutes = require('./Routes/serviceRoutes');
const addressRoutes = require('./Routes/addressRoutes');
const bannerRoutes = require('./Routes/bannerRoutes');
const homeRoutes = require('./Routes/homeRoutes');
const { createRide } = require('./controllers/createRideController');
const { cancelRide } = require('./controllers/createRideController');
const { searchAndAssignRider } = require('./controllers/createRideController');
const Rider = require('./models/ridersModel');
const sequelize = require('./db');


// ===== Middleware =====
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());

// Debugging: Log incoming requests to verify path on server
app.use((req, res, next) => {
  console.log(`[Server Request] ${req.method} ${req.url}`);
  next();
});

// ===== Sequelize sync =====
sequelize
  .sync({ alter: true })
  .then(() => console.log('✅ Models are synced with the database.'))
  .catch((err) => console.error('❌ Error syncing models:', err));

// ===== Routes =====
// Mount specific API routes first to prevent conflicts with root routes
app.use('/api/addresses', addressRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/home', homeRoutes);
app.use(rideRoutes);
app.use(authRoutes);
app.use(serviceRoutes);

// ===== Root route =====
app.get('/', (req, res) => {
  res.send('✅ Express + Socket.IO server is running!');
});

// ===== Socket.IO events =====
io.on('connection', (socket) => {
  console.log('🟢 A user connected:', socket.id);

  // Example: send a message to the connected client
  socket.emit('welcome', 'Hello from server 👋');

  socket.on('syncRider', async(msg) => {
    const syncRider = await Rider.findOne({
      where: {
        id: msg.riderId
      }
    })

    if(!syncRider){
      throw new Error('rider not found')
    }

    syncRider.socket_id = await socket.id
    syncRider.save()
    // const syncRider = await syncRider(msg)
    socket.emit('riderUpdate', syncRider);
  })

  socket.on('changeRiderStatus', async(msg) => {
    const syncRider = await Rider.findOne({
      where: {
        id: msg.riderId
      }
    })

    if(!syncRider){
      throw new Error('rider not found')
    }
console.log(msg)
    syncRider.status = await msg.status
    console.log(msg.status)
    syncRider.save()
    // const syncRider = await syncRider(msg)
    socket.emit('riderUpdate', syncRider);
  })

  // Example: listen for client message
  socket.on('createRide', async(msg) => {
    console.log('📩 Received from client:', msg);
    // Broadcast back to all clients
    const ride = await createRide(msg);
    socket.emit('rideUpdate', ride);
    const assignRider = await searchAndAssignRider(ride.id)
    socket.emit('rideUpdate', assignRider)
    // io.emit('serverMessage', `✅ Ride created with ID: ${ride.id}`);
  });

  // --- Rider accepts ride ---
  socket.on('ride:accept', (data) => {
    console.log(`✅ Rider ${data.riderId} accepted ride ${data.rideId}`);
    io.emit('rider:accepted', data); // Global event that waitForRiderResponse() listens for
  });

  // --- Rider rejects ride ---
  socket.on('ride:reject', (data) => {
    console.log(`❌ Rider ${data.riderId} rejected ride ${data.rideId}`);
    io.emit('rider:rejected', data);
  });

  socket.on('cancelRide', async(msg) => {
    console.log(`ride cancel ${msg}`)
    const ride = await cancelRide(msg);

    socket.emit('rideUpdate', ride)
  })

  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
  });
});

// ===== Start the server =====
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});