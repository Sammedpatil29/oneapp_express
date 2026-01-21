const Ride = require('./models/rideModel');
const Rider = require('./models/ridersModel');
const { stopRiderSearch } = require('./controllers/createRideController');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 A user connected:', socket.id);

    // --- Rider Sync (Important for finding riders) ---
    socket.on('syncRider', async (data) => {
      try {
        if (data.riderId) {
          await Rider.update({ socket_id: socket.id, status: 'online' }, { where: { id: data.riderId } });
          console.log(`Rider ${data.riderId} synced with socket ${socket.id}`);
        }
      } catch (e) { console.error('Sync error:', e); }
    });

    // --- Rider Accepts Ride ---
    socket.on('ride:accept', async (data) => {
      // data: { rideId, riderId }
      console.log(`✅ Rider ${data.riderId} accepted ride ${data.rideId}`);
      
      try {
        const ride = await Ride.findByPk(data.rideId);
        if (ride && ride.status === 'searching') {
          // 1. Update Ride
          ride.status = 'accepted';
          ride.riderId = data.riderId;
          await ride.save();

          // 2. Stop the search loop
          stopRiderSearch(data.rideId);

          // 3. Notify the User (We need user's socket ID, or broadcast to a room named by userId)
          // For simplicity, we broadcast 'rideUpdate' which the user client should listen to filtering by rideId
          io.emit('rideUpdate', ride); 

          // 4. Confirm to Rider
          socket.emit('ride:confirmed', { success: true, ride });
        } else {
          socket.emit('ride:error', { message: 'Ride already taken or cancelled' });
        }
      } catch (error) {
        console.error('Ride accept error:', error);
      }
    });

    // --- User Cancels Ride ---
    socket.on('cancelRide', async (data) => {
      // data: { rideId }
      console.log(`🚫 User cancelled ride ${data.rideId}`);
      try {
        await Ride.update({ status: 'cancelled' }, { where: { id: data.rideId } });
        
        // Stop the search loop
        stopRiderSearch(data.rideId);
        
        io.emit('rideUpdate', { id: data.rideId, status: 'cancelled' });
      } catch (error) { console.error('Cancel error:', error); }
    });

    socket.on('disconnect', () => {
      console.log('🔴 User disconnected:', socket.id);
    });
  });
};