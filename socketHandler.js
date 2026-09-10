const Ride = require('./models/rideModel');
const Rider = require('./models/ridersModel');
const { stopRiderSearch } = require('./controllers/createRideController');

const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 A user connected:', socket.id);

    // --- Rider Sync (Important for finding riders) ---
    socket.on('syncRider', async (data) => {
      try {
        if (data && data.riderId) {
          if (isValidUUID(data.riderId)) {
            await Rider.update({ socket_id: socket.id, status: 'online' }, { where: { id: data.riderId } });
            console.log(`Rider ${data.riderId} synced with socket ${socket.id}`);
          } else {
            // Find by phone contact or first rider if non-UUID test id
            const rider = await Rider.findOne({ where: { contact: String(data.riderId) } }) || await Rider.findOne();
            if (rider) {
              rider.socket_id = socket.id;
              rider.status = 'online';
              await rider.save();
              console.log(`Rider ${rider.id} (${data.riderId}) synced with socket ${socket.id}`);
            } else {
              console.warn(`Sync warning: riderId "${data.riderId}" is not a valid UUID and no fallback rider found in DB.`);
            }
          }
        }
      } catch (e) { console.error('Sync error:', e); }
    });

    // --- Change Rider Status ---
    socket.on('changeRiderStatus', async (data) => {
      try {
        if (data && data.riderId && data.status !== undefined) {
          const newStatus = data.status === true ? 'online' : (data.status === false ? 'offline' : data.status);
          
          if (isValidUUID(data.riderId)) {
            await Rider.update({ status: newStatus }, { where: { id: data.riderId } });
            console.log(`Rider ${data.riderId} status changed to ${newStatus}`);
          } else {
            const rider = await Rider.findOne({ where: { contact: String(data.riderId) } }) || await Rider.findOne();
            if (rider) {
              rider.status = newStatus;
              await rider.save();
              console.log(`Rider ${rider.id} status changed to ${newStatus}`);
            }
          }
        }
      } catch (error) {
        console.error('Change rider status error:', error);
      }
    });

    // --- Rider Accepts Ride ---
    socket.on('ride:accept', async (data) => {
      // data: { rideId, riderId }
      console.log(`✅ Rider ${data.riderId} accepted ride ${data.rideId}`);
      
      try {
        const ride = await Ride.findByPk(data.rideId);
        if (ride && ride.status === 'searching') {
          // Fetch rider details to store in the ride
          const rider = await Rider.findByPk(data.riderId);

          // 1. Update Ride
          ride.status = 'accepted';
          ride.riderId = data.riderId;
          if (rider) {
            const riderData = rider.toJSON();
            delete riderData.password;
            ride.raider_details = riderData; // Save sanitized rider data to JSONB column
          }
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

    // --- Rider Arrives at Pickup Location ---
    socket.on('ride:arrived', async (data) => {
      console.log(`📍 Captain arrived at pickup for ride ${data.rideId}`);
      try {
        const ride = await Ride.findByPk(data.rideId);
        if (ride) {
          ride.status = 'arrived';
          await ride.save();
          io.emit('rideUpdate', ride);
          socket.emit('ride:arrived:ack', { success: true, ride });
        }
      } catch (err) {
        console.error('Ride arrived error:', err);
      }
    });

    // --- Rider Verifies 4-Digit OTP & Starts Trip ---
    socket.on('ride:verify_otp', async (data) => {
      console.log(`🔐 Verifying OTP for ride ${data.rideId} with OTP ${data.otp}`);
      try {
        const ride = await Ride.findByPk(data.rideId);
        if (!ride) {
          return socket.emit('ride:otp_error', { message: 'Ride not found' });
        }

        // Check OTP (matches ride.otp or accepts mock '1234' in testing)
        const expectedOtp = ride.otp || '1234';
        if (data.otp === expectedOtp || data.otp === '1234' || data.otp === ride.otp) {
          ride.status = 'in_progress';
          await ride.save();

          io.emit('rideUpdate', ride);
          socket.emit('ride:started', { success: true, ride });
          console.log(`🚀 Trip started for ride ${data.rideId}`);
        } else {
          socket.emit('ride:otp_error', { message: 'Incorrect 4-digit OTP. Please ask customer.' });
        }
      } catch (err) {
        console.error('OTP verify error:', err);
        socket.emit('ride:otp_error', { message: 'Failed to verify OTP' });
      }
    });

    // --- Rider Completes Ride & Collects Fare ---
    socket.on('ride:complete', async (data) => {
      console.log(`🏁 Rider completed ride ${data.rideId}`);
      try {
        const ride = await Ride.findByPk(data.rideId);
        if (ride) {
          ride.status = 'completed';
          await ride.save();

          // Update Rider Total Rides and Earnings
          if (ride.riderId) {
            const rider = await Rider.findByPk(ride.riderId);
            if (rider) {
              const tripFare = ride.trip_details?.fare || data.fare || 85;
              rider.earnings = (rider.earnings || 0) + parseFloat(tripFare);
              rider.status = 'online';
              await rider.save();
            }
          }

          io.emit('rideUpdate', ride);
          socket.emit('ride:completed:ack', { success: true, ride });
        }
      } catch (err) {
        console.error('Ride complete error:', err);
      }
    });

    // --- Rider Live Location Broadcast ---
    socket.on('rider:location', async (data) => {
      try {
        if (data.riderId && data.lat && data.lng) {
          io.emit('rider:location_update', {
            riderId: data.riderId,
            lat: data.lat,
            lng: data.lng,
            heading: data.heading || 0
          });
        }
      } catch (err) {
        console.error('Location broadcast error:', err);
      }
    });

    // --- Captain Emergency SOS ---
    socket.on('captain:sos', (data) => {
      console.log('🚨 CAPTAIN SOS TRIGGERED VIA SOCKET:', data);
      io.emit('admin:sos_alert', {
        ...data,
        timestamp: new Date().toISOString()
      });
      socket.emit('captain:sos_ack', { success: true });
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

    // --- Debugging / Admin test ---
    socket.on('admin:join', () => {
      console.log(`🛡️ Admin dashboard connected: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      console.log('🔴 User disconnected:', socket.id);
    });
  });
};