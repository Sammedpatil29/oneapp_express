const DineoutOrder = require('../models/dineoutOrderModel');
const Dineout = require('../models/dineoutModel');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

exports.createDineoutOrder = async (req, res) => {
  try {
    // 1. Extract and Verify Token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let userId;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
      userId = decoded.id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // 2. Extract Data from Body
    const {
      restaurantId,
      restaurantName,
      guestCount,
      date,
      timeSlot,
      offerApplied,
      billDetails
    } = req.body;

    // 3. Create Order
    const order = await DineoutOrder.create({
      user_id: userId,
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      guest_count: guestCount,
      booking_date: date,
      time_slot: timeSlot,
      offer_applied: offerApplied,
      bill_details: billDetails,
      status: 'CONFIRMED'
    });

    const restaurant = await Dineout.findByPk(restaurantId);
    const responseData = {
      ...order.toJSON(),
      coords: restaurant ? { lat: restaurant.lat, lng: restaurant.lng } : {},
      contact: restaurant ? restaurant.contact : null
    };

    res.status(201).json({ success: true, message: 'Order placed successfully', data: responseData });
  } catch (error) {
    console.error('Error creating dineout order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadBillImage = async (req, res) => {
  try {
    // 1. Verify Token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let userId;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
      userId = decoded.id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // 2. Extract Data
    const { bookingId, image } = req.body;

    if (!bookingId || !image || !image.base64String) {
      return res.status(400).json({ success: false, message: 'Booking ID and Image data are required' });
    }

    const order = await DineoutOrder.findByPk(bookingId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this order' });
    }

    // 3. Upload to Firebase
    if (admin.apps.length === 0) {
      // Initialize with default credentials (requires GOOGLE_APPLICATION_CREDENTIALS env var or similar config)
      admin.initializeApp();
    }

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      console.log('FIREBASE_STORAGE_BUCKET not found in environment variables');
    }

    const bucket = admin.storage().bucket(bucketName);
    const buffer = Buffer.from(image.base64String, 'base64');
    const filename = `dineout_bills/${bookingId}_${Date.now()}.${image.format || 'jpg'}`;
    const file = bucket.file(filename);

    await file.save(buffer, {
      metadata: { contentType: `image/${image.format || 'jpeg'}` }
    });

    // Get Signed URL (valid for 1 year)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 
    });

    // 4. Update Order
    order.bill_image_url = url;
    order.status = 'verifying';
    await order.save();

    // 5. Response
    const restaurant = await Dineout.findByPk(order.restaurant_id);
    const responseData = {
      ...order.toJSON(),
      billImageUrl: url,
      coords: restaurant ? { lat: restaurant.lat, lng: restaurant.lng } : {},
      contact: restaurant ? restaurant.contact : null,
      info: {
        message: 'Bill Verifying!',
        sub: 'Your bill is being verified!',
        color: 'bg-warning',
        icon: 'close-circle-outline',
        billWindow: true
      }
    };

    res.status(200).json({ success: true, message: 'Bill uploaded successfully', data: responseData });

  } catch (error) {
    console.error('Error uploading bill:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDineoutOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const order = await DineoutOrder.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    let info = {}
    if(order.status === 'CANCELLED'){
      info = {
        message: 'Booking Cancelled!',
        sub: 'Your booking has been cancelled!',
        color: 'bg-danger',
        icon: 'close-circle-outline',
        billWindow: false
      }
    } else if (order.status === 'CONFIRMED') {
      info = {
        message: 'Booking Confirmed!',
        sub: 'Your table is reserved successfully!',
        color: 'bg-success',
        icon: 'checkmark-circle',
        billWindow: true
      }
    } else if (order.status === 'verifying') {
      info = {
        message: 'Bill Verifying!',
        sub: 'Your bill is being verified!',
        color: 'bg-warning',
        icon: 'hourglass-outline',
        billWindow: true
      }
     } else {
        info = {
          message: 'Booking Completed!',
          sub: 'Your booking has been completed!',
          color: 'bg-success',
          icon: 'checkmark-circle',
          billWindow: false
        }
      }

    const restaurant = await Dineout.findByPk(order.restaurant_id);
    const responseData = {
      ...order.toJSON(),
      coords: restaurant ? { lat: restaurant.lat, lng: restaurant.lng } : {},
      contact: restaurant ? restaurant.contact : null,
      info: info
    };

    res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error('Error fetching dineout order details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelDineoutOrder = async (req, res) => {
  try {
    // 1. Verify Token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let userId;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
      userId = decoded.id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // 2. Find and Update Order
    const { orderId } = req.body;
    const order = await DineoutOrder.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this order' });
    }

    order.status = 'CANCELLED';
    await order.save();


    const restaurant = await Dineout.findByPk(order.restaurant_id);
    const responseData = {
      ...order.toJSON(),
      coords: restaurant ? { lat: restaurant.lat, lng: restaurant.lng } : {},
      contact: restaurant ? restaurant.contact : null,
      info: {
        message: 'Booking Cancelled!',
        sub: 'Your booking has been cancelled!',
        color: 'bg-danger',
        icon: 'close-circle-outline',
        billWindow: false
      }
    };

    res.status(200).json({ success: true, message: 'Order cancelled successfully', data: responseData });
  } catch (error) {
    console.error('Error cancelling dineout order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};