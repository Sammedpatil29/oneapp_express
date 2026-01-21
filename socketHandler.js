const { createRide, cancelRide, searchAndAssignRider } = require('./controllers/createRideController');
const Rider = require('./models/ridersModel');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 A user connected:', socket.id);

    // Example: send a message to the connected client
    socket.emit('welcome', 'Hello from server 👋');

    socket.on('syncRider', async (msg) => {
      try {
        const syncRider = await Rider.findOne({
          where: { id: msg.riderId }
        });

        if (!syncRider) {
          console.error('Rider not found for sync:', msg.riderId);
          return;
        }

        syncRider.socket_id = socket.id;
        await syncRider.save();
        socket.emit('riderUpdate', syncRider);
      } catch (error) {
        console.error('Error in syncRider:', error);
      }
    });

    socket.on('changeRiderStatus', async (msg) => {
      try {
        const syncRider = await Rider.findOne({
          where: { id: msg.riderId }
        });

        if (!syncRider) {
          console.error('Rider not found for status change:', msg.riderId);
          return;
        }
        console.log('Changing status to:', msg.status);
        syncRider.status = msg.status;
        await syncRider.save();
        socket.emit('riderUpdate', syncRider);
      } catch (error) {
        console.error('Error in changeRiderStatus:', error);
      }
    });

    // Example: listen for client message
    socket.on('createRide', async (msg) => {
      console.log('📩 Received from client:', msg);
      try {
        // Broadcast back to all clients
        const ride = await createRide(msg);
        socket.emit('rideUpdate', ride);
        const assignRider = await searchAndAssignRider(ride.id);
        socket.emit('rideUpdate', assignRider);
      } catch (error) {
        console.error('Error in createRide socket event:', error);
      }
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

    socket.on('cancelRide', async (msg) => {
      console.log(`ride cancel ${msg}`);
      try {
        const ride = await cancelRide(msg);
        socket.emit('rideUpdate', ride);
      } catch (error) {
        console.error('Error in cancelRide socket event:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔴 User disconnected:', socket.id);
    });
  });
};