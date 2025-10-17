const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const fs = require('fs');
const axios = require('axios');
const sequelize = require('./db');
const rideRoutes = require('./Routes/rideRoutes');
const pool = require('./db'); // Only if you actually use it
const { createRide } = require('./controllers/createRideController');
const { cancelRide } = require('./controllers/createRideController');
const { searchAndAssignRider } = require('./controllers/createRideController');

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
      "https://your-production-site.com" // optional - your deployed frontend
    ],
    methods: ["GET", "POST"],
    credentials: true, // if you use cookies/auth
  },
});
module.exports.io = io;


// ===== Middleware =====
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// ===== Sequelize sync =====
sequelize
  .sync({ force: false })
  .then(() => console.log('✅ Models are synced with the database.'))
  .catch((err) => console.error('❌ Error syncing models:', err));

// ===== Routes =====
app.use(rideRoutes);

// ===== Root route =====
app.get('/', (req, res) => {
  res.send('✅ Express + Socket.IO server is running!');
});

// ===== Socket.IO events =====
io.on('connection', (socket) => {
  console.log('🟢 A user connected:', socket.id);

  // Example: send a message to the connected client
  socket.emit('welcome', 'Hello from server 👋');

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

  socket.on('cancelRide', async(msg) => {
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