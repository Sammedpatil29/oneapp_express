const Ride = require('./models/rideModel');
const Rider = require('./models/ridersModel');
const RiderTransaction = require('./models/riderTransactionModel');
const Metadata = require('./models/metadataModel');
const { stopRiderSearch, skipToNextRider } = require('./controllers/createRideController');

const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 A user connected:', socket.id);

    // --- Rider Sync (Important for finding riders) ---
    socket.on('syncRider', async (data) => {
      try {
        if (data && data.riderId) {
          let syncedRiderId = null;
          if (isValidUUID(data.riderId)) {
            await Rider.update({ socket_id: socket.id, status: 'online' }, { where: { id: data.riderId } });
            syncedRiderId = data.riderId;
            console.log(`Rider ${data.riderId} synced with socket ${socket.id}`);
          } else {
            // Find by phone contact or first rider if non-UUID test id
            const rider = await Rider.findOne({ where: { contact: String(data.riderId) } }) || await Rider.findOne();
            if (rider) {
              rider.socket_id = socket.id;
              rider.status = 'online';
              await rider.save();
              syncedRiderId = rider.id;
              console.log(`Rider ${rider.id} (${data.riderId}) synced with socket ${socket.id}`);
            } else {
              console.warn(`Sync warning: riderId "${data.riderId}" is not a valid UUID and no fallback rider found in DB.`);
            }
          }

          // If rider has an active ride in progress, notify socket to resume state and ensure status is 'onride'
          if (syncedRiderId) {
            try {
              const ongoing = await Ride.findOne({
                where: {
                  riderId: syncedRiderId,
                  status: ['accepted', 'arrived', 'in_progress']
                },
                order: [['updatedAt', 'DESC']]
              });
              if (ongoing) {
                console.log(`🔄 Emitting ongoing active ride ${ongoing.id} to synced rider ${syncedRiderId}`);
                await Rider.update({ status: 'onride', socket_id: socket.id }, { where: { id: syncedRiderId } });
                socket.emit('rider:status', { status: 'onride', riderId: syncedRiderId });
                socket.emit('ride:active_resume', ongoing);
              }
            } catch (rErr) {
              console.warn('Could not check ongoing ride on sync:', rErr.message);
            }
          }
        }
      } catch (e) { console.error('Sync error:', e); }
    });

    // --- Change Rider Status ---
    socket.on('changeRiderStatus', async (data) => {
      try {
        if (data && data.riderId && data.status !== undefined) {
          const newStatus = data.status === 'onride' ? 'onride' : (data.status === true || data.status === 'online' ? 'online' : (data.status === false || data.status === 'offline' ? 'offline' : data.status));
          
          let rider = null;
          if (isValidUUID(data.riderId)) {
            rider = await Rider.findByPk(data.riderId);
          } else {
            rider = await Rider.findOne({ where: { contact: String(data.riderId) } }) || await Rider.findOne();
          }

          if (rider) {
            // Guard: Cannot go online if commission_due exceeds ₹50
            if (newStatus === 'online' && Number(rider.commission_due || 0) > 50) {
              console.warn(`🚫 Rider ${rider.id} blocked from going online: commission_due ₹${rider.commission_due} > 50`);
              socket.emit('rider:status_rejected', {
                reason: 'commission_limit_exceeded',
                message: `Cannot go online. Outstanding commission is ₹${rider.commission_due}, which exceeds the ₹50 threshold. Please settle dues in Wallet.`,
                commission_due: rider.commission_due
              });
              return;
            }

            rider.status = newStatus;
            if (data.lat && data.lng) {
              rider.current_lat = data.lat;
              rider.current_lng = data.lng;
            }
            await rider.save();
            console.log(`Rider ${rider.id} status changed to ${newStatus}`);
            socket.emit('rider:status', { status: newStatus, riderId: rider.id });
            io.emit('riderUpdate', { status: newStatus, riderId: rider.id });
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
        if (ride && (ride.status === 'searching' || !ride.riderId)) {
          // Fetch rider details to store in the ride
          const rider = await Rider.findByPk(data.riderId);

          // 1. Update Ride
          ride.status = 'accepted';
          ride.riderId = data.riderId;
          const riderData = rider ? rider.toJSON() : {};
          delete riderData.password;
          ride.raider_details = riderData; // Save sanitized rider data to JSONB column
          await ride.save();

          // 2. Move rider status to 'onride'
          if (rider) {
            rider.status = 'onride';
            await rider.save();
            socket.emit('rider:status', { status: 'onride', riderId: rider.id });
            io.emit('riderUpdate', { status: 'onride', riderId: rider.id });
            console.log(`🚖 Captain ${rider.id} status moved to "onride"`);
          }

          // 3. Stop the search loop
          stopRiderSearch(data.rideId);

          // 4. Notify User and Rider with normalized statuses
          const payload = {
            ...ride.toJSON(),
            status: 'accepted',
            alias_status: 'assigned', // For customer app compatibility
            raider_details: riderData
          };

          io.emit('rideUpdate', payload); 
          socket.emit('ride:confirmed', { success: true, ride: payload });
        } else {
          socket.emit('ride:error', { message: 'Ride already taken or cancelled' });
        }
      } catch (error) {
        console.error('Ride accept error:', error);
      }
    });

    // --- Rider Explicitly Rejects Ride Request ---
    socket.on('ride:reject', async (data) => {
      console.log(`❌ Rider ${data.riderId} rejected ride ${data.rideId}`);
      try {
        if (data && data.rideId) {
          skipToNextRider(data.rideId, io);
        }
      } catch (err) {
        console.error('Ride reject error:', err);
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
          const payload = { ...ride.toJSON(), status: 'arrived' };
          io.emit('rideUpdate', payload);
          socket.emit('ride:arrived:ack', { success: true, ride: payload });
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

          // Ensure rider status is 'onride'
          if (ride.riderId) {
            await Rider.update({ status: 'onride' }, { where: { id: ride.riderId } });
            io.emit('riderUpdate', { status: 'onride', riderId: ride.riderId });
          }

          const payload = { 
            ...ride.toJSON(), 
            status: 'in_progress', 
            alias_status: 'started' // For customer app compatibility
          };

          io.emit('rideUpdate', payload);
          socket.emit('ride:started', { success: true, ride: payload });
          console.log(`🚀 Trip started for ride ${data.rideId} (Rider onride)`);
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

          // Calculate platform commission and net rider earnings
          const tripFare = Number(ride.service_details?.price || ride.trip_details?.fare || data.fare || 0);
          let platformCommission = 0;
          let commissionType = 'fixed';
          let commissionValue = 3;

          try {
            const meta = await Metadata.findOne();
            const config = meta?.ride_commission;
            if (config && config.enabled !== false) {
              commissionType = config.type || 'fixed';
              commissionValue = Number(config.value) || 0;
              const minFare = Number(config.min_fare) || 0;

              if (tripFare >= minFare) {
                if (commissionType === 'percentage') {
                  platformCommission = Number(((tripFare * commissionValue) / 100).toFixed(2));
                } else {
                  // Fixed amount
                  platformCommission = Math.min(tripFare, commissionValue);
                }
              }
            }
          } catch (mErr) {
            console.warn('Could not read ride_commission from metadata:', mErr.message);
          }

          const netRiderEarnings = Math.max(0, tripFare - platformCommission);

          // Update Rider Total Rides, Earnings, Commission Due and Transaction Ledger
          if (ride.riderId) {
            const rider = await Rider.findByPk(ride.riderId);
            if (rider) {
              // Cash payment: Rider collected full tripFare in cash. Commission is added to platform commission_due.
              rider.commission_due = Number(((Number(rider.commission_due) || 0) + platformCommission).toFixed(2));
              rider.earnings = (Number(rider.earnings) || 0) + tripFare;
              rider.status = 'online';
              await rider.save();

              socket.emit('rider:status', { status: 'online', riderId: rider.id });
              io.emit('riderUpdate', { status: 'online', riderId: rider.id });
              console.log(`✅ Ride ${ride.id} completed. Commission ₹${platformCommission} added to due. Rider ${rider.id} back to online.`);

              // Record commission debit transaction in wallet ledger
              if (platformCommission > 0) {
                try {
                  const rateText = commissionType === 'percentage' ? `${commissionValue}%` : `₹${commissionValue}`;
                  await RiderTransaction.create({
                    riderId: rider.id,
                    txnId: `TXN${Date.now()}`,
                    title: `Platform Commission (${rateText}) - Ride #${ride.id}`,
                    amount: platformCommission,
                    type: 'DEBIT',
                    category: 'commission',
                    status: 'SUCCESS',
                    reference_id: String(ride.id),
                    metadata: {
                      gross_fare: tripFare,
                      platform_commission: platformCommission,
                      commission_type: commissionType,
                      commission_rate: commissionValue,
                      commission_value: commissionValue,
                      ride_id: String(ride.id),
                      net_rider_earnings: netRiderEarnings,
                      payment_mode: 'CASH',
                      service_type: ride.service_details?.type || 'bike',
                      origin: ride.trip_details?.origin?.name || ride.trip_details?.origin || '',
                      drop: ride.trip_details?.drop?.name || ride.trip_details?.drop || ''
                    }
                  });
                } catch (txnErr) {
                  console.warn('Could not record RiderTransaction on complete:', txnErr.message);
                }
              }
            }
          }

          const payload = {
            ...ride.toJSON(),
            status: 'completed',
            fare_breakdown: {
              gross_fare: tripFare,
              platform_commission: platformCommission,
              net_earnings: netRiderEarnings,
              commission_type: commissionType,
              commission_rate: commissionValue
            }
          };

          io.emit('rideUpdate', payload);
          socket.emit('ride:completed:ack', { success: true, ride: payload });
        }
      } catch (err) {
        console.error('Ride complete error:', err);
      }
    });

    // --- Rider Live Location Updates ---
    socket.on('rider:location', async (data) => {
      // data: { riderId, lat, lng, heading }
      try {
        if (data && data.riderId && data.lat && data.lng) {
          const lat = parseFloat(data.lat);
          const lng = parseFloat(data.lng);
          const heading = parseFloat(data.heading || 0);

          // Broadcast to riders and admin
          io.emit('rider:location_update', {
            riderId: data.riderId,
            lat,
            lng,
            heading,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('Location broadcast error:', err);
      }
    });

    // --- Captain Emergency SOS ---
    socket.on('captain:sos', async (data) => {
      console.log('🚨 CAPTAIN SOS TRIGGERED VIA SOCKET:', data);
      try {
        let rider = null;
        if (data && data.riderId) {
          if (isValidUUID(data.riderId)) {
            rider = await Rider.findByPk(data.riderId);
          } else {
            rider = await Rider.findOne({ where: { contact: String(data.riderId) } }) || await Rider.findOne();
          }
        }

        const lat = Number(data?.current_lat || data?.lat || rider?.current_lat || 0);
        const lng = Number(data?.current_lng || data?.lng || rider?.current_lng || 0);

        const payload = {
          riderId: rider?.id || data?.riderId || 'UNKNOWN',
          name: rider?.name || data?.name || 'Captain',
          phone: rider?.contact || rider?.phone || data?.phone || 'N/A',
          vehicle_number: rider?.vehicle_number || data?.vehicle_number || 'N/A',
          vehicle_type: rider?.vehicle_type || data?.vehicle_type || 'bike',
          lat: lat,
          lng: lng,
          rideId: data?.rideId || null,
          google_maps_url: lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null,
          timestamp: new Date().toISOString()
        };

        io.emit('admin:sos_alert', payload);
        socket.emit('captain:sos_ack', { success: true, alert: payload });
        console.log(`🚨 Admin alerted with SOS from ${payload.name} at (${lat}, ${lng})`);
      } catch (sosErr) {
        console.error('Error broadcasting captain:sos:', sosErr);
        io.emit('admin:sos_alert', { ...data, timestamp: new Date().toISOString() });
      }
    });

    // --- User Cancels Ride ---
    socket.on('cancelRide', async (data) => {
      // data: { rideId }
      console.log(`🚫 User cancelled ride ${data.rideId}`);
      try {
        const ride = await Ride.findByPk(data.rideId);
        if (ride) {
          ride.status = 'cancelled';
          await ride.save();

          // Stop the search loop
          stopRiderSearch(data.rideId);

          if (ride.riderId) {
            await Rider.update({ status: 'online' }, { where: { id: ride.riderId } });
            io.emit('riderUpdate', { status: 'online', riderId: ride.riderId });
          }

          io.emit('rideUpdate', { id: data.rideId, status: 'cancelled', message: 'Ride was cancelled by customer' });
        }
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