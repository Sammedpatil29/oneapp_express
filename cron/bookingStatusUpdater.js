const { Op } = require('sequelize');
const Booking = require('../models/bookingModel');
const Event = require('../models/eventsModel');

const updatePastBookings = async () => {
  try {
    console.log('⏳ Running job: Checking for past events to mark as completed...');
    
    // Get today's date at 00:00:00 to compare against DATEONLY
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all paid bookings for events that happened before today
    const bookingsToUpdate = await Booking.findAll({
      where: { status: 'paid' },
      include: [{
        model: Event,
        where: {
          date: { [Op.lt]: today } // Event date < today
        },
        required: true // Inner join: only bookings with matching past events
      }]
    });

    if (bookingsToUpdate.length > 0) {
      const ids = bookingsToUpdate.map(b => b.id);
      await Booking.update(
        { status: 'completed' },
        { where: { id: ids } }
      );
      console.log(`✅ Updated ${ids.length} past bookings to 'completed'.`);
    } else {
      console.log('✅ No past bookings found to update.');
    }

    // Check for pending bookings older than 6 hours
    console.log('⏳ Running job: Checking for stale pending bookings...');
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    const stalePendingBookings = await Booking.findAll({
      where: {
        status: 'pending',
        createdAt: { [Op.lt]: sixHoursAgo }
      }
    });

    if (stalePendingBookings.length > 0) {
      const staleIds = stalePendingBookings.map(b => b.id);
      await Booking.update({ status: 'failed' }, { where: { id: staleIds } });
      console.log(`✅ Updated ${staleIds.length} stale pending bookings to 'failed'.`);
    } else {
      console.log('✅ No stale pending bookings found.');
    }
  } catch (error) {
    console.error('❌ Error updating past bookings:', error);
  }
};

module.exports = updatePastBookings;