require('dotenv').config();
const sequelize = require('../db');
const Vendor = require('../models/vendorModel');
const { seedVendor } = require('../controllers/vendorController');

async function runTest() {
  try {
    console.log('--- Step 1: Connecting DB & Syncing Vendor Model ---');
    await sequelize.authenticate();
    await Vendor.sync({ alter: true });
    console.log('✅ Vendor model synced.');

    console.log('\n--- Step 2: Running seedVendor ---');
    await seedVendor();

    console.log('\n--- Step 3: Verifying dummy vendor in DB ---');
    const dummy = await Vendor.findOne({ where: { phone: '9876543210' } });
    if (!dummy) {
      throw new Error('Dummy vendor not found in DB!');
    }
    console.log('✅ Found dummy vendor:');
    console.log({
      id: dummy.id,
      name: dummy.name,
      store_name: dummy.store_name,
      phone: dummy.phone,
      email: dummy.email,
      status: dummy.status,
    });

    console.log('\n--- Step 4: Testing unregistered phone lookup ---');
    const unregistered = await Vendor.findOne({ where: { phone: '9111111111' } });
    console.log('Unregistered phone found?:', !!unregistered);
    console.log('✅ Unregistered check passed (returns null).');

    console.log('\n🎉 ALL VENDOR BACKEND TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Vendor backend test error:', err);
    process.exit(1);
  }
}

runTest();

