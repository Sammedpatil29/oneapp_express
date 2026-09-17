// controllers/pharmacyController.js
const { Op } = require('sequelize');
const Medicine = require('../models/medicineModel');
const LabTestPackage = require('../models/labTestModel');
const PharmacyOrder = require('../models/pharmacyOrderModel');

// Seed Categories
const MEDICINE_CATEGORIES = [
  { id: 'pain', name: 'Pain Relief', icon: 'fitness-outline', color: '#ef4444' },
  { id: 'fever_cold', name: 'Fever & Cold', icon: 'thermometer-outline', color: '#3b82f6' },
  { id: 'digestion', name: 'Digestive Care', icon: 'nutrition-outline', color: '#10b981' },
  { id: 'vitamins', name: 'Vitamins & Supplements', icon: 'sparkles-outline', color: '#f59e0b' },
  { id: 'first_aid', name: 'First Aid & Antiseptics', icon: 'bandage-outline', color: '#8b5cf6' },
  { id: 'diabetes', name: 'Diabetes Care', icon: 'water-outline', color: '#06b6d4' },
  { id: 'skin', name: 'Skin & Hair', icon: 'heart-outline', color: '#ec4899' },
  { id: 'baby', name: 'Baby & Mother', icon: 'happy-outline', color: '#f97316' },
];

const LAB_CATEGORIES = [
  { id: 'full_body', name: 'Full Body Checkup', icon: 'shield-checkmark-outline', color: '#10b981' },
  { id: 'fever', name: 'Fever & Infection', icon: 'thermometer-outline', color: '#ef4444' },
  { id: 'diabetes', name: 'Diabetes Package', icon: 'water-outline', color: '#06b6d4' },
  { id: 'thyroid', name: 'Thyroid Care', icon: 'pulse-outline', color: '#8b5cf6' },
  { id: 'heart', name: 'Heart & Cholesterol', icon: 'heart-outline', color: '#f43f5e' },
  { id: 'women', name: 'Women Wellness', icon: 'rose-outline', color: '#ec4899' },
  { id: 'senior', name: 'Senior Citizen', icon: 'body-outline', color: '#f59e0b' },
];

// Initial Seed Data: Medicines
const INITIAL_MEDICINES = [
  {
    id: 'med-01',
    name: 'Dolo 650mg Tablet',
    brand: 'Micro Labs',
    dosageForm: 'Tablet',
    packSize: '15 Tablets',
    price: 31,
    mrp: 35,
    discountPercent: 11,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60',
    prescriptionRequired: false,
    category: 'fever_cold',
    inStock: true,
    description: 'Relief from body ache, headache, fever, and common cold symptoms.',
    composition: 'Paracetamol (650mg)',
    manufacturer: 'Micro Labs Ltd.',
    uses: ['Fever', 'Headache', 'Muscle Pain', 'Post Vaccination Fever'],
    benefits: ['Fast temperature reduction within 30 minutes', 'Relieves muscle soreness and headache', 'Gentle on stomach when taken with food'],
    sideEffects: ['Mild nausea (rare)', 'Allergic skin rash (very rare)'],
    directionsForUse: 'Take 1 tablet every 4 to 6 hours as needed with water. Do not exceed 4 tablets in 24 hours unless advised by doctor.',
    safetyAdvice: [
      { topic: 'Alcohol', detail: 'Avoid alcohol consumption while taking paracetamol as it increases liver toxicity risk.', warning: true },
      { topic: 'Pregnancy', detail: 'Generally considered safe during pregnancy when taken at recommended dosage.', warning: false },
      { topic: 'Driving', detail: 'Does not impair driving or machinery operation abilities.', warning: false },
      { topic: 'Kidney / Liver', detail: 'Consult your physician before taking if you have pre-existing liver impairment.', warning: true }
    ],
    seller: { type: 'Pharmacy Partner', name: 'MedPlus Pharmacy' },
    isActive: true,
  },
  {
    id: 'med-02',
    name: 'Crocin 500mg Advanced',
    brand: 'GlaxoSmithKline',
    dosageForm: 'Tablet',
    packSize: '20 Tablets',
    price: 24,
    mrp: 28,
    discountPercent: 14,
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60',
    prescriptionRequired: false,
    category: 'fever_cold',
    inStock: true,
    description: 'Fast acting paracetamol for fever reduction and mild to moderate pain.',
    composition: 'Paracetamol with Optizorb (500mg)',
    manufacturer: 'GlaxoSmithKline Consumer Healthcare',
    uses: ['Fever', 'Toothache', 'Backache', 'Joint Pain'],
    benefits: ['Optizorb technology releases paracetamol 5x faster', 'Clinically proven pain relief', 'Trusted household medicine for generations'],
    sideEffects: ['Nausea', 'Allergic reaction (rare)'],
    directionsForUse: '1 to 2 tablets every 4-6 hours with water. Do not take with other paracetamol containing medicines.',
    safetyAdvice: [
      { topic: 'Alcohol', detail: 'Do not consume with alcohol.', warning: true },
      { topic: 'Pregnancy', detail: 'Safe under medical supervision.', warning: false },
      { topic: 'Driving', detail: 'Safe to drive.', warning: false },
      { topic: 'Kidney / Liver', detail: 'Use caution in patients with hepatic disease.', warning: true }
    ],
    seller: { type: 'Pharmacy Partner', name: 'Apollo Pharmacy' },
    isActive: true,
  },
  {
    id: 'med-03',
    name: 'Digene Antacid Gel Mint',
    brand: 'Abbott',
    dosageForm: 'Syrup',
    packSize: '200 ml Bottle',
    price: 135,
    mrp: 155,
    discountPercent: 13,
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=60',
    prescriptionRequired: false,
    category: 'digestion',
    inStock: true,
    description: 'Effective relief from acidity, heartburn, and stomach gas discomfort.',
    composition: 'Magnesium Hydroxide, Simethicone, Aluminium Hydroxide',
    manufacturer: 'Abbott Healthcare Pvt Ltd',
    uses: ['Acidity', 'Gas', 'Indigestion', 'Heartburn'],
    benefits: ['Neutralizes excess stomach acid in seconds', 'Simethicone relieves painful trapped wind and bloating', 'Sugar-free formula suitable for diabetics'],
    sideEffects: ['Mild chalky taste', 'Slight constipation if overused'],
    directionsForUse: 'Shake bottle well. Take 2 teaspoonfuls (10ml) after meals and at bedtime, or as recommended by doctor.',
    safetyAdvice: [
      { topic: 'Alcohol', detail: 'Limit alcohol as it aggravates stomach acid production.', warning: true },
      { topic: 'Pregnancy', detail: 'Safe when taken in recommended doses.', warning: false },
      { topic: 'Driving', detail: 'No known effect on driving.', warning: false },
      { topic: 'Kidney', detail: 'Patients with severe renal impairment should seek medical advice.', warning: true }
    ],
    seller: { type: 'Pharmacy Partner', name: 'Netmeds Store' },
    isActive: true,
  },
  {
    id: 'med-04',
    name: 'Volini Pain Relief Spray',
    brand: 'Sun Pharma',
    dosageForm: 'Spray',
    packSize: '100 g Can',
    price: 235,
    mrp: 275,
    discountPercent: 15,
    image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop&q=60',
    prescriptionRequired: false,
    category: 'pain',
    inStock: true,
    description: 'Instant and long-lasting relief from back pain, joint stiffness and muscle sprains.',
    composition: 'Diclofenac Diethylamine (1.16%), Methyl Salicylate, Menthol, Linseed Oil',
    manufacturer: 'Sun Pharmaceutical Industries Ltd',
    uses: ['Joint Pain', 'Sprain', 'Back Pain', 'Neck Stiffness'],
    benefits: ['Quick absorbing micro-droplets penetrate deep', 'Cooling menthol sensation followed by soothing warmth', 'Non-greasy, mess-free 360 spray nozzle'],
    sideEffects: ['Mild skin tingling or warmth at application site', 'Redness if skin is broken'],
    directionsForUse: 'Hold can 5 cm away from affected skin and spray 3-4 times daily. Do not apply on open wounds or near eyes.',
    safetyAdvice: [
      { topic: 'Children', detail: 'Not recommended for children under 12 years.', warning: true },
      { topic: 'Skin Care', detail: 'Do not wrap with tight bandage after spraying.', warning: true },
      { topic: 'Inhalation', detail: 'Use in well-ventilated areas. Do not breathe in spray.', warning: true },
      { topic: 'Pregnancy', detail: 'Consult doctor before using in third trimester.', warning: true }
    ],
    seller: { type: 'Pharmacy Partner', name: 'MedPlus Pharmacy' },
    isActive: true,
  },
  {
    id: 'med-05',
    name: 'Electral ORS Powder',
    brand: 'FDC Limited',
    dosageForm: 'Powder',
    packSize: '4x 21.8g Sachet',
    price: 88,
    mrp: 96,
    discountPercent: 8,
    image: 'https://images.unsplash.com/photo-1550572017-ed240d4f20e8?w=500&auto=format&fit=crop&q=60',
    prescriptionRequired: false,
    category: 'digestion',
    inStock: true,
    description: 'WHO recommended formula for dehydration, diarrhea, and electrolyte replenishment.',
    composition: 'Sodium Chloride, Potassium Chloride, Sodium Citrate, Anhydrous Dextrose',
    manufacturer: 'FDC Limited',
    uses: ['Dehydration', 'Electrolytes', 'Energy', 'Heat Exhaustion'],
    benefits: ['Restores critical fluid & electrolyte balance rapidly', 'WHO-formulated glucose-salt ratio promotes rapid hydration', 'Ideal during summer heat, sports fatigue, or illness'],
    sideEffects: ['None when mixed in correct proportion of clean water'],
    directionsForUse: 'Dissolve entire content of one sachet in 1 liter of boiled and cooled water. Consume within 24 hours of preparation.',
    safetyAdvice: [
      { topic: 'Preparation', detail: 'Always use exact volume of water stated. Do not mix with milk or juices.', warning: true },
      { topic: 'Hygiene', detail: 'Keep covered and discard any unused solution after 24 hours.', warning: false },
      { topic: 'Diabetes', detail: 'Contains dextrose; monitor blood glucose levels.', warning: true }
    ],
    seller: { type: 'Pharmacy Partner', name: 'PharmEasy Hub' },
    isActive: true,
  },
  {
    id: 'med-06',
    name: 'Shelcal 500 Calcium & Vit D3',
    brand: 'Torrent Pharma',
    dosageForm: 'Tablet',
    packSize: '15 Tablets',
    price: 118,
    mrp: 138,
    discountPercent: 14,
    image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=500&auto=format&fit=crop&q=60',
    prescriptionRequired: false,
    category: 'vitamins',
    inStock: true,
    description: 'Supports bone strength, calcium absorption, and joint flexibility.',
    composition: 'Elemental Calcium (500mg) + Vitamin D3 (250 IU)',
    manufacturer: 'Torrent Pharmaceuticals Ltd',
    uses: ['Bone Strength', 'Calcium Deficiency', 'Joints', 'Osteoporosis'],
    benefits: ['Prevents bone thinning and strengthens teeth', 'Vitamin D3 enhances calcium absorption in the gut', 'Recommended for adults, pregnant women, and elderly'],
    sideEffects: ['Mild bloating or constipation (take with water)'],
    directionsForUse: '1 tablet daily after main meal or as directed by your physician.',
    safetyAdvice: [
      { topic: 'Timing', detail: 'Best taken after lunch or dinner for maximum calcium absorption.', warning: false },
      { topic: 'Kidney Stones', detail: 'Check with physician if you have history of hypercalcemia or kidney stones.', warning: true },
      { topic: 'Pregnancy', detail: 'Widely prescribed in pregnancy and lactation.', warning: false }
    ],
    seller: { type: 'Pharmacy Partner', name: 'Apollo Pharmacy' },
    isActive: true,
  },
  {
    id: 'med-07',
    name: 'Evion 400 Vitamin E Capsules',
    brand: 'Merck Healthcare',
    dosageForm: 'Capsule',
    packSize: '10 Capsules',
    price: 36,
    mrp: 42,
    discountPercent: 14,
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60',
    prescriptionRequired: false,
    category: 'skin',
    inStock: true,
    description: 'Antioxidant boost for glowing skin, healthy hair growth, and cellular health.',
    composition: 'Tocopheryl Acetate (Vitamin E 400mg)',
    manufacturer: 'Merck Healthcare',
    uses: ['Skin Health', 'Hair Growth', 'Antioxidant', 'Muscle Cramps'],
    benefits: ['Protects cells from oxidative stress and free radicals', 'Nourishes scalp and strengthens hair roots', 'Can be applied topically on face/hair or taken orally'],
    sideEffects: ['Extremely safe; rare mild diarrhea if taken on empty stomach'],
    directionsForUse: 'Take 1 capsule daily after meal with water. For topical use, puncture capsule and apply oil gently.',
    safetyAdvice: [
      { topic: 'Bleeding Disorders', detail: 'High doses may increase bleeding tendency when on blood thinners.', warning: true },
      { topic: 'General Use', detail: 'Safe for daily dietary supplementation.', warning: false }
    ],
    seller: { type: 'Pharmacy Partner', name: 'MedPlus Pharmacy' },
    isActive: true,
  },
  {
    id: 'med-08',
    name: 'Revital H Daily Multivitamin',
    brand: 'Sun Pharma',
    dosageForm: 'Capsule',
    packSize: '30 Capsules',
    price: 295,
    mrp: 350,
    discountPercent: 16,
    image: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=500&auto=format&fit=crop&q=60',
    prescriptionRequired: false,
    category: 'vitamins',
    inStock: true,
    description: 'Ginseng, vitamins and 9 minerals to fight daily fatigue and boost stamina.',
    composition: 'Ginseng Root Extract + 10 Vitamins + 9 Minerals',
    manufacturer: 'Sun Pharmaceutical Industries Ltd',
    uses: ['Stamina', 'Immunity', 'Energy', 'Mental Alertness'],
    benefits: ['Combats afternoon fatigue and daily sluggishness', 'Improves oxygen utilization and concentration', 'Strengthens immune defenses against seasonal illness'],
    sideEffects: ['Mild insomnia if taken late in the evening'],
    directionsForUse: 'Take 1 capsule daily after breakfast or lunch with plenty of water. Avoid taking before sleeping.',
    safetyAdvice: [
      { topic: 'Timing', detail: 'Take in the morning for sustained daytime alertness.', warning: false },
      { topic: 'Hypertension', detail: 'Ginseng may mildly elevate BP; monitor if hypertensive.', warning: true }
    ],
    seller: { type: 'Pharmacy Partner', name: 'Netmeds Store' },
    isActive: true,
  },
  {
    id: 'med-09',
    name: 'Vicks VapoRub Relief Balm',
    brand: 'Procter & Gamble',
    dosageForm: 'Gel',
    packSize: '50 ml Jar',
    price: 148,
    mrp: 165,
    discountPercent: 10,
    image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=500&auto=format&fit=crop&q=60',
    prescriptionRequired: false,
    category: 'fever_cold',
    inStock: true,
    description: '6-in-1 multi-symptom relief from cold, blocked nose, cough, and body aches.',
    composition: 'Menthol (2.82%), Camphor (5.26%), Eucalyptus Oil (1.33%)',
    manufacturer: 'Procter & Gamble Hygiene and Health Care Ltd',
    uses: ['Nasal Congestion', 'Cold', 'Cough', 'Body Ache'],
    benefits: ['Clears blocked airways in as little as 2 minutes', 'Soothing therapeutic vapors last up to 8 hours', 'Suitable for steam inhalation or chest rub'],
    sideEffects: ['Mild skin redness if skin is broken'],
    directionsForUse: 'Apply gently on chest, throat, and back before bedtime. For steam inhalation, add 1-2 teaspoonfuls to hot water.',
    safetyAdvice: [
      { topic: 'Infants', detail: 'Do not use on children under 2 years of age.', warning: true },
      { topic: 'Internal Use', detail: 'For external use or steam inhalation only. Never swallow.', warning: true }
    ],
    seller: { type: 'Pharmacy Partner', name: 'PharmEasy Hub' },
    isActive: true,
  },
  {
    id: 'med-10',
    name: 'Betadine 10% Antiseptic Ointment',
    brand: 'Win-Medicare',
    dosageForm: 'Gel',
    packSize: '20 g Tube',
    price: 110,
    mrp: 125,
    discountPercent: 12,
    image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=60',
    prescriptionRequired: false,
    category: 'first_aid',
    inStock: true,
    description: 'Povidone Iodine ointment for cuts, minor burns, scrapes, and wound infection prevention.',
    composition: 'Povidone Iodine (10% w/w available iodine 1%)',
    manufacturer: 'Win-Medicare Pvt Ltd',
    uses: ['Cuts', 'Burns', 'Wound Disinfection', 'Abrasions'],
    benefits: ['Broad spectrum antimicrobial kills bacteria, viruses, and fungi', 'Golden standard hospital grade antiseptic formula', 'Non-stinging on clean wounds'],
    sideEffects: ['Brown skin staining (washes off easily)', 'Mild skin irritation in iodine-sensitive individuals'],
    directionsForUse: 'Clean affected area thoroughly. Apply a thin layer of ointment directly to wound. Cover with sterile dressing if needed.',
    safetyAdvice: [
      { topic: 'Iodine Allergy', detail: 'Do not use if allergic to iodine.', warning: true },
      { topic: 'Deep Wounds', detail: 'Consult doctor for deep punctures or animal bites.', warning: true }
    ],
    seller: { type: 'Pharmacy Partner', name: 'Apollo Pharmacy' },
    isActive: true,
  },
  {
    id: 'med-11',
    name: 'Azithromycin 500mg (Azithral)',
    brand: 'Alembic Pharma',
    dosageForm: 'Tablet',
    packSize: '5 Tablets',
    price: 115,
    mrp: 132,
    discountPercent: 13,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60',
    prescriptionRequired: true,
    category: 'fever_cold',
    inStock: true,
    description: 'Antibiotic for bacterial respiratory infections, throat, and sinus conditions.',
    composition: 'Azithromycin Dihydrate (500mg)',
    manufacturer: 'Alembic Pharmaceuticals Ltd',
    uses: ['Bacterial Infections', 'Throat Infection', 'Bronchitis', 'Sinusitis'],
    benefits: ['Convenient once-daily dosing course', 'High tissue concentration targets infection directly', 'Broad macrolide antibacterial spectrum'],
    sideEffects: ['Mild stomach discomfort', 'Nausea', 'Loose stools'],
    directionsForUse: 'Take 1 tablet daily 1 hour before or 2 hours after food. Complete the full prescribed course.',
    safetyAdvice: [
      { topic: 'Prescription', detail: 'Schedule H1 prescription drug. Doctor prescription required.', warning: true },
      { topic: 'Course', detail: 'Do not stop midway even if feeling better to avoid antibiotic resistance.', warning: true }
    ],
    seller: { type: 'Pharmacy Partner', name: 'MedPlus Pharmacy' },
    isActive: true,
  },
  {
    id: 'med-12',
    name: 'Metformin 500mg (Glycomet)',
    brand: 'USV Limited',
    dosageForm: 'Tablet',
    packSize: '20 Tablets',
    price: 44,
    mrp: 52,
    discountPercent: 15,
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60',
    prescriptionRequired: true,
    category: 'diabetes',
    inStock: true,
    description: 'Oral anti-diabetic medicine that helps control high blood sugar levels in type 2 diabetes.',
    composition: 'Metformin Hydrochloride (500mg)',
    manufacturer: 'USV Private Limited',
    uses: ['Type 2 Diabetes', 'Blood Sugar Control', 'Insulin Sensitivity'],
    benefits: ['First-line medication globally for type 2 diabetes management', 'Lowers glucose production in liver and improves insulin response', 'Does not cause unexpected sudden hypoglycemia'],
    sideEffects: ['Metformin-related metallic taste', 'Mild stomach upset (prevented by taking with food)'],
    directionsForUse: 'Take with or immediately after meals as directed by your endocrinologist. Swallow whole with water.',
    safetyAdvice: [
      { topic: 'Alcohol', detail: 'Avoid heavy alcohol use to reduce risk of lactic acidosis.', warning: true },
      { topic: 'Kidney Function', detail: 'Periodic kidney function (eGFR/Creatinine) monitoring required.', warning: true }
    ],
    seller: { type: 'Pharmacy Partner', name: 'Apollo Pharmacy' },
    isActive: true,
  }
];

// Initial Seed Data: Lab Tests
const INITIAL_LAB_TESTS = [
  {
    id: 'lab-01',
    name: 'Complete Full Body Checkup Comprehensive',
    category: 'full_body',
    testCount: 78,
    fastingRequirement: '10-12 hrs fasting required',
    sampleType: 'Blood & Urine',
    reportTimeHours: 24,
    price: 899,
    mrp: 2499,
    discountPercent: 64,
    tags: ['Bestseller', 'NABL Accredited', 'Home Sample Pickup'],
    parameters: [
      'Complete Hemogram (CBC - 24 tests)',
      'Liver Function Test (LFT - 12 tests)',
      'Kidney Function Test (KFT - 8 tests)',
      'Lipid Profile (Cholesterol - 8 tests)',
      'Thyroid Profile (T3, T4, TSH)',
      'Blood Sugar Fasting',
      'Urine Routine & Microscopic (21 tests)'
    ],
    description: 'Comprehensive screening for vital organs, immunity, metabolism, diabetes, liver and heart health.',
    recommendedFor: 'Men & Women above 25 years (Annual Checkup)',
    labPartner: { type: 'Lab Partner', name: 'Dr. Lal PathLabs' },
    overview: 'Our premier health checkup evaluates full body functioning including liver enzymes, renal filtration, heart lipid biomarkers, thyroid hormones, blood sugar, and complete blood counts.',
    preparation: [
      'Do not eat or drink anything except plain water for 10-12 hours prior to sample collection.',
      'Avoid heavy exercise and alcoholic beverages the evening before your appointment.',
      'Morning first-void urine sample is recommended for the urine test.'
    ],
    parameterGroups: [
      { groupName: 'Complete Hemogram (24 Tests)', parameters: ['Hemoglobin', 'Platelet Count', 'TLC', 'DLC', 'RBC Indices', 'ESR'] },
      { groupName: 'Liver Function (12 Tests)', parameters: ['Bilirubin Total/Direct', 'SGOT', 'SGPT', 'Alkaline Phosphatase', 'Total Protein', 'Albumin'] },
      { groupName: 'Kidney Function (8 Tests)', parameters: ['Serum Creatinine', 'Blood Urea Nitrogen', 'Uric Acid', 'Electrolytes'] },
      { groupName: 'Heart Lipid Profile (8 Tests)', parameters: ['Total Cholesterol', 'HDL', 'LDL', 'VLDL', 'Triglycerides'] }
    ],
    popular: true,
    homeSamplePickup: true,
    isActive: true,
  },
  {
    id: 'lab-02',
    name: 'Complete Blood Count (CBC) with ESR',
    category: 'fever',
    testCount: 26,
    fastingRequirement: 'No fasting required',
    sampleType: 'Blood',
    reportTimeHours: 8,
    price: 249,
    mrp: 450,
    discountPercent: 45,
    tags: ['Express Report', 'NABL Lab'],
    parameters: [
      'Hemoglobin (Hb)',
      'Total White Blood Cell Count (TLC)',
      'Platelet Count',
      'RBC Count & Indices (MCV, MCH, MCHC)',
      'Differential Leucocyte Count (DLC)',
      'Erythrocyte Sedimentation Rate (ESR)'
    ],
    description: 'Detects anemia, infections, platelet levels, dengue, and underlying inflammation.',
    recommendedFor: 'Fever, fatigue, routine health check',
    labPartner: { type: 'Lab Partner', name: 'SRL Diagnostics' },
    overview: 'CBC provides an exhaustive analysis of red blood cells, white blood cells, and platelets. ESR measures how quickly erythrocytes settle, serving as an indicator of body inflammation.',
    preparation: [
      'No fasting required; can be given at any time of day.',
      'Stay hydrated with plenty of water before phlebotomist arrival.'
    ],
    popular: true,
    homeSamplePickup: true,
    isActive: true,
  },
  {
    id: 'lab-03',
    name: 'Thyroid Profile Total (T3, T4, TSH)',
    category: 'thyroid',
    testCount: 3,
    fastingRequirement: 'No fasting required',
    sampleType: 'Blood',
    reportTimeHours: 12,
    price: 349,
    mrp: 750,
    discountPercent: 53,
    tags: ['Hormone Check', 'Accredited Lab'],
    parameters: [
      'Total Triiodothyronine (T3)',
      'Total Thyroxine (T4)',
      'Thyroid Stimulating Hormone (TSH)'
    ],
    description: 'Assesses thyroid gland function, metabolism, unexplained weight gain or loss, and energy levels.',
    recommendedFor: 'Weight fluctuation, hair loss, fatigue',
    labPartner: { type: 'Lab Partner', name: 'Thyrocare Labs' },
    overview: 'Evaluates hyperthyroidism or hypothyroidism through precise chemiluminescence measurement of thyroid stimulating hormone and hormones T3 & T4.',
    preparation: [
      'Morning sample preferred before taking thyroid medications (take medication after sample collection).'
    ],
    popular: true,
    homeSamplePickup: true,
    isActive: true,
  },
  {
    id: 'lab-04',
    name: 'Lipid Profile (Heart & Cholesterol Screening)',
    category: 'heart',
    testCount: 8,
    fastingRequirement: '10-12 hrs fasting required',
    sampleType: 'Blood',
    reportTimeHours: 12,
    price: 399,
    mrp: 850,
    discountPercent: 53,
    tags: ['Cardio Health', 'Home Collection'],
    parameters: [
      'Total Cholesterol',
      'HDL Cholesterol (Good Cholesterol)',
      'LDL Cholesterol (Bad Cholesterol)',
      'VLDL Cholesterol',
      'Triglycerides',
      'Total / HDL Cholesterol Ratio'
    ],
    description: 'Essential cardiovascular assessment to measure good and bad cholesterol levels in the blood.',
    recommendedFor: 'Adults above 30, high BP, sedentary lifestyle',
    labPartner: { type: 'Lab Partner', name: 'Dr. Lal PathLabs' },
    preparation: [
      'Strict fasting for 10-12 hours required. Water is allowed.'
    ],
    popular: true,
    homeSamplePickup: true,
    isActive: true,
  },
  {
    id: 'lab-05',
    name: 'Diabetes Care Advanced (HbA1c + Fasting Sugar)',
    category: 'diabetes',
    testCount: 4,
    fastingRequirement: '8-10 hrs fasting required',
    sampleType: 'Blood',
    reportTimeHours: 12,
    price: 389,
    mrp: 800,
    discountPercent: 51,
    tags: ['Quarterly Monitor', 'Certified'],
    parameters: [
      'HbA1c (Glycosylated Hemoglobin - 3 Month Average)',
      'Average Estimated Blood Glucose',
      'Fasting Blood Sugar (FBS)',
      'Urine Glucose'
    ],
    description: 'Gold standard test reflecting average blood sugar levels over the last 90 days.',
    recommendedFor: 'Diabetic patients, family history of diabetes',
    labPartner: { type: 'Lab Partner', name: 'Metropolis Healthcare' },
    preparation: [
      'Overnight fasting of 8-10 hours is needed before sample draw.'
    ],
    popular: true,
    homeSamplePickup: true,
    isActive: true,
  },
  {
    id: 'lab-06',
    name: 'Vitamin Deficiency Combo (Vit D & Vit B12)',
    category: 'full_body',
    testCount: 2,
    fastingRequirement: 'No fasting required',
    sampleType: 'Blood',
    reportTimeHours: 24,
    price: 699,
    mrp: 1800,
    discountPercent: 61,
    tags: ['High Demand', 'Immunity & Nerves'],
    parameters: [
      '25-Hydroxy Vitamin D3 Total',
      'Vitamin B12 (Cyanocobalamin)'
    ],
    description: 'Detects bone weakness, nerve tingling, body ache, brain fog, and chronic tiredness.',
    recommendedFor: 'Joint pain, vegetarians, office workers',
    labPartner: { type: 'Lab Partner', name: 'Thyrocare Labs' },
    preparation: [
      'No fasting required.'
    ],
    popular: true,
    homeSamplePickup: true,
    isActive: true,
  },
  {
    id: 'lab-07',
    name: 'Liver Function Test (LFT Profile)',
    category: 'full_body',
    testCount: 11,
    fastingRequirement: 'No fasting required',
    sampleType: 'Blood',
    reportTimeHours: 12,
    price: 420,
    mrp: 850,
    discountPercent: 51,
    tags: ['Digestive Health', 'Enzyme Screen'],
    parameters: [
      'Bilirubin Total, Direct & Indirect',
      'SGOT / AST',
      'SGPT / ALT',
      'Alkaline Phosphatase (ALP)',
      'Total Protein & Albumin / Globulin Ratio'
    ],
    description: 'Measures liver enzymes, bilirubin, and proteins to diagnose liver inflammation or fatty liver.',
    recommendedFor: 'Digestive issues, jaundice symptoms, medication monitor',
    labPartner: { type: 'Lab Partner', name: 'SRL Diagnostics' },
    preparation: [
      'Overnight fasting of 8 hours recommended for most accurate results.'
    ],
    popular: false,
    homeSamplePickup: true,
    isActive: true,
  },
  {
    id: 'lab-08',
    name: 'Kidney Function Test (KFT Profile)',
    category: 'full_body',
    testCount: 8,
    fastingRequirement: 'No fasting required',
    sampleType: 'Blood',
    reportTimeHours: 12,
    price: 399,
    mrp: 800,
    discountPercent: 50,
    tags: ['Renal Health', 'Electrolytes'],
    parameters: [
      'Blood Urea Nitrogen (BUN)',
      'Serum Creatinine',
      'Uric Acid',
      'Calcium',
      'Phosphorus',
      'Sodium, Potassium, Chloride Electrolytes'
    ],
    description: 'Evaluates kidney filtration, waste removal, creatinine levels, and body hydration balance.',
    recommendedFor: 'High BP, swelling in feet, routine screening',
    labPartner: { type: 'Lab Partner', name: 'Metropolis Healthcare' },
    preparation: [
      'No fasting required. Maintain normal water intake.'
    ],
    popular: false,
    homeSamplePickup: true,
    isActive: true,
  }
];

/**
 * Auto-Seed database on server initialization if tables are empty
 */
async function seedPharmacy() {
  try {
    const medCount = await Medicine.count();
    if (medCount === 0) {
      await Medicine.bulkCreate(INITIAL_MEDICINES);
      console.log(`✅ Seeded ${INITIAL_MEDICINES.length} initial medicines successfully.`);
    }

    const labCount = await LabTestPackage.count();
    if (labCount === 0) {
      await LabTestPackage.bulkCreate(INITIAL_LAB_TESTS);
      console.log(`✅ Seeded ${INITIAL_LAB_TESTS.length} initial lab test packages successfully.`);
    }
  } catch (err) {
    console.warn('⚠️ Pharmacy auto-seed notice:', err.message);
  }
}

/**
 * GET /api/pharmacy/medicines
 */
async function getAllMedicines(req, res) {
  try {
    const { category, search, inStock, requiresPrescription, limit = 50, offset = 0 } = req.query;

    const where = { isActive: true };

    if (category && category !== 'all') {
      where.category = category;
    }

    if (inStock !== undefined) {
      where.inStock = inStock === 'true';
    }

    if (requiresPrescription !== undefined) {
      where.prescriptionRequired = requiresPrescription === 'true';
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: q } },
        { brand: { [Op.iLike]: q } },
        { composition: { [Op.iLike]: q } },
        { description: { [Op.iLike]: q } },
      ];
    }

    const medicines = await Medicine.findAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['id', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      count: medicines.length,
      data: medicines
    });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching medicines', error: error.message });
  }
}

/**
 * GET /api/pharmacy/medicines/:id
 */
async function getMedicineById(req, res) {
  try {
    const { id } = req.params;
    const medicine = await Medicine.findByPk(id);

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    return res.status(200).json({ success: true, data: medicine });
  } catch (error) {
    console.error('Error fetching medicine details:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching medicine details', error: error.message });
  }
}

/**
 * GET /api/pharmacy/lab-tests
 */
async function getAllLabTests(req, res) {
  try {
    const { category, search, popular, limit = 50, offset = 0 } = req.query;

    const where = { isActive: true };

    if (category && category !== 'all') {
      where.category = category;
    }

    if (popular !== undefined) {
      where.popular = popular === 'true';
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: q } },
        { description: { [Op.iLike]: q } },
        { recommendedFor: { [Op.iLike]: q } },
      ];
    }

    const tests = await LabTestPackage.findAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['id', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      count: tests.length,
      data: tests
    });
  } catch (error) {
    console.error('Error fetching lab tests:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching lab tests', error: error.message });
  }
}

/**
 * GET /api/pharmacy/lab-tests/:id
 */
async function getLabTestById(req, res) {
  try {
    const { id } = req.params;
    const labTest = await LabTestPackage.findByPk(id);

    if (!labTest) {
      return res.status(404).json({ success: false, message: 'Lab test package not found' });
    }

    return res.status(200).json({ success: true, data: labTest });
  } catch (error) {
    console.error('Error fetching lab test details:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching lab test details', error: error.message });
  }
}

/**
 * GET /api/pharmacy/categories
 */
async function getCategories(req, res) {
  try {
    return res.status(200).json({
      success: true,
      data: {
        medicineCategories: MEDICINE_CATEGORIES,
        labCategories: LAB_CATEGORIES,
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching categories' });
  }
}

/**
 * POST /api/pharmacy/orders
 */
async function createOrder(req, res) {
  try {
    const {
      orderType = 'medicine', // 'medicine' | 'lab_test'
      userId,
      items = [],
      billSummary = {},
      deliveryAddress,
      patientDetails,
      prescriptionUrl,
      paymentMethod = 'cash_on_delivery',
      notes
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
    }

    // Generate readable order ID
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderId = orderType === 'lab_test' ? `LAB-${randomSuffix}` : `ORD-MED-${randomSuffix}`;

    const newOrder = await PharmacyOrder.create({
      id: orderId,
      orderType,
      userId: userId || null,
      items,
      billSummary,
      deliveryAddress: deliveryAddress || null,
      patientDetails: patientDetails || null,
      prescriptionUrl: prescriptionUrl || null,
      status: 'placed',
      paymentMethod,
      paymentStatus: paymentMethod === 'online' ? 'completed' : 'pending',
      deliveryTimeMinutes: orderType === 'medicine' ? 15 : 0,
      notes: notes || null,
    });

    return res.status(201).json({
      success: true,
      message: orderType === 'lab_test' ? 'Lab test booked successfully' : 'Medicine order placed successfully',
      data: newOrder
    });
  } catch (error) {
    console.error('Error creating pharmacy order:', error);
    return res.status(500).json({ success: false, message: 'Server error placing order', error: error.message });
  }
}

/**
 * GET /api/pharmacy/orders
 */
async function getUserOrders(req, res) {
  try {
    const { userId, orderType } = req.query;
    const where = {};

    if (userId) {
      where.userId = userId;
    }
    if (orderType) {
      where.orderType = orderType;
    }

    const orders = await PharmacyOrder.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching pharmacy orders:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching orders', error: error.message });
  }
}

/**
 * GET /api/pharmacy/orders/:id
 */
async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const order = await PharmacyOrder.findByPk(id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching order details:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching order', error: error.message });
  }
}

module.exports = {
  seedPharmacy,
  getAllMedicines,
  getMedicineById,
  getAllLabTests,
  getLabTestById,
  getCategories,
  createOrder,
  getUserOrders,
  getOrderById,
};

