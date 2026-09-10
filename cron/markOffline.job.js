const cron = require('node-cron');
const Rider = require('../models/ridersModel');

// Runs EVERY DAY at 12:12 AM midnight (Asia/Kolkata)
cron.schedule('12 0 * * *', async () => {
  try {
    console.log('⏰ [12:12 AM Cron] Running midnight job: Marking all online captains offline');

    const result = await Rider.update(
      { status: 'offline' },
      { where: { status: 'online' } }
    );

    console.log(`✅ [12:12 AM Cron] Successfully marked ${result[0]} online captains to offline`);
  } catch (err) {
    console.error('❌ [12:12 AM Cron] Midnight mark-offline job failed:', err);
  }
}, {
  timezone: 'Asia/Kolkata'
});

console.log('🕒 Midnight (12:12 AM) Mark-Offline Cron Job registered.');
