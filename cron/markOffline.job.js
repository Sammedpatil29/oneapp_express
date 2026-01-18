// const cron = require('node-cron');
// const Rider = require('../models/ridersModel'); // or User model

// // Runs EVERY DAY at 12:00 AM
// cron.schedule('0 0 * * *', async () => {
//   try {
//     console.log('⏰ Midnight job started: Marking users offline');

//     const result = await Rider.update(
//       { status: 'offline' },
//       { where: { status: 'online' } }
//     );

//     console.log(`✅ ${result[0]} users marked offline`);
//   } catch (err) {
//     console.error('❌ Cron job failed:', err);
//   }
// }, {
//   timezone: 'Asia/Kolkata'
// });