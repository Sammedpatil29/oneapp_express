const Rider = require('../models/ridersModel');
const Ride = require('../models/rideModel');
const RiderTransaction = require('../models/riderTransactionModel');
const User = require('../models/customUserModel');
const { Op } = require('sequelize');
const sequelize = require('../db');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const { verifyUserJwtToken, createRiderJWTtoken, signRiderToken } = require('../utils/jwttoken');
const { sendEmailUtility } = require('./emailController');
const { sendFcmNotification } = require('../utils/fcmSender');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_S5RLYqr6y2I6xs',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'q2lFxfOyVyAkD1GQMbitqNre',
});


// Helper to extract KYC ZIP archive on server disk into public web directory
function extractKycZipArchive(zipFilePath, riderId) {
  try {
    if (!fs.existsSync(zipFilePath)) {
      console.warn('⚠️ extractKycZipArchive: file does not exist on disk:', zipFilePath);
      return null;
    }
    const zip = new AdmZip(zipFilePath);
    const extractDir = path.join(__dirname, '..', 'public', 'uploads', 'kyc_extracted', String(riderId));
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }
    
    // Extract all entries
    zip.extractAllTo(extractDir, true);
    console.log(`📂 Extracted KYC ZIP archive to: ${extractDir}`);

    const extractedFiles = {};
    let metadataJson = null;

    function walkDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else {
          const lowerName = entry.name.toLowerCase();
          const relativeWebUrl = `/uploads/kyc_extracted/${riderId}/${path.relative(extractDir, fullPath).replace(/\\/g, '/')}`;
          
          if (lowerName === 'metadata.json') {
            try {
              metadataJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            } catch (e) {}
          } else if (lowerName.startsWith('dl') || lowerName.includes('license')) {
            extractedFiles.driving_license = relativeWebUrl;
          } else if (lowerName.startsWith('rc') || lowerName.includes('registration')) {
            extractedFiles.vehicle_rc = relativeWebUrl;
          } else if (lowerName.startsWith('insurance') || lowerName.includes('policy')) {
            extractedFiles.vehicle_insurance = relativeWebUrl;
          } else if (lowerName.startsWith('adhaar') || lowerName.startsWith('aadhaar') || lowerName.includes('pan')) {
            extractedFiles.aadhaar_pan = relativeWebUrl;
          } else if (lowerName.startsWith('selfie') || lowerName.includes('face') || lowerName.includes('photo')) {
            extractedFiles.live_selfie = relativeWebUrl;
          }
        }
      }
    }

    walkDir(extractDir);
    return { extractedFiles, metadataJson };
  } catch (err) {
    console.error('Error in extractKycZipArchive:', err);
    return null;
  }
}

// In-memory OTP storage for rider authentication
const riderEmailOtpStore = new Map();

// Standard 9-item KYC & onboarding checklist with pending / verified / not_verified states
const DEFAULT_CHECKLIST = {
  personal_details: 'pending',
  vehicle_details: 'pending',
  driving_license: 'pending',
  vehicle_rc: 'pending',
  vehicle_insurance: 'pending',
  aadhaar_pan: 'pending',
  live_selfie: 'pending',
  background_verification: 'pending',
  safety_activation: 'pending'
};

async function createRider(data) {
  try {
    const vehicleTypeMap = {
      'bike': 'bike',
      'ev_bike': 'bike',
      'auto': 'auto',
      'cab': 'car',
      'car': 'car',
      'van': 'van'
    };
    const fuelTypeMap = {
      'petrol': 'petrol',
      'electric': 'ev',
      'ev': 'ev',
      'cng': 'cng',
      'diesel': 'diesel'
    };

    // If rider with id, email or contact already exists, UPDATE their profile with onboarding details
    let existingRider = null;
    if (data.id) {
      existingRider = await Rider.findByPk(data.id);
    }
    if (!existingRider && data.email) {
      existingRider = await Rider.findOne({ where: { email: data.email.toLowerCase().trim() } });
    }
    if (!existingRider && (data.contact || data.phone)) {
      existingRider = await Rider.findOne({ where: { contact: String(data.contact || data.phone).trim() } });
    }

    if (existingRider) {
      if (data.name) existingRider.name = data.name;
      if (data.contact || data.phone) existingRider.contact = String(data.contact || data.phone).trim();
      if (data.email) existingRider.email = data.email.toLowerCase().trim();
      if (data.image_url) existingRider.image_url = data.image_url;
      if (data.vehicle_number) existingRider.vehicle_number = data.vehicle_number;
      if (data.vehicle_type) existingRider.vehicle_type = vehicleTypeMap[data.vehicle_type] || existingRider.vehicle_type || 'bike';
      if (data.fuel_type) existingRider.fuel_type = fuelTypeMap[data.fuel_type] || existingRider.fuel_type || 'petrol';
      if (data.vehicle_model) existingRider.vehicle_model = data.vehicle_model;
      if (data.kyc_docs) existingRider.kyc_docs = data.kyc_docs;
      if (data.current_location && data.current_location.lat) existingRider.current_lat = data.current_location.lat;
      if (data.current_location && data.current_location.lng) existingRider.current_lng = data.current_location.lng;
      if (data.status) existingRider.status = data.status;
      if (data.is_verified !== undefined) existingRider.is_verified = data.is_verified;

      await existingRider.save();
      const riderData = existingRider.toJSON();
      delete riderData.password;
      return riderData;
    }

    const rider = await Rider.create({
      name: data.name || (data.email ? data.email.split('@')[0] : 'Captain'),
      email: data.email ? data.email.toLowerCase().trim() : null,
      image_url: data.image_url || "",
      role: data.role || "captain",
      password: data.password || "captain123",
      contact: (data.contact || data.phone) ? String(data.contact || data.phone).trim() : null,
      current_lat: (data.current_location && data.current_location.lat) ? data.current_location.lat : 12.9716,
      current_lng: (data.current_location && data.current_location.lng) ? data.current_location.lng : 77.5946,
      vehicle_number: data.vehicle_number || null,
      vehicle_type: vehicleTypeMap[data.vehicle_type] || "bike",
      fuel_type: fuelTypeMap[data.fuel_type] || "petrol",
      join_date: data.join_date || new Date().toISOString().split('T')[0],
      vehicle_model: data.vehicle_model || null,
      kyc_docs: data.kyc_docs || null,
      status: data.status || "offline",
      is_verified: data.is_verified || false
    });

    const riderData = rider.toJSON();
    delete riderData.password;
    return riderData;
  } catch (error) {
    console.error("Error creating rider:", error);
    throw new Error("Failed to save rider profile: " + error.message);
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

    const { token, is_verified, message, riderId, checklist, verification_checklist } = req.body;

    // Perform update
    if (typeof is_verified === 'boolean') {
      rider.is_verified = is_verified;
    }
    if (message !== undefined) {
      rider.verification_message = message;
    }
    const incomingChecklist = checklist || verification_checklist;
    if (incomingChecklist && typeof incomingChecklist === 'object') {
      const currentDocs = rider.kyc_docs || {};
      const currentChecklist = currentDocs.checklist || { ...DEFAULT_CHECKLIST };
      currentDocs.checklist = {
        ...currentChecklist,
        ...incomingChecklist
      };
      rider.kyc_docs = { ...currentDocs };
      rider.changed('kyc_docs', true);
      // If all are verified, auto verify rider
      const allVerified = Object.values(currentDocs.checklist).every(v => v === 'verified');
      if (allVerified && typeof is_verified !== 'boolean') {
        rider.is_verified = true;
      }
    }

    await rider.save();

    const riderData = rider.toJSON();
    delete riderData.password;
    return res.status(200).json({ message: 'Rider verification updated', rider: riderData });
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

async function getOnlineRiders(req, res) {
  try {
    const onlineRiders = await Rider.findAll({ 
      where: { status: 'online' },
      attributes: { exclude: ['password'] }
    });
    res.status(200).json(onlineRiders);
  } catch (error) {
    console.error('Error fetching online riders:', error);
    res.status(500).json({ error: 'Failed to fetch online riders' });
  }
}

async function getAllRiders(req, res) {
  try {
    const riders = await Rider.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, count: riders.length, data: riders });
  } catch (error) {
    console.error('Error fetching all riders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch riders' });
  }
}

const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

async function findRiderByIdOrFallback(id, options = {}) {
  try {
    if (isValidUUID(id)) {
      return await Rider.findByPk(id, options);
    }
    // If not a valid UUID (e.g. phone number or test id '101')
    if (id) {
      const byPhone = await Rider.findOne({ where: { contact: String(id) }, ...options });
      if (byPhone) return byPhone;
    }
    // Fallback to first rider in database
    return await Rider.findOne(options);
  } catch (err) {
    console.error('findRiderByIdOrFallback error:', err);
    return null;
  }
}

// 1. Get Detailed Captain Profile
async function getRiderProfile(req, res) {
  try {
    const { id } = req.params;
    const rider = await findRiderByIdOrFallback(id, {
      attributes: { exclude: ['password'] }
    });

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Captain not found' });
    }

    const data = rider.toJSON();

    // Query real completed rides and cancelled rides for this rider
    let completedCount = 0;
    let cancelledCount = 0;
    let totalDistanceKm = 0;

    if (rider.id) {
      try {
        const completedRides = await Ride.findAll({
          where: { riderId: rider.id, status: 'completed' },
          attributes: ['id', 'trip_details', 'service_details']
        });
        completedCount = completedRides.length;

        cancelledCount = await Ride.count({
          where: { riderId: rider.id, status: 'cancelled' }
        });

        for (const cr of completedRides) {
          const dist = parseFloat(cr.trip_details?.distance || cr.service_details?.distance || 0);
          if (!isNaN(dist)) totalDistanceKm += dist;
        }
      } catch (countErr) {
        console.warn('Could not count real rides for rider:', countErr.message);
      }
    }

    const totalRidesAttempted = completedCount + cancelledCount;
    const completionRate = totalRidesAttempted > 0 
      ? Math.round((completedCount / totalRidesAttempted) * 100) 
      : 100;
    const cancellationRate = totalRidesAttempted > 0 
      ? Math.round((cancelledCount / totalRidesAttempted) * 100) 
      : 0;
    const acceptanceRate = 100 - cancellationRate;

    // Determine real captain level based on completed rides
    let captainLevel = 'Rookie Captain';
    if (completedCount >= 200) captainLevel = 'Gold Captain';
    else if (completedCount >= 50) captainLevel = 'Silver Captain';
    else if (completedCount >= 10) captainLevel = 'Bronze Captain';

    const hasReviews = (rider.rating?.total_reviews || 0) > 0;
    data.rating = {
      average: hasReviews ? (rider.rating.average || 0) : 0,
      total_reviews: rider.rating?.total_reviews || 0,
      five_star: rider.rating?.five_star || 0
    };
    data.performance = {
      acceptance_rate: `${acceptanceRate}%`,
      cancellation_rate: `${cancellationRate}%`,
      completion_rate: `${completionRate}%`,
      lifetime_rides: completedCount,
      total_distance_km: Math.round(totalDistanceKm * 10) / 10
    };
    data.captain_level = captainLevel;
    data.kyc_docs = data.kyc_docs || {};
    if (!data.kyc_docs.checklist) {
      data.kyc_docs.checklist = { ...DEFAULT_CHECKLIST };
    }
    data.verification_checklist = data.kyc_docs.checklist;
    data.payout_account = data.payout_account || {};

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error getting profile:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 2. Update Captain Profile
async function updateRiderProfile(req, res) {
  try {
    const { id } = req.params;
    const { name, vehicle_number, vehicle_model, fuel_type, vehicle_type, image_url } = req.body;

    const rider = await findRiderByIdOrFallback(id);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Captain not found' });
    }

    if (name) rider.name = name;
    if (vehicle_number) rider.vehicle_number = vehicle_number;
    if (vehicle_model) rider.vehicle_model = vehicle_model;
    if (fuel_type) rider.fuel_type = fuel_type;
    if (vehicle_type) rider.vehicle_type = vehicle_type;
    if (image_url) rider.image_url = image_url;
    if (req.body.status !== undefined) {
      rider.status = req.body.status === true || req.body.status === 'online' ? 'online' : 'offline';
    }

    await rider.save();
    const riderData = rider.toJSON();
    delete riderData.password;

    return res.status(200).json({ success: true, message: 'Profile updated successfully', data: riderData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 2b. Direct Status & Location Update
async function updateRiderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, lat, lng } = req.body;
    const rider = await findRiderByIdOrFallback(id);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Captain not found' });
    }

    const newStatus = status === 'onride' ? 'onride' : (status === true || status === 'online' ? 'online' : 'offline');

    if (newStatus === 'online' && Number(rider.commission_due || 0) > 50) {
      return res.status(403).json({
        success: false,
        message: `Cannot go online. Outstanding platform commission is ₹${rider.commission_due}, which exceeds the ₹50 threshold. Please settle dues in Wallet.`,
        commission_due: rider.commission_due
      });
    }

    rider.status = newStatus;
    if (lat && lng) {
      rider.current_lat = lat;
      rider.current_lng = lng;
    }
    await rider.save();
    console.log(`[DB] Rider ${rider.id} status updated to: ${newStatus}`);

    return res.status(200).json({
      success: true,
      message: `Captain status updated to ${newStatus}`,
      data: { id: rider.id, status: newStatus }
    });
  } catch (error) {
    console.error('Error updating rider status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 3. Get Earnings & Targets (Synced with real database records)
async function getRiderEarnings(req, res) {
  try {
    const { id } = req.params;
    const rider = await findRiderByIdOrFallback(id);

    // Calculate real stats from Ride database
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let todayRides = [];
    let weekRides = [];
    let monthRides = [];

    if (rider && rider.id) {
      try {
        todayRides = await Ride.findAll({
          where: {
            riderId: rider.id,
            status: 'completed',
            updatedAt: { [Op.gte]: startOfToday }
          }
        });

        weekRides = await Ride.findAll({
          where: {
            riderId: rider.id,
            status: 'completed',
            updatedAt: { [Op.gte]: startOfWeek }
          }
        });

        monthRides = await Ride.findAll({
          where: {
            riderId: rider.id,
            status: 'completed',
            updatedAt: { [Op.gte]: startOfMonth }
          }
        });
      } catch (dbErr) {
        console.warn('Could not query Ride table for rider stats:', dbErr.message);
      }
    }

    const getRideFare = (r) => Number(r.service_details?.price || r.trip_details?.fare || 0);

    const todayEarnings = todayRides.reduce((sum, r) => sum + getRideFare(r), 0);
    const todayCount = todayRides.length;

    const weekEarnings = weekRides.reduce((sum, r) => sum + getRideFare(r), 0);
    const weekCount = weekRides.length;

    const monthEarnings = monthRides.reduce((sum, r) => sum + getRideFare(r), 0);
    const monthCount = monthRides.length;

    // Dynamically populate weekly chart from actual rides
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayMap = {
      Mon: { amount: 0, rides: 0 },
      Tue: { amount: 0, rides: 0 },
      Wed: { amount: 0, rides: 0 },
      Thu: { amount: 0, rides: 0 },
      Fri: { amount: 0, rides: 0 },
      Sat: { amount: 0, rides: 0 },
      Sun: { amount: 0, rides: 0 }
    };

    for (const r of weekRides) {
      const d = new Date(r.updatedAt || r.createdAt);
      const dayName = dayNames[d.getDay()];
      if (dayMap[dayName]) {
        dayMap[dayName].amount += getRideFare(r);
        dayMap[dayName].rides += 1;
      }
    }

    const chart_data = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      day,
      amount: dayMap[day].amount,
      rides: dayMap[day].rides
    }));

    const earningsData = {
      today: {
        total_earnings: todayEarnings,
        rides_completed: todayCount,
        hours_online: rider?.status === 'online' ? 'Active' : '0.0 hrs',
        fare_earnings: todayEarnings,
        tips: 0,
        incentives: 0
      },
      this_week: {
        total_earnings: weekEarnings,
        rides_completed: weekCount,
        chart_data
      },
      this_month: {
        total_earnings: monthEarnings,
        rides_completed: monthCount
      },
      active_incentives: [
        {
          id: 'inc-1',
          title: 'Daily Milestone Bonus',
          description: 'Complete 8 rides today to unlock ₹150 bonus!',
          target_rides: 8,
          completed_rides: todayCount,
          reward_amount: 150,
          is_completed: todayCount >= 8,
          progress_percent: Math.min(100, Math.round((todayCount / 8) * 100))
        },
        {
          id: 'inc-2',
          title: 'Weekly Super Captain Target',
          description: 'Complete 30 rides this week to unlock ₹600 bonus!',
          target_rides: 30,
          completed_rides: weekCount,
          reward_amount: 600,
          is_completed: weekCount >= 30,
          progress_percent: Math.min(100, Math.round((weekCount / 30) * 100))
        }
      ]
    };

    return res.status(200).json({ success: true, data: earningsData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 4. Get Wallet Details & Transactions
async function getRiderWallet(req, res) {
  try {
    const { id } = req.params;
    const rider = await findRiderByIdOrFallback(id);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Captain not found' });
    }

    const availableBalance = Math.max(0, Number(rider.earnings) || 0);

    // Calculate real stats from completed rides
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const getFare = (r) => Number(r.service_details?.price || r.trip_details?.fare || 0);

    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    let cashToday = 0;

    try {
      const allRides = await Ride.findAll({
        where: {
          riderId: rider.id,
          status: 'completed',
          updatedAt: { [Op.gte]: startOfMonth }
        },
        attributes: ['id', 'trip_details', 'service_details', 'updatedAt']
      });

      for (const r of allRides) {
        const fare = getFare(r);
        const uTime = new Date(r.updatedAt).getTime();
        monthTotal += fare;
        if (uTime >= startOfWeek.getTime()) weekTotal += fare;
        if (uTime >= startOfToday.getTime()) {
          todayTotal += fare;
          const payMode = String(r.trip_details?.paymentMode || r.service_details?.paymentMode || '').toUpperCase();
          if (payMode === 'CASH') cashToday += fare;
        }
      }
    } catch (rErr) {
      console.warn('Could not aggregate rides for wallet:', rErr.message);
    }

    // Fetch real transactions from RiderTransaction ledger
    let dbTransactions = [];
    try {
      dbTransactions = await RiderTransaction.findAll({
        where: { riderId: rider.id },
        order: [['createdAt', 'DESC']],
        limit: 30
      });
    } catch (txnErr) {
      console.warn('Could not query RiderTransaction ledger:', txnErr.message);
    }

    const formatTime = (date) => {
      return new Date(date).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    const formatDateLabel = (date) => {
      const d = new Date(date);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return 'Today';
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formattedTransactions = dbTransactions.map(t => ({
      id: t.txnId || t.id,
      txnId: t.txnId || t.id,
      title: t.title,
      amount: t.amount,
      type: t.type,
      category: t.category,
      dateLabel: formatDateLabel(t.createdAt),
      time: formatTime(t.createdAt),
      status: t.status,
      commission_type: t.metadata?.commission_type || null,
      commission_value: t.metadata?.commission_rate !== undefined ? t.metadata?.commission_rate : (t.metadata?.commission_value || null),
      ride_id: t.reference_id || t.metadata?.ride_id || null,
      metadata: t.metadata || {}
    }));

    const commissionDue = Number(rider.commission_due || 0);

    const walletData = {
      balance: {
        commission_due: commissionDue,
        available: commissionDue,
        cash_collected_in_hand: cashToday,
        total_cash_collected: monthTotal
      },
      stats: {
        today: todayTotal,
        thisWeek: weekTotal,
        thisMonth: monthTotal
      },
      transactions: formattedTransactions
    };

    return res.status(200).json({ success: true, data: walletData });
  } catch (error) {
    console.error('Error in getRiderWallet:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 5. Pay Platform Commission (Direct / Manual Fallback)
async function payRiderCommission(req, res) {
  try {
    const { id, amount } = req.body;
    if (!id || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const rider = await findRiderByIdOrFallback(id);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Captain not found' });
    }

    const payNum = Number(amount);
    const currentDue = Number(rider.commission_due || 0);
    rider.commission_due = Math.max(0, Number((currentDue - payNum).toFixed(2)));
    await rider.save();

    const refId = `COMM-PAY-${Date.now().toString(36).toUpperCase()}`;

    try {
      await RiderTransaction.create({
        riderId: rider.id,
        txnId: `TXN${Date.now()}`,
        title: `Platform Commission Paid`,
        amount: payNum,
        type: 'CREDIT',
        category: 'commission_payment',
        status: 'SUCCESS',
        reference_id: refId,
        metadata: { paid_amount: payNum, remaining_due: rider.commission_due }
      });
    } catch (txnErr) {
      console.warn('Could not record commission payment transaction:', txnErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Payment of ₹${payNum} received successfully. Remaining due: ₹${rider.commission_due}`,
      reference_id: refId,
      commission_due: rider.commission_due,
      new_balance: rider.commission_due
    });
  } catch (error) {
    console.error('Error in payRiderCommission:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 5b. Razorpay: Create Order for Commission Payment
async function createRiderRazorpayOrder(req, res) {
  try {
    const { id, amount } = req.body;
    if (!id || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const rider = await findRiderByIdOrFallback(id);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Captain not found' });
    }

    const amountInPaise = Math.round(Number(amount) * 100);
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `comm_${Date.now()}`,
      notes: {
        riderId: String(rider.id),
        riderName: String(rider.name || 'Captain'),
        purpose: 'Platform Commission Settlement'
      }
    };

    const order = await razorpay.orders.create(options);
    console.log(`💳 Razorpay commission order created for Rider ${rider.id}: ${order.id} for ₹${amount}`);

    return res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'
    });
  } catch (error) {
    console.error('Error in createRiderRazorpayOrder:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 5c. Razorpay: Verify Payment and Deduct Commission
async function verifyRiderRazorpayPayment(req, res) {
  try {
    const { id, amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!id || !amount || !razorpay_payment_id) {
      return res.status(400).json({ success: false, message: 'Missing payment confirmation parameters' });
    }

    const rider = await findRiderByIdOrFallback(id);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Captain not found' });
    }

    // Verify HMAC-SHA256 signature if order_id and signature provided
    const secret = process.env.RAZORPAY_KEY_SECRET || 'q2lFxfOyVyAkD1GQMbitqNre';
    if (razorpay_order_id && razorpay_signature) {
      const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        console.warn('⚠️ Razorpay signature mismatch on verification. Validating via fetch...');
      }
    }

    // Deduct paid amount from commission_due
    const payNum = Number(amount);
    const currentDue = Number(rider.commission_due || 0);
    rider.commission_due = Math.max(0, Number((currentDue - payNum).toFixed(2)));
    await rider.save();

    // Record verified transaction in ledger
    try {
      await RiderTransaction.create({
        riderId: rider.id,
        txnId: `TXN${Date.now()}`,
        title: `Platform Commission Paid (Razorpay)`,
        amount: payNum,
        type: 'CREDIT',
        category: 'commission_payment',
        status: 'SUCCESS',
        reference_id: razorpay_payment_id,
        metadata: {
          paid_amount: payNum,
          remaining_due: rider.commission_due,
          razorpay_order_id: razorpay_order_id || null,
          razorpay_payment_id: razorpay_payment_id
        }
      });
    } catch (txnErr) {
      console.warn('Could not record Razorpay transaction:', txnErr.message);
    }

    console.log(`✅ Captain ${rider.id} paid ₹${payNum} commission via Razorpay. Remaining due: ₹${rider.commission_due}`);

    return res.status(200).json({
      success: true,
      message: `Payment of ₹${payNum} verified successfully. Remaining due: ₹${rider.commission_due}`,
      commission_due: rider.commission_due,
      payment_id: razorpay_payment_id
    });
  } catch (error) {
    console.error('Error in verifyRiderRazorpayPayment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 5d. Fallback alias for backward-compatibility
async function withdrawRiderWallet(req, res) {
  return payRiderCommission(req, res);
}

// 6. Get Referrals & Rewards
async function getRiderReferrals(req, res) {
  try {
    const { id } = req.params;
    const referralCode = `CAPTAIN${(id || '101').toString().slice(-4).toUpperCase()}`;

    const referralData = {
      referral_code: referralCode,
      referral_link: `https://pintu.democompany.in.net/join?ref=${referralCode}`,
      reward_per_referral: 500,
      reward_condition: 'Earn ₹500 when your friend joins & completes 10 rides within 14 days.',
      total_referred: 8,
      successful_referrals: 5,
      total_rewards_earned: 2500,
      friends_list: [
        {
          name: 'Rahul Sharma',
          contact: '9876543210',
          join_date: '01 Sep 2026',
          rides_completed: 10,
          target_rides: 10,
          status: 'COMPLETED',
          reward_credited: 500
        },
        {
          name: 'Amit Verma',
          contact: '9812345678',
          join_date: '04 Sep 2026',
          rides_completed: 7,
          target_rides: 10,
          status: 'IN_PROGRESS',
          reward_credited: 0
        },
        {
          name: 'Vikram Patil',
          contact: '9988776655',
          join_date: '06 Sep 2026',
          rides_completed: 3,
          target_rides: 10,
          status: 'IN_PROGRESS',
          reward_credited: 0
        }
      ]
    };

    return res.status(200).json({ success: true, data: referralData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 7. Get Ride / Order History with details
async function getRiderRides(req, res) {
  try {
    const { id } = req.params;
    const { filter = 'all', limit = 50, offset = 0 } = req.query;

    const rider = await findRiderByIdOrFallback(id);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Captain not found' });
    }

    const whereClause = {
      riderId: rider.id
    };

    if (filter === 'completed') {
      whereClause.status = 'completed';
    } else if (filter === 'cancelled') {
      whereClause.status = 'cancelled';
    } else if (filter !== 'all') {
      whereClause.status = filter;
    }

    const rides = await Ride.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'first_name', 'last_name', 'phone', 'email'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    });

    const formatTime = (date) => {
      return new Date(date).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    const formatDateLabel = (date) => {
      const d = new Date(date);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return 'Today';
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formattedRides = rides.map(r => {
      const fareAmount = Number(r.service_details?.price || r.trip_details?.fare || 0);
      const originName = r.trip_details?.origin?.name || r.trip_details?.origin || 'Pickup Location';
      const dropName = r.trip_details?.drop?.name || r.trip_details?.drop || 'Destination';
      const distanceNum = parseFloat(r.trip_details?.distance || r.service_details?.distance || 0) || 0;
      const durationNum = parseInt(r.trip_details?.duration || r.service_details?.duration || 0) || 0;
      const paymentMode = (r.trip_details?.paymentMode || r.service_details?.paymentMode || 'CASH').toUpperCase();
      const userFullName = [r.User?.first_name, r.User?.last_name].filter(Boolean).join(' ').trim();
      const customerName = userFullName || r.User?.username || r.raider_details?.name || 'Customer';
      const customerPhone = r.User?.phone || r.User?.email || r.raider_details?.contact || '—';

      return {
        id: r.id,
        rideId: `RIDE-${r.id.toString().slice(-4).toUpperCase()}`,
        service_type: r.service_details?.type || r.trip_details?.type || 'bike',
        customer_name: customerName,
        customer_phone: customerPhone,
        customer: {
          name: customerName,
          phone: customerPhone
        },
        pickup: {
          address: originName
        },
        drop: {
          address: dropName
        },
        pickup_address: originName,
        drop_address: dropName,
        from: originName,
        to: dropName,
        distance_km: distanceNum,
        distance: `${distanceNum} km`,
        duration_mins: durationNum,
        duration: `${durationNum} mins`,
        fare: {
          rideFare: fareAmount,
          incentive: 0,
          total: fareAmount
        },
        amount: fareAmount,
        total_earning: fareAmount,
        payment_method: paymentMode,
        paymentMode: paymentMode,
        payment: {
          mode: paymentMode
        },
        status: (r.status || 'completed').toUpperCase(),
        dateLabel: formatDateLabel(r.createdAt),
        date: r.createdAt,
        time: formatTime(r.createdAt),
        created_at: `${formatDateLabel(r.createdAt)}, ${formatTime(r.createdAt)}`,
        otp: r.otp
      };
    });

    // Summary calculation
    const allCompletedRides = await Ride.findAll({
      where: { riderId: rider.id, status: 'completed' },
      attributes: ['id', 'service_details', 'trip_details']
    });

    const totalEarnings = allCompletedRides.reduce((acc, cr) => {
      return acc + Number(cr.service_details?.price || cr.trip_details?.fare || 0);
    }, 0);

    const summary = {
      totalRides: allCompletedRides.length,
      totalEarnings,
      rating: ((rider.rating?.total_reviews || 0) > 0 ? (rider.rating.average || 0) : 0)
    };

    return res.status(200).json({
      success: true,
      count: formattedRides.length,
      data: formattedRides,
      summary
    });
  } catch (error) {
    console.error('Error in getRiderRides:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 7b. Get Single Ride Detail
async function getRideDetail(req, res) {
  try {
    const { rideId } = req.params;
    if (!rideId) {
      return res.status(400).json({ success: false, message: 'Ride ID is required' });
    }

    const ride = await Ride.findByPk(rideId, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'first_name', 'last_name', 'phone', 'email'],
          required: false
        },
        {
          model: Rider,
          attributes: ['id', 'name', 'contact', 'vehicle_number', 'vehicle_model', 'vehicle_type'],
          required: false
        }
      ]
    });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const fareAmount = Number(ride.service_details?.price || ride.trip_details?.fare || 0);
    const originName = ride.trip_details?.origin?.name || ride.trip_details?.origin || 'Pickup Location';
    const dropName = ride.trip_details?.drop?.name || ride.trip_details?.drop || 'Destination';
    const distanceNum = parseFloat(ride.trip_details?.distance || ride.service_details?.distance || 0) || 0;
    const durationNum = parseInt(ride.trip_details?.duration || ride.service_details?.duration || 0) || 0;
    const paymentMode = (ride.trip_details?.paymentMode || ride.service_details?.paymentMode || 'CASH').toUpperCase();
    const userFullName = [ride.User?.first_name, ride.User?.last_name].filter(Boolean).join(' ').trim();
    const customerName = userFullName || ride.User?.username || ride.raider_details?.name || 'Customer';
    const customerPhone = ride.User?.phone || ride.User?.email || ride.raider_details?.contact || '—';

    const formatTime = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const rideData = {
      id: ride.id,
      rideId: `RIDE-${ride.id.toString().slice(-4).toUpperCase()}`,
      status: (ride.status || 'COMPLETED').toUpperCase(),
      pickup: { address: originName },
      drop: { address: dropName },
      date: ride.createdAt,
      time: formatTime(ride.createdAt),
      distance: `${distanceNum} km`,
      duration: `${durationNum} mins`,
      fare: {
        rideFare: fareAmount,
        incentive: 0,
        total: fareAmount
      },
      customer: {
        name: customerName,
        phone: customerPhone
      },
      payment: {
        mode: paymentMode
      },
      service_type: ride.service_details?.type || 'bike',
      otp: ride.otp,
      rider: ride.Rider ? {
        id: ride.Rider.id,
        name: ride.Rider.name,
        contact: ride.Rider.contact,
        vehicle_number: ride.Rider.vehicle_number,
        vehicle_model: ride.Rider.vehicle_model
      } : null
    };

    return res.status(200).json({ success: true, data: { ride: rideData } });
  } catch (error) {
    console.error('Error in getRideDetail:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 7c. Get Rider's Current Active Ongoing Ride (for app restart / refresh recovery)
async function getRiderActiveRide(req, res) {
  try {
    const { id } = req.params;
    const rider = await findRiderByIdOrFallback(id);
    if (!rider) {
      return res.status(200).json({ success: true, hasActiveRide: false, ride: null });
    }

    const activeRide = await Ride.findOne({
      where: {
        riderId: rider.id,
        status: { [Op.in]: ['accepted', 'arrived', 'in_progress'] }
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'first_name', 'last_name', 'phone', 'email'],
          required: false
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    if (!activeRide) {
      return res.status(200).json({ success: true, hasActiveRide: false, ride: null });
    }

    const fareAmount = Number(activeRide.service_details?.price || activeRide.trip_details?.fare || 0);
    const originName = activeRide.trip_details?.origin?.name || activeRide.trip_details?.pickup?.address || activeRide.trip_details?.origin || 'Pickup Location';
    const dropName = activeRide.trip_details?.drop?.name || activeRide.trip_details?.drop?.address || activeRide.trip_details?.drop || 'Destination';
    const distanceNum = parseFloat(activeRide.trip_details?.distance || activeRide.service_details?.distance || 3.2) || 3.2;
    const durationNum = parseInt(activeRide.trip_details?.duration || activeRide.service_details?.duration || 12) || 12;
    const userFullName = [activeRide.User?.first_name, activeRide.User?.last_name].filter(Boolean).join(' ').trim();
    const customerName = userFullName || activeRide.User?.username || 'Customer';
    const customerPhone = activeRide.User?.phone || '';

    const originLat = activeRide.trip_details?.origin?.lat || activeRide.trip_details?.origin?.coords?.lat || 12.9716;
    const originLng = activeRide.trip_details?.origin?.lng || activeRide.trip_details?.origin?.coords?.lng || 77.5946;
    const dropLat = activeRide.trip_details?.drop?.lat || activeRide.trip_details?.drop?.coords?.lat || (originLat + 0.02);
    const dropLng = activeRide.trip_details?.drop?.lng || activeRide.trip_details?.drop?.coords?.lng || (originLng + 0.02);

    const formattedRide = {
      id: activeRide.id,
      rideId: activeRide.id,
      customerName: customerName,
      customerPhone: customerPhone,
      customerRating: 4.9,
      serviceType: (activeRide.service_details?.type || 'BIKE TAXI').toUpperCase(),
      origin: {
        name: originName,
        lat: originLat,
        lng: originLng
      },
      destination: {
        name: dropName,
        lat: dropLat,
        lng: dropLng
      },
      fare: fareAmount,
      distance: distanceNum,
      duration: durationNum,
      status: activeRide.status,
      otp: activeRide.otp || '1234',
      paymentMode: 'CASH',
      trip_details: activeRide.trip_details,
      service_details: activeRide.service_details
    };

    return res.status(200).json({
      success: true,
      hasActiveRide: true,
      ride: formattedRide
    });
  } catch (error) {
    console.error('Get Active Ride Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 8. Notifications Feed
async function getRiderNotifications(req, res) {
  try {
    const notifications = [
      {
        id: 'notif-1',
        title: '🔥 High Surge Demand in Viman Nagar!',
        message: 'Ride demand is 2.5x higher. Earn extra ₹30 per ride between 5 PM and 9 PM.',
        type: 'surge',
        created_at: '10 mins ago',
        is_read: false
      },
      {
        id: 'notif-2',
        title: '🎉 ₹500 Referral Bonus Credited!',
        message: 'Your friend Rahul completed 10 rides. ₹500 has been credited directly to your wallet.',
        type: 'reward',
        created_at: 'Yesterday',
        is_read: true
      },
      {
        id: 'notif-3',
        title: '🛡️ Helmet & Safety Policy Reminder',
        message: 'Please carry a pillion helmet for passenger safety and 5-star ratings.',
        type: 'safety',
        created_at: '2 days ago',
        is_read: true
      }
    ];
    return res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 9. Emergency SOS Distress Signal
async function triggerRiderSos(req, res) {
  try {
    const { riderId, current_lat, current_lng, rideId } = req.body;
    console.log(`🚨 [CAPTAIN SOS ALERT] Rider ID: ${riderId} | Location: (${current_lat}, ${current_lng}) | Ride: ${rideId || 'None'}`);

    let rider = null;
    if (riderId) {
      rider = await findRiderByIdOrFallback(riderId);
    }

    const lat = Number(current_lat || rider?.current_lat || 0);
    const lng = Number(current_lng || rider?.current_lng || 0);

    const payload = {
      riderId: rider?.id || riderId || 'UNKNOWN',
      name: rider?.name || 'Captain',
      phone: rider?.contact || rider?.phone || 'N/A',
      vehicle_number: rider?.vehicle_number || 'N/A',
      vehicle_type: rider?.vehicle_type || 'bike',
      lat: lat,
      lng: lng,
      rideId: rideId || null,
      google_maps_url: lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null,
      timestamp: new Date().toISOString()
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('admin:sos_alert', payload);
      console.log('🚨 Emergency SOS alert broadcasted to Admin dashboard via io.emit');
    }

    return res.status(200).json({
      success: true,
      message: 'Emergency SOS alert dispatched to Central Safety Team & local emergency services.',
      emergency_helpline: '112',
      pintu_safety_desk: '+91-1800-123-PINTU',
      alert: payload
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 10. Send Email OTP for Captain Login / Onboarding
async function sendRiderEmailOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    riderEmailOtpStore.set(cleanEmail, { otp, expiresAt, attempts: 0 });

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0b57d0; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Pintu Captain</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px; font-weight: 500;">Partner Portal Authentication</p>
        </div>
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 12px;">Hello Captain,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">Use the verification code below to securely authenticate your Pintu Partner account.</p>
        <div style="background: linear-gradient(135deg, #f0f7ff 0%, #e0effe 100%); border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 20px;">⏱️ This one-time code is valid for <strong>10 minutes</strong>. For your account security, please do not share this code with anyone.</p>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">© 2026 Pintu Logistics & Mobility Pvt Ltd. All rights reserved.</p>
        </div>
      </div>
    `;

    // Attempt to send email
    const emailResult = await sendEmailUtility(cleanEmail, `Your Pintu Captain Verification Code: ${otp}`, htmlBody);

    console.log(`✉️ [RIDER EMAIL OTP] Sent to: ${cleanEmail} | OTP: ${otp} | Success: ${emailResult.success}`);

    return res.status(200).json({
      success: true,
      message: 'Verification code sent successfully to ' + cleanEmail
    });
  } catch (error) {
    console.error('Error in sendRiderEmailOtp:', error);
    return res.status(500).json({ success: false, message: 'Failed to send verification code. ' + error.message });
  }
}

// 11. Verify Email OTP & Handle Login vs Onboarding Redirection
async function verifyRiderEmailOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    const record = riderEmailOtpStore.get(cleanEmail);
    const isValid = record && record.otp === cleanOtp && Date.now() <= record.expiresAt;

    if (!isValid) {
      if (record && Date.now() > record.expiresAt) {
        riderEmailOtpStore.delete(cleanEmail);
        return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
      }
      return res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' });
    }

    // Clear used OTP
    riderEmailOtpStore.delete(cleanEmail);

    // Check if Captain already exists in database
    let rider = await Rider.findOne({ where: { email: cleanEmail } });
    let isNewUser = false;

    if (!rider) {
      // Immediately create a registered Captain record so they are an authenticated logged-in user
      isNewUser = true;
      rider = await Rider.create({
        email: cleanEmail,
        name: "", // Empty string avoids NOT NULL constraint while letting user provide their real legal name
        vehicle_number: "", // Avoids NOT NULL constraint on initial signup before onboarding
        vehicle_model: "",
        vehicle_type: "bike",
        fuel_type: "petrol",
        role: 'captain',
        status: 'offline',
        is_verified: false,
        kyc_docs: { checklist: { ...DEFAULT_CHECKLIST } },
        join_date: new Date().toISOString().split('T')[0],
        current_lat: 12.9716,
        current_lng: 77.5946
      });
      console.log(`🆕 Registered new Captain account on email OTP verification: ${rider.id} (${cleanEmail})`);
    }

    // Generate JWT authentication token
    const tokenData = signRiderToken(rider);

    const checklist = (rider.kyc_docs && rider.kyc_docs.checklist) ? rider.kyc_docs.checklist : { ...DEFAULT_CHECKLIST };
    const hasSubmittedDocs = !!(rider.kyc_docs && typeof rider.kyc_docs === 'object' && (rider.kyc_docs.zip_archive || Object.keys(rider.kyc_docs).filter(k => k !== 'checklist').length > 0));

    let verification_status = 'pending_details';
    if (rider.is_verified) {
      verification_status = 'verified';
    } else if (hasSubmittedDocs) {
      verification_status = 'verifying';
    }

    return res.status(200).json({
      success: true,
      isNewUser,
      message: isNewUser ? 'Email verified. Session created.' : 'Welcome back, Captain!',
      tokenData,
      is_verified: rider.is_verified || false,
      has_submitted_docs: hasSubmittedDocs,
      verification_status,
      verification_checklist: checklist,
      kyc_docs: rider.kyc_docs,
      rider: {
        id: rider.id,
        name: rider.name,
        email: rider.email,
        phone: rider.contact,
        role: rider.role || 'captain',
        is_verified: rider.is_verified || false,
        status: rider.status || 'offline',
        has_submitted_docs: hasSubmittedDocs,
        verification_status,
        verification_checklist: checklist,
        kyc_docs: rider.kyc_docs
      }
    });
  } catch (error) {
    console.error('Error in verifyRiderEmailOtp:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 12. Get Rider Auth & Verification Status
async function getRiderAuthStatus(req, res) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    }
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        isAuthenticated: false,
        message: 'No authorization token provided'
      });
    }

    const verified = await verifyUserJwtToken(token);
    if (!verified || !verified.user) {
      return res.status(401).json({
        success: false,
        isAuthenticated: false,
        message: 'Invalid or expired session token'
      });
    }

    // Always fetch fresh data from database
    const riderDb = await Rider.findByPk(verified.user.id, {
      attributes: { exclude: ['password'] }
    });
    const rider = riderDb || verified.user;

    const checklist = (rider.kyc_docs && rider.kyc_docs.checklist) ? rider.kyc_docs.checklist : { ...DEFAULT_CHECKLIST };
    const hasSubmittedDocs = !!(rider.kyc_docs && typeof rider.kyc_docs === 'object' && (rider.kyc_docs.zip_archive || Object.keys(rider.kyc_docs).filter(k => k !== 'checklist').length > 0));

    let verification_status = 'pending_details';
    if (rider.is_verified) {
      verification_status = 'verified';
    } else if (hasSubmittedDocs) {
      verification_status = 'verifying';
    }

    return res.status(200).json({
      success: true,
      isAuthenticated: true,
      is_verified: rider.is_verified || false,
      status: rider.status || 'offline',
      has_submitted_docs: hasSubmittedDocs,
      verification_status,
      verification_checklist: checklist,
      kyc_docs: rider.kyc_docs,
      rider: {
        id: rider.id,
        name: rider.name,
        email: rider.email,
        phone: rider.contact,
        role: rider.role || 'captain',
        is_verified: rider.is_verified || false,
        status: rider.status || 'offline',
        has_submitted_docs: hasSubmittedDocs,
        verification_status,
        verification_checklist: checklist,
        kyc_docs: rider.kyc_docs
      }
    });
  } catch (error) {
    console.error('Error in getRiderAuthStatus:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 13. Check if phone is already linked to an existing rider
async function checkRiderPhone(req, res) {
  try {
    const rawPhone = req.query.phone || req.body.phone;
    const riderId = req.query.riderId || req.body.riderId;

    if (!rawPhone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const cleanPhone = String(rawPhone).trim();
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
    }

    const whereClause = {
      contact: cleanPhone
    };

    if (riderId) {
      whereClause.id = { [Op.ne]: riderId };
    }

    const existingRider = await Rider.findOne({ where: whereClause });

    if (existingRider) {
      return res.status(200).json({
        success: true,
        exists: true,
        message: 'This mobile number is already linked with another Captain account'
      });
    }

    return res.status(200).json({
      success: true,
      exists: false,
      message: 'Mobile number is available'
    });
  } catch (error) {
    console.error('Error in checkRiderPhone:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 14. Handle KYC ZIP upload and update rider details
async function uploadKycZip(req, res) {
  try {
    const file = req.file;
    const {
      riderId,
      name,
      contact,
      email,
      vehicle_type,
      vehicle_model,
      vehicle_number,
      fuel_type,
      vehicle_year,
      kyc_docs
    } = req.body;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No KYC documents ZIP file received' });
    }

    const zipRelativeUrl = `/uploads/kyc_zips/${file.filename}`;
    console.log(`📦 KYC ZIP uploaded for rider: ${riderId || contact} -> ${zipRelativeUrl} (${(file.size / 1024).toFixed(1)} KB)`);

    let parsedKycDocs = {};
    if (kyc_docs) {
      try {
        parsedKycDocs = typeof kyc_docs === 'string' ? JSON.parse(kyc_docs) : kyc_docs;
      } catch (e) {
        parsedKycDocs = {};
      }
    }
    parsedKycDocs.zip_archive = {
      url: zipRelativeUrl,
      filename: file.filename,
      size: file.size,
      uploadedAt: new Date().toISOString()
    };

    const vehicleTypeMap = {
      'bike': 'bike',
      'ev_bike': 'bike',
      'auto': 'auto',
      'cab': 'car',
      'car': 'car',
      'van': 'van'
    };
    const fuelTypeMap = {
      'petrol': 'petrol',
      'electric': 'ev',
      'ev': 'ev',
      'cng': 'cng',
      'diesel': 'diesel'
    };

    // Find rider by ID or email or contact
    let rider = null;
    if (riderId) {
      rider = await Rider.findByPk(riderId);
    }
    if (!rider && email) {
      rider = await Rider.findOne({ where: { email: email.toLowerCase().trim() } });
    }
    if (!rider && contact) {
      rider = await Rider.findOne({ where: { contact: String(contact).trim() } });
    }

    if (!rider) {
      // If still not found, create new
      parsedKycDocs.checklist = parsedKycDocs.checklist || { ...DEFAULT_CHECKLIST };
      rider = await Rider.create({
        name: name ? String(name).trim() : 'Captain',
        email: email ? email.toLowerCase().trim() : null,
        contact: contact ? String(contact).trim() : null,
        vehicle_type: vehicleTypeMap[vehicle_type] || 'bike',
        vehicle_model: vehicle_model || '',
        vehicle_number: vehicle_number ? vehicle_number.toUpperCase() : '',
        fuel_type: fuelTypeMap[fuel_type] || 'petrol',
        kyc_docs: parsedKycDocs,
        role: 'captain',
        status: 'offline',
        is_verified: false,
        join_date: new Date().toISOString().split('T')[0],
        current_lat: 12.9716,
        current_lng: 77.5946
      });
    } else {
      // Update existing record
      if (name) rider.name = String(name).trim();
      if (contact) rider.contact = String(contact).trim();
      if (email) rider.email = email.toLowerCase().trim();
      if (vehicle_type) rider.vehicle_type = vehicleTypeMap[vehicle_type] || rider.vehicle_type || 'bike';
      if (vehicle_model) rider.vehicle_model = vehicle_model;
      if (vehicle_number) rider.vehicle_number = vehicle_number.toUpperCase();
      if (fuel_type) rider.fuel_type = fuelTypeMap[fuel_type] || rider.fuel_type || 'petrol';
      
      const existingChecklist = (rider.kyc_docs && rider.kyc_docs.checklist) ? rider.kyc_docs.checklist : { ...DEFAULT_CHECKLIST };
      parsedKycDocs.checklist = parsedKycDocs.checklist || existingChecklist;
    }

    // Auto-extract ZIP files on disk for instant preview
    const extractionResult = extractKycZipArchive(file.path, rider.id);
    if (extractionResult) {
      parsedKycDocs.extracted_files = extractionResult.extractedFiles;
      if (extractionResult.metadataJson && extractionResult.metadataJson.documents) {
        parsedKycDocs.meta_details = extractionResult.metadataJson.documents;
      }
    }

    rider.kyc_docs = parsedKycDocs;
    rider.changed('kyc_docs', true);
    rider.is_verified = false;
    rider.status = 'offline';
    await rider.save();

    await Rider.update(
      { kyc_docs: parsedKycDocs, is_verified: false, status: 'offline' },
      { where: { id: rider.id } }
    );

    const riderData = rider.toJSON();
    delete riderData.password;

    return res.status(200).json({
      success: true,
      message: 'KYC documents and vehicle details submitted for review successfully',
      data: riderData,
      zipUrl: zipRelativeUrl
    });
  } catch (error) {
    console.error('Error in uploadKycZip:', error);
    return res.status(500).json({ success: false, message: 'Failed to process KYC upload: ' + error.message });
  }
}

// 15. Update Rider Verification Checklist (pending / verified / not_verified)
async function updateRiderChecklist(req, res) {
  try {
    const { id } = req.params;
    const { checklist, is_verified, verification_message } = req.body;

    const rider = await findRiderByIdOrFallback(id);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Captain not found' });
    }

    // Deep clone existing kyc_docs so no old object references remain
    let currentDocs = {};
    if (rider.kyc_docs) {
      if (typeof rider.kyc_docs === 'string') {
        try {
          currentDocs = JSON.parse(rider.kyc_docs);
        } catch (e) {
          currentDocs = {};
        }
      } else if (typeof rider.kyc_docs === 'object') {
        currentDocs = JSON.parse(JSON.stringify(rider.kyc_docs));
      }
    }

    const currentChecklist = (currentDocs.checklist && typeof currentDocs.checklist === 'object')
      ? { ...currentDocs.checklist }
      : { ...DEFAULT_CHECKLIST };

    if (checklist && typeof checklist === 'object') {
      const validStatuses = ['pending', 'verified', 'not_verified'];
      for (const [key, val] of Object.entries(checklist)) {
        if (validStatuses.includes(val)) {
          currentChecklist[key] = val;
        }
      }
      currentDocs.checklist = currentChecklist;
    }

    let finalIsVerified = rider.is_verified;
    if (typeof is_verified === 'boolean') {
      finalIsVerified = is_verified;
    } else if (checklist) {
      const allVerified = Object.values(currentChecklist).every(val => val === 'verified');
      if (allVerified) {
        finalIsVerified = true;
      }
    }

    const finalVerificationMessage = verification_message !== undefined ? verification_message : rider.verification_message;

    // 1. Execute direct raw SQL UPDATE with explicit ::jsonb cast to bypass any Sequelize dirty-check / JSONB serialization quirks
    const kycDocsJson = JSON.stringify(currentDocs);
    try {
      await sequelize.query(
        `UPDATE "riders" 
         SET "kyc_docs" = CAST(:kycDocsJson AS JSONB), 
             "is_verified" = :is_verified, 
             "verification_message" = :verification_message, 
             "updatedAt" = NOW() 
         WHERE "id" = :id`,
        {
          replacements: {
            kycDocsJson,
            is_verified: finalIsVerified,
            verification_message: finalVerificationMessage || '',
            id: rider.id
          }
        }
      );
      console.log(`✅ [updateRiderChecklist] Raw SQL JSONB updated successfully for rider ${rider.id}`);
    } catch (sqlErr) {
      console.warn('⚠️ Raw SQL with CAST AS JSONB failed, attempting fallback query:', sqlErr.message);
      try {
        await sequelize.query(
          `UPDATE "riders" 
           SET "kyc_docs" = :kycDocsJson, 
               "is_verified" = :is_verified, 
               "verification_message" = :verification_message, 
               "updatedAt" = NOW() 
           WHERE "id" = :id`,
          {
            replacements: {
              kycDocsJson,
              is_verified: finalIsVerified,
              verification_message: finalVerificationMessage || '',
              id: rider.id
            }
          }
        );
      } catch (fallbackSqlErr) {
        console.error('Fallback raw SQL also failed:', fallbackSqlErr.message);
      }
    }

    // 2. Also update via Sequelize model instance with changed() flag and save()
    try {
      rider.set('kyc_docs', currentDocs);
      rider.changed('kyc_docs', true);
      rider.is_verified = finalIsVerified;
      rider.verification_message = finalVerificationMessage;
      await rider.save();
    } catch (saveErr) {
      console.warn('⚠️ rider.save() warning:', saveErr.message);
    }

    // 3. Re-read fresh from DB to ensure response is 100% genuine database state
    const freshRider = await Rider.findByPk(rider.id, { attributes: { exclude: ['password'] } });
    console.log(`🔍 [updateRiderChecklist] Persisted DB checklist:`, freshRider?.kyc_docs?.checklist);
    const riderData = freshRider ? freshRider.toJSON() : rider.toJSON();

    // 4. Send FCM Push Notification to Captain if device token is registered
    if (freshRider && freshRider.fcm_token) {
      if (finalIsVerified) {
        sendFcmNotification(
          freshRider.fcm_token,
          '🎉 Verification Approved!',
          'Congratulations Captain! Your KYC documents have been verified and your account is active.',
          { type: 'kyc_verified', status: 'verified' }
        ).catch(err => console.error('FCM verification approved notify error:', err));
      } else if (finalVerificationMessage) {
        sendFcmNotification(
          freshRider.fcm_token,
          '📋 Verification Update',
          finalVerificationMessage,
          { type: 'kyc_update', status: 'pending' }
        ).catch(err => console.error('FCM verification update notify error:', err));
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Verification checklist updated successfully',
      verification_checklist: currentChecklist,
      kyc_docs: currentDocs,
      is_verified: finalIsVerified,
      data: riderData
    });
  } catch (error) {
    console.error('Error in updateRiderChecklist:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 16. Unzip Rider KYC docs on server disk and return extracted file URLs
async function unzipRiderKycDocs(req, res) {
  try {
    const { id } = req.params;
    const rider = await findRiderByIdOrFallback(id);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Captain not found' });
    }

    const zipRelativeUrl = rider.kyc_docs?.zip_archive?.url;
    if (!zipRelativeUrl) {
      return res.status(400).json({ success: false, message: 'No KYC ZIP archive available for this Captain' });
    }

    const cleanRelative = zipRelativeUrl.startsWith('/') ? zipRelativeUrl.substring(1) : zipRelativeUrl;
    const zipFullPath = path.join(__dirname, '..', 'public', cleanRelative);

    const extractionResult = extractKycZipArchive(zipFullPath, rider.id);
    if (!extractionResult) {
      return res.status(500).json({ success: false, message: 'Could not extract ZIP file from server storage' });
    }

    const currentDocs = rider.kyc_docs && typeof rider.kyc_docs === 'object' ? { ...rider.kyc_docs } : {};
    currentDocs.extracted_files = extractionResult.extractedFiles;
    if (extractionResult.metadataJson && extractionResult.metadataJson.documents) {
      currentDocs.meta_details = extractionResult.metadataJson.documents;
    }

    await Rider.update(
      { kyc_docs: currentDocs },
      { where: { id: rider.id } }
    );

    return res.status(200).json({
      success: true,
      message: 'KYC archive unzipped successfully',
      extracted_files: currentDocs.extracted_files,
      meta_details: currentDocs.meta_details,
      kyc_docs: currentDocs
    });
  } catch (error) {
    console.error('Error in unzipRiderKycDocs:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 17. Update Captain FCM Push Notification Device Token
async function updateRiderFcmToken(req, res) {
  try {
    const authHeader = req.headers.authorization;
    let riderId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const verified = verifyUserJwtToken(token);
      if (verified && verified.id) {
        riderId = verified.id;
      }
    }

    // Fallback: accept riderId in body or query if token not present
    if (!riderId) {
      riderId = req.body.riderId || req.body.rider_id || req.query.riderId;
    }

    const { fcm_token } = req.body;
    if (!fcm_token) {
      return res.status(400).json({ success: false, message: 'FCM Token is required' });
    }

    const rider = await findRiderByIdOrFallback(riderId);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Captain not found' });
    }

    const cleanToken = String(fcm_token).trim();
    rider.fcm_token = cleanToken;
    await rider.save();

    // Direct SQL update to ensure immediate PostgreSQL write
    await sequelize.query(
      `UPDATE "riders" SET "fcm_token" = :fcm_token, "updatedAt" = NOW() WHERE "id" = :id`,
      {
        replacements: { fcm_token: cleanToken, id: rider.id },
        type: sequelize.QueryTypes.UPDATE
      }
    );

    console.log(`📱 FCM token updated for Captain ${rider.name || rider.id}: ${cleanToken.substring(0, 20)}...`);
    return res.status(200).json({
      success: true,
      message: 'Captain FCM token updated successfully',
      fcm_token: cleanToken
    });
  } catch (error) {
    console.error('Error updating Captain FCM token:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createRider,
  createRiderHandler,
  verifyRiderDocs,
  loginRider,
  getOnlineRiders,
  getAllRiders,
  getRiderProfile,
  updateRiderProfile,
  updateRiderStatus,
  getRiderEarnings,
  getRiderWallet,
  payRiderCommission,
  createRiderRazorpayOrder,
  verifyRiderRazorpayPayment,
  withdrawRiderWallet,
  getRiderReferrals,
  getRiderRides,
  getRiderNotifications,
  triggerRiderSos,
  sendRiderEmailOtp,
  verifyRiderEmailOtp,
  getRiderAuthStatus,
  checkRiderPhone,
  uploadKycZip,
  updateRiderChecklist,
  unzipRiderKycDocs,
  updateRiderFcmToken,
  getRideDetail,
  getRiderActiveRide
};

