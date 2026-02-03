const DineoutOrder = require('../models/dineoutOrderModel');
const Dineout = require('../models/dineoutModel');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const User = require('../models/customUserModel');
const { sendFcmNotification } = require('../utils/fcmSender');

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

exports.calculateBillOffers = async (req, res) => {
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

    const { billAmount, restaurantId, bookingId } = req.body;

    if (!billAmount) {
      return res.status(400).json({ success: false, message: 'Bill amount is required' });
    }

    let restaurant;
    let appliedOffer = null;

    // 2. Fetch Restaurant/Order Data
    if (bookingId) {
      const order = await DineoutOrder.findByPk(bookingId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      restaurant = await Dineout.findByPk(order.restaurant_id);
      appliedOffer = order.offer_applied;
    } else if (restaurantId) {
      restaurant = await Dineout.findByPk(restaurantId);
    } else {
      return res.status(400).json({ success: false, message: 'Restaurant ID or Booking ID is required' });
    }

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const amount = parseFloat(billAmount);
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: 'Invalid bill amount' });
    }

    let bestOffer = null;
    let maxSavings = 0;
    let eligibleOffers = [];

    // Ensure offers is an array
    let offers = Array.isArray(restaurant.offers) ? [...restaurant.offers] : [];

    // If there was a specific offer applied during booking, ensure it's in the list to be checked
    if (appliedOffer) {
      // Logic assumes offers have unique IDs or Titles to check duplicates
      const exists = offers.find(o => 
        (o.id && appliedOffer.id && o.id === appliedOffer.id) || 
        (o.title && appliedOffer.title && o.title === appliedOffer.title)
      );
      if (!exists) {
        offers.push(appliedOffer);
      }
    }

    // 3. Calculation Loop (Updated for your JSON structure)
    for (const offer of offers) {
      // Map JSON keys to variables
      const offerValue = parseFloat(offer.value || 0);
      const minBillAmount = parseFloat(offer.min_bill_amount || 0); // specific key from your JSON
      const maxDiscount = parseFloat(offer.max_discount || 0); // specific key from your JSON
      
      // Normalize type to Uppercase for comparison (FLAT, PERCENT)
      const type = (offer.type || '').toUpperCase(); 

      // Check Eligibility: Bill Amount must be >= Min Bill Amount
      if (amount >= minBillAmount) {
        let savings = 0;

        if (type === 'FLAT') {
          // For FLAT, the savings is the value directly
          savings = offerValue;
        } else if (type === 'PERCENT' || type === 'PERCENTAGE') {
          // For PERCENT, calculate percentage
          savings = (amount * offerValue) / 100;
          
          // Apply Max Discount Cap for percentages if max_discount > 0
          if (maxDiscount > 0 && savings > maxDiscount) {
            savings = maxDiscount;
          }
        }

        // Safety Check: Savings cannot exceed the total bill amount (Bill can't go negative)
        if (savings > amount) {
          savings = amount;
        }

        // Only add to eligible list if there are actual savings
        if (savings > 0) {
          const offerData = {
            ...offer,
            // Convert to numbers for consistency in response
            savings: parseFloat(savings.toFixed(2)),
            finalBill: parseFloat((amount - savings).toFixed(2))
          };
          
          eligibleOffers.push(offerData);

          // Track Best Offer
          if (savings > maxSavings) {
            maxSavings = savings;
            bestOffer = offerData;
          }
        }
      }
    }

    // Sort eligible offers by savings descending (highest savings first)
    eligibleOffers.sort((a, b) => b.savings - a.savings);

    res.status(200).json({
      success: true,
      data: {
        originalAmount: parseFloat(amount.toFixed(2)),
        bestOffer: bestOffer,
        eligibleOffers: eligibleOffers,
        maxSavings: parseFloat(maxSavings.toFixed(2)),
        finalAmount: parseFloat((amount - maxSavings).toFixed(2))
      }
    });

  } catch (error) {
    console.error('Error calculating bill offers:', error);
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
    } else if (order.status === 'REJECTED' || order.status === 'rejected') {
      info = {
        message: 'Bill Rejected!',
        sub: 'Your bill verification failed!',
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
    } else if (order.status === 'COMPLETED') {
        info = {
          message: 'Booking Completed!',
          sub: 'Your booking has been completed!',
          color: 'bg-success',
          icon: 'checkmark-circle',
          billWindow: false
        }
    } else {
        info = {
          message: 'Booking Pending!',
          sub: 'Your booking is pending!',
          color: 'bg-primary',
          icon: 'time-outline',
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

exports.verifyBill = async (req, res) => {
  try {
    // 1. Verify Token (Ideally check for Admin/Manager role here)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // 2. Extract Data
    const { bookingId, status, billAmount } = req.body;

    if (!bookingId || !status) {
      return res.status(400).json({ success: false, message: 'Booking ID and status are required' });
    }

    const order = await DineoutOrder.findByPk(bookingId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // 3. Process Verification
    if (status === 'verified') {
      if (!billAmount) {
        return res.status(400).json({ success: false, message: 'Bill amount is required for verification' });
      }

      const originalAmount = parseFloat(billAmount);
      let discount = 0;

      // Calculate Discount based on offer_applied
      if (order.offer_applied) {
        const offer = order.offer_applied;
        const val = parseFloat(offer.value || offer.amount || offer.discount || 0);
        const type = (offer.type || '').toLowerCase();
        const minBill = parseFloat(offer.min_bill || offer.minBill || offer.min_bill_amount || 0);

        if (originalAmount >= minBill) {
          if (type === 'flat') {
            discount = val;
          } else if (type === 'percent' || type === 'percentage' || (val > 0 && val <= 100)) {
            // Default to percent if type is ambiguous but value is reasonable for a percentage
            discount = (originalAmount * val) / 100;
          }
        }
      }

      // Ensure discount doesn't exceed amount
      if (discount > originalAmount) discount = originalAmount;
      const finalAmount = originalAmount - discount;

      // Update Order with calculations
      order.bill_details = {
        ...order.bill_details,
        grandTotal: finalAmount.toFixed(2), // Update root fields so History API sees the verified cost
        toPay: finalAmount.toFixed(2),
        verification: {
          originalAmount: originalAmount.toFixed(2),
          discount: discount.toFixed(2),
          finalAmount: finalAmount.toFixed(2),
          verifiedAt: new Date()
        }
      };
      order.status = 'COMPLETED';

    } else if (status === 'cancelled' || status === 'rejected') {
      order.status = 'REJECTED';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid status. Use "verified", "cancelled" or "rejected".' });
    }

    await order.save();

    // Send FCM Notification
    try {
      const user = await User.findByPk(order.user_id);
      if (user && user.fcm_token) {
        let title, body;
        if (order.status === 'COMPLETED') {
          title = 'Bill Verified! ✅';
          const savedAmount = order.bill_details?.verification?.discount || '0';
          body = `Your bill has been verified. You saved ₹${savedAmount}!`;
        } else if (order.status === 'REJECTED') {
          title = 'Bill Rejected ❌';
          body = 'Your bill verification was rejected.';
        }

        if (title) await sendFcmNotification(user.fcm_token, title, body);
      }
    } catch (err) { console.error('Notification Error:', err); }

    // 4. Return updated response (reusing getDineoutOrderDetails logic for consistency)
    // We can call the internal logic or just construct the response here.
    // For simplicity, calling the details endpoint logic or reconstructing:
    req.body.orderId = bookingId;
    return exports.getDineoutOrderDetails(req, res);

  } catch (error) {
    console.error('Error verifying bill:', error);
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