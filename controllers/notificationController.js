const User = require('../models/customUserModel');
const { sendFcmNotification } = require('../utils/fcmSender');
const { Op } = require('sequelize');
const Notification = require('../models/notificationModel');

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

exports.createNotification = async (req, res) => {
  try {
    const notification = await Notification.create(req.body);
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, message: 'Failed to create notification', error: error.message });
  }
};

exports.seedNotifications = async (req, res) => {
  try {
    const notificationsData = req.body;
    if (!Array.isArray(notificationsData)) {
      return res.status(400).json({ success: false, message: 'Input must be an array' });
    }
    const notifications = await Notification.bulkCreate(notificationsData);
    res.status(201).json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    console.error('Error bulk creating notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to seed notifications', error: error.message });
  }
};

exports.getAllNotifications = async (req, res) => {
  try {
    const whereClause = {};
    if (req.query.active) {
      whereClause.is_active = req.query.active === 'true';
    }
    const notifications = await Notification.findAll({ where: whereClause, order: [['createdAt', 'DESC']] });
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: error.message });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error('Error fetching notification by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notification', error: error.message });
  }
};

exports.updateNotification = async (req, res) => {
  try {
    const [updated] = await Notification.update(req.body, { where: { id: req.params.id } });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found or no changes made' });
    }
    const updatedNotification = await Notification.findByPk(req.params.id);
    res.status(200).json({ success: true, data: updatedNotification });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification', error: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const deleted = await Notification.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.status(200).json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notification', error: error.message });
  }
};