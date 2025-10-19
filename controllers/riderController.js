const Rider = require('../models/ridersModel')

const verifyUserJwtToken = require('../utils/jwttoken')
const {createRiderJWTtoken} = require('../utils/jwttoken')


async function createRider(data) {
  try {
    // Create a new rider entry
    const rider = await Rider.create({
      name: data.name,
      image_url: data.image_url || "",
      role: data.role,
      password: data.password,
      contact: data.contact,
      current_lat: data.current_location.lat,
      current_lng: data.current_location.lng,
      vehicle_number: data.vehicle_number,
      vehicle_type: data.vehicle_type,
      fuel_type: data.fuel_type,
      join_date: data.join_date,
      vehicle_model: data.vehicle_model,
      status: data.status || "offline",
    });

    return rider;
  } catch (error) {
    console.error("Error creating rider:", error);
    throw new Error("Failed to create rider");
  }
}

async function createRiderHandler (req, res) {
  try {
    const rider = await createRider(req.body);
    res.status(201).json({
      success: true,
      message: "Rider created successfully",
      data: rider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

async function verifyRiderDocs(req, res) {
  const { token, is_verified, message, riderId } = req.body;

  if (!token || !riderId) {
    return res.status(400).json({ error: 'Missing token or riderId' });
  }

  try {
    const verified = await verifyUserJwtToken(token);
    console.log(verified)

    if (!verified) {
      return res.status(401).json({ error: 'Token verification failed' });
    }

    if (verified.role !== 'admin' && verified.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const rider = await Rider.findOne({ where: { id: riderId } });

    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    // Perform update
    rider.is_verified = is_verified;
    if (message !== undefined) {
      rider.verification_message = message; // assumes field exists
    }

    await rider.save();

    return res.status(200).json({ message: 'Rider verification updated', rider });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function loginRider(req, res) {
  try {
    // You might want to verify credentials here first
    console.log('login')
    const tokenData = await  createRiderJWTtoken(req.body);
    

    if (!tokenData) {
      return res.status(400).json({
        message: 'Error creating token',
      });
    }

    return res.status(200).json({
      message: 'Login approved',
      tokenData, // ✅ Send the token back

    });

  } catch (error) {
    console.error('❌ Error in loginRider:', error.message);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
}



module.exports = { createRider, createRiderHandler, verifyRiderDocs, loginRider };
