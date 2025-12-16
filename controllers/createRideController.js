const Ride = require('../models/rideModel') 
const Rider = require('../models/ridersModel') 
const { Op } = require('sequelize'); 
const { io } = require('../app'); 
const {verifyUserJwtToken} = require('../utils/jwttoken')

/* =========================
   CREATE RIDE
========================= */
async function createRide(data) {
  const { token, trip_details, service_details } = data;

  if (!token || !trip_details || !service_details) {
    throw new Error('Missing required fields');
  }

  const verified = await verifyUserJwtToken(token);
  if (!verified) throw new Error('Token verification failed');

  const { user } = verified;

  const ride = await Ride.create({
    userId: user.id,
    trip_details,
    service_details,
    status: 'searching',
    otp: Math.floor(1000 + Math.random() * 9000)
  });

  return ride;
}

async function createRideHandler(req, res) {
  try {
    const ride = await createRide(req.body);
    res.status(201).json({ message: 'Ride created', ride });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* =========================
   GET RIDES (FIXED QUERY)
========================= */
async function getRidesHandler(req, res) {
  try {
    const rides = await Ride.findAll();
    res.status(200).json(rides);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching rides' });
  }
}

/* =========================
   CANCEL RIDE (SAFE)
========================= */
async function cancelRide(data) {
  const { token, id } = data;
  if (!token || !id) throw new Error('Missing parameters');

  const verified = await verifyUserJwtToken(token);
  if (!verified) throw new Error('Token invalid');

  const { user, role } = verified;

  const where =
    role === 'user'
      ? { id, userId: user.id }
      : { id };

  const ride = await Ride.findOne({ where });
  if (!ride) throw new Error('Ride not found');

  await ride.update({ status: 'cancelled' });
  return ride;
}

async function cancelRideHandler(req, res) {
  try {
    const ride = await cancelRide(req.body);
    res.json({ message: 'Ride cancelled', ride });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* =========================
   SEARCH & ASSIGN RIDER
========================= */
async function searchAndAssignRider(rideId) {
  const ride = await Ride.findByPk(rideId);
  if (!ride) return { success: false, message: 'Ride not found' };

  const MAX_ATTEMPTS = 3;
  const TIMEOUT = 10000;
  const DELAY = 2000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

    await ride.reload();
    if (ride.status === 'cancelled') {
      return { success: false, message: 'Ride cancelled by user' };
    }

    const riders = await Rider.findAll({
      where: { status: 'online' }
    });

    for (const rider of riders) {
      if (!rider.socket_id) continue;

      io.to(rider.socket_id).emit('ride:request', {
        rideId,
        origin: ride.trip_details.origin,
        destination: ride.trip_details.drop
      });

      const result = await waitForRiderResponse(
        io,
        rider.socket_id,
        rider.id,
        rideId,
        TIMEOUT
      );

      if (result === 'accepted') {
        const t = await sequelize.transaction();
        try {
          await rider.update({ status: 'on-ride' }, { transaction: t });

          await ride.update({
            status: 'assigned',
            rider_id: rider.id,
            raider_details: {
              id: rider.id,
              name: rider.name,
              phone: rider.phone,
              vehicle: rider.vehicle
            }
          }, { transaction: t });

          await t.commit();

          io.to(rider.socket_id).emit('ride:confirmed', ride);
          return { success: true, ride, rider };

        } catch (e) {
          await t.rollback();
          throw e;
        }
      }
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, DELAY));
    }
  }

  return { success: false, message: 'No rider accepted' };
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  createRide,
  createRideHandler,
  getRidesHandler,
  cancelRide,
  cancelRideHandler,
  searchAndAssignRider
};
