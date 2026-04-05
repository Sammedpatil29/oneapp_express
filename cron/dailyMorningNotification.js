const cron = require('node-cron');
const { Op } = require('sequelize');
const User = require('../models/customUserModel');
const { sendFcmNotification } = require('../utils/fcmSender');

const startMorningNotificationJob = () => {
  // Schedule task to run every day at 8:00 AM
  // Cron format: Minute Hour DayMonth Month DayWeek
  cron.schedule('0 8 * * *', async () => {
    console.log('☀️ Running daily morning notification job...');
    try {
      // 1. Fetch users with valid FCM tokens
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
        console.log('⚠️ No users with FCM tokens found for morning notification.');
        return;
      }

      console.log(`📢 Sending morning notification to ${uniqueTokens.length} users...`);

      // 3. Define Message
      const title = "Good Morning! ☀️";
      const body = "Check out the latest offers and updates on Pintu - Minutes App, today!";

      // 4. Send in batches (FCM multicast limit is 500)
      const BATCH_SIZE = 500;
      for (let i = 0; i < uniqueTokens.length; i += BATCH_SIZE) {
        const batch = uniqueTokens.slice(i, i + BATCH_SIZE);
        await sendFcmNotification(batch, title, body);
      }

      console.log(`✅ Morning notification process completed.`);
    } catch (error) {
      console.error('❌ Error in daily morning notification job:', error);
    }
  }, {
    timezone: "Asia/Kolkata" // Adjust to your target timezone
  });
};

module.exports = startMorningNotificationJob;