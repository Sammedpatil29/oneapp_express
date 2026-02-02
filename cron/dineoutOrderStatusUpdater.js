const { Op } = require('sequelize');
const DineoutOrder = require('../models/dineoutOrderModel');

const updateStaleDineoutOrders = async () => {
  console.log('⏳ Running job: Checking for stale confirmed dineout bookings...');
  try {
    const confirmedOrders = await DineoutOrder.findAll({
      where: { status: 'CONFIRMED' }
    });

    if (confirmedOrders.length === 0) {
      console.log('✅ No confirmed dineout bookings to check.');
      return;
    }

    const now = new Date();
    const ordersToCancel = [];

    for (const order of confirmedOrders) {
      const { booking_date, time_slot } = order;

      // --- Parse time_slot (e.g., "07:00 PM") ---
      const [time, modifier] = time_slot.split(' ');
      let [hours, minutes] = time.split(':');
      hours = parseInt(hours, 10);

      if (modifier.toUpperCase() === 'PM' && hours < 12) {
        hours += 12;
      }
      if (modifier.toUpperCase() === 'AM' && hours === 12) {
        hours = 0; // Midnight case
      }
      // --- End of time parsing ---

      // Construct a full Date object for the booking
      const bookingDateTime = new Date(`${booking_date}T${hours.toString().padStart(2, '0')}:${minutes}:00`);
      
      // Check if the booking time is valid
      if (isNaN(bookingDateTime.getTime())) {
          console.warn(`Skipping order ${order.id} due to invalid date/time format: ${booking_date} ${time_slot}`);
          continue;
      }

      // Calculate the time limit (24 hours after the booking)
      const timeLimit = new Date(bookingDateTime.getTime() + 24 * 60 * 60 * 1000);

      // If 'now' is past the time limit, mark for cancellation
      if (now > timeLimit) {
        ordersToCancel.push(order.id);
      }
    }

    if (ordersToCancel.length > 0) {
      await DineoutOrder.update(
        { status: 'CANCELLED' },
        { where: { id: { [Op.in]: ordersToCancel } } }
      );
      console.log(`✅ Cancelled ${ordersToCancel.length} stale dineout bookings.`);
    } else {
      console.log('✅ No stale dineout bookings found to cancel.');
    }

  } catch (error) {
    console.error('❌ Error in dineout status updater cron job:', error);
  }
};

module.exports = updateStaleDineoutOrders;