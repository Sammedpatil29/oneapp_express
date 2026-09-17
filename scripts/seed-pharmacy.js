// scripts/seed-pharmacy.js
require('dotenv').config();
const sequelize = require('../db');
const Medicine = require('../models/medicineModel');
const LabTestPackage = require('../models/labTestModel');
const PharmacyOrder = require('../models/pharmacyOrderModel');
const { seedPharmacy } = require('../controllers/pharmacyController');

async function run() {
  try {
    console.log('🔄 Connecting to PostgreSQL DB...');
    await sequelize.authenticate();
    console.log('✅ DB Connected!');

    console.log('🔄 Syncing Pharmacy tables...');
    await Medicine.sync({ alter: true });
    await LabTestPackage.sync({ alter: true });
    await PharmacyOrder.sync({ alter: true });
    console.log('✅ Tables synced!');

    console.log('🔄 Seeding initial medicines and lab tests into DB...');
    await seedPharmacy();

    const medCount = await Medicine.count();
    const labCount = await LabTestPackage.count();
    console.log(`🎉 DB Verification:`);
    console.log(`   Medicines in DB: ${medCount}`);
    console.log(`   Lab tests in DB: ${labCount}`);

    const sampleMed = await Medicine.findOne();
    console.log(`   Sample medicine: ${sampleMed?.name} (${sampleMed?.id}) - ₹${sampleMed?.price}`);

    const sampleLab = await LabTestPackage.findOne();
    console.log(`   Sample lab test: ${sampleLab?.name} (${sampleLab?.id}) - ₹${sampleLab?.price}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding DB:', err);
    process.exit(1);
  }
}

run();

