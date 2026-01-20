const User = require('../models/customUserModel');
const { sendFcmNotification } = require('../utils/fcmSender');
const { Op } = require('sequelize');

exports.sendToAllUsers = async (req, res) => {
  try {
    const { title, body, imageUrl, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }

    // 1. Fetch all users with a non-null FCM token
    const users = await User.findAll({
      where: {
        fcm_token: {
          [Op.ne]: null,
          [Op.ne]: ''
        }
      },
      attributes: ['fcm_token']
    });

    // 2. Extract and deduplicate tokens
    const tokens = users
      .map(user => user.fcm_token)
      .filter(t => t && t.trim().length > 0);
    
    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      return res.status(404).json({ success: false, message: 'No users with valid FCM tokens found.' });
    }

    console.log(`📢 Sending broadcast to ${uniqueTokens.length} users...`);

    // 3. Batch tokens (FCM limit is 500 per multicast request)
    const BATCH_SIZE = 500;
    const batchPromises = [];
    
    const notificationData = data || {};
    if (imageUrl) {
        notificationData.image = imageUrl;
    }

    for (let i = 0; i < uniqueTokens.length; i += BATCH_SIZE) {
      const batch = uniqueTokens.slice(i, i + BATCH_SIZE);
      batchPromises.push(sendFcmNotification(batch, title, body, notificationData));
    }

    // 4. Execute batches
    const results = await Promise.all(batchPromises);

    // 5. Calculate stats
    const successCount = results.reduce((acc, res) => acc + (res.response ? res.response.successCount : 0), 0);
    const failureCount = results.reduce((acc, res) => acc + (res.response ? res.response.failureCount : 0), 0);

    res.status(200).json({
      success: true,
      message: `Notification process completed. Sent to ${successCount} devices.`,
      stats: { total: uniqueTokens.length, success: successCount, failure: failureCount }
    });

  } catch (error) {
    console.error('Broadcast Notification Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};