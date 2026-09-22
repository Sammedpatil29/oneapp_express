// controllers/vendorRegistrationController.js
const VendorRegistration = require('../models/vendorRegistrationModel');
const Vendor = require('../models/vendorModel');
const ServiceArea = require('../models/serviceAreaModel');
const Service = require('../models/Services');
const { sendEmailUtility } = require('./emailController');

// In-memory OTP storage: email -> { otp, expiresAt, attempts }
const regOtpStore = new Map();

/**
 * Utility to mask email for display
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  if (name.length <= 3) {
    return `${name.charAt(0)}***@${domain}`;
  }
  const start = name.slice(0, 2);
  const end = name.slice(-2);
  return `${start}***${end}@${domain}`;
}

/**
 * 1. Send OTP for Vendor Registration
 * POST /api/vendor/register/send-otp
 * Body: { email: "owner@store.com" }
 */
async function sendRegistrationOtp(req, res) {
  try {
    const rawEmail = req.body.email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid email address is required',
      });
    }

    const cleanEmail = rawEmail.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email format',
      });
    }

    // Check if email already belongs to an existing vendor account
    const existingVendor = await Vendor.findOne({ where: { email: cleanEmail } });
    if (existingVendor) {
      return res.status(409).json({
        success: false,
        alreadyRegistered: true,
        message: `This email is already associated with store "${existingVendor.store_name}". Please sign in to your merchant dashboard.`,
      });
    }

    // Check if application has already been submitted and is pending review
    const submittedReg = await VendorRegistration.findOne({
      where: {
        email: cleanEmail,
        status: ['submitted', 'approved']
      }
    });
    if (submittedReg) {
      return res.status(409).json({
        success: false,
        alreadyRegistered: true,
        message: `An onboarding application with this email has already been submitted for store "${submittedReg.store_name}" and is currently under review.`,
      });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    regOtpStore.set(cleanEmail, {
      otp,
      expiresAt,
      attempts: 0,
    });

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 50px; height: 50px; line-height: 50px; border-radius: 14px; background: linear-gradient(135deg, #a000e2 0%, #7900b2 100%); color: #ffffff; font-size: 26px; font-weight: 800; margin-bottom: 8px;">
            P
          </div>
          <h2 style="color: #a000e2; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Pintu Partner Onboarding</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Merchant Store Registration</p>
        </div>

        <p style="font-size: 15px; color: #1e293b; margin-bottom: 8px; font-weight: 600;">Welcome to Pintu Partner Network!</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
          Use the 6-digit verification code below to verify your email and start or resume your merchant store registration.
        </p>

        <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 2px dashed #a000e2; border-radius: 16px; padding: 22px 20px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 700; color: #a000e2; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Your Registration OTP</div>
          <span style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #680096; font-family: monospace;">${otp}</span>
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 14px 16px; margin-bottom: 24px;">
          <div style="font-size: 12.5px; color: #64748b; line-height: 1.5;">
            ⏱️ Code is valid for <strong>10 minutes</strong>. If you did not initiate this request, you can safely ignore this email.
          </div>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
          <p style="font-size: 11.5px; color: #cbd5e1; margin: 0;">© 2026 Pintu Technologies Pvt Ltd. All rights reserved.</p>
        </div>
      </div>
    `;

    const emailResult = await sendEmailUtility(cleanEmail, `Your Pintu Vendor Registration Code: ${otp}`, htmlBody);
    console.log(`✉️ [REGISTRATION OTP] Sent to: ${cleanEmail} | OTP: ${otp} | Sent: ${emailResult?.success}`);

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${maskEmail(cleanEmail)}`,
      email: cleanEmail,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (error) {
    console.error('Error in sendRegistrationOtp:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP: ' + error.message,
    });
  }
}

/**
 * 2. Verify Registration OTP and Check for Existing Draft
 * POST /api/vendor/register/verify-otp
 * Body: { email: "owner@store.com", otp: "123456" }
 */
async function verifyRegistrationOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    const record = regOtpStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP found for this email or code expired. Please request a new code.',
      });
    }

    if (Date.now() > record.expiresAt) {
      regOtpStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    if (record.otp !== cleanOtp) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= 5) {
        regOtpStore.delete(cleanEmail);
        return res.status(429).json({
          success: false,
          message: 'Too many incorrect attempts. Please request a new OTP.',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check your inbox and try again.',
      });
    }

    // OTP matched successfully -> consume OTP
    regOtpStore.delete(cleanEmail);

    // Look for existing draft registration
    const existingDraft = await VendorRegistration.findOne({
      where: { email: cleanEmail, status: 'draft' },
    });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      email: cleanEmail,
      hasDraft: !!existingDraft,
      draft: existingDraft ? {
        id: existingDraft.id,
        email: existingDraft.email,
        phone: existingDraft.phone,
        name: existingDraft.name,
        store_name: existingDraft.store_name,
        category: existingDraft.category,
        service_type: existingDraft.service_type || existingDraft.category || 'grocery',
        city: existingDraft.city,
        address: existingDraft.address,
        pincode: existingDraft.pincode,
        fssai_number: existingDraft.fssai_number,
        gst_number: existingDraft.gst_number,
        pan_number: existingDraft.pan_number,
        license_number: existingDraft.license_number,
        documents: existingDraft.documents || {},
        bank_details: existingDraft.bank_details || {},
        draft_data: existingDraft.draft_data || {},
        step: existingDraft.step || 1,
        status: existingDraft.status,
        updatedAt: existingDraft.updatedAt,
      } : null,
    });
  } catch (error) {
    console.error('Error in verifyRegistrationOtp:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying OTP: ' + error.message,
    });
  }
}

/**
 * Check Phone Number Availability
 * GET /api/vendor/register/check-phone?phone=...&email=...
 */
async function checkPhoneAvailability(req, res) {
  try {
    const rawPhone = req.query.phone || req.body.phone;
    const currentEmail = (req.query.email || req.body.email || '').toLowerCase().trim();

    if (!rawPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Phone number must be exactly 10 digits',
      });
    }

    // 1. Check if phone is registered to any Vendor
    const existingVendor = await Vendor.findOne({ where: { phone: cleanPhone } });
    if (existingVendor) {
      if (!currentEmail || existingVendor.email.toLowerCase().trim() !== currentEmail) {
        return res.status(200).json({
          success: true,
          available: false,
          message: `This phone number (+91 ${cleanPhone}) is already associated with vendor store "${existingVendor.store_name}". Please sign in or use another number.`,
        });
      }
    }

    // 2. Check if phone is linked to a submitted application
    const existingReg = await VendorRegistration.findOne({
      where: {
        phone: cleanPhone,
        status: ['submitted', 'approved'],
      },
    });

    if (existingReg && (!currentEmail || existingReg.email.toLowerCase().trim() !== currentEmail)) {
      return res.status(200).json({
        success: true,
        available: false,
        message: `This phone number (+91 ${cleanPhone}) is already linked to a submitted application for store "${existingReg.store_name}".`,
      });
    }

    return res.status(200).json({
      success: true,
      available: true,
      message: 'Phone number is available',
    });
  } catch (error) {
    console.error('Error in checkPhoneAvailability:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify phone availability: ' + error.message,
    });
  }
}

/**
 * Get Dynamic Onboarding Metadata (Active Service Areas, Services & Tailored Document Schemas)
 * GET /api/vendor/register/metadata
 */
async function getRegistrationMetadata(req, res) {
  try {
    // 1. Service Areas / Cities from database
    let dbCities = [];
    try {
      const areas = await ServiceArea.findAll({
        where: { isActive: true },
        order: [['cityName', 'ASC']],
      });
      dbCities = areas.map((a) => a.cityName).filter(Boolean);
    } catch (e) {
      console.warn('Could not query ServiceArea:', e.message);
    }

    const defaultCities = ['Bengaluru', 'Hubballi', 'Dharwad', 'Belagavi', 'Athani', 'Jamkhandi'];
    const mergedCities = Array.from(new Set([...dbCities, ...defaultCities])).sort();

    // 2. Detailed Service Taxonomy with service-tailored regulatory documents
    const services = [
      {
        id: 'pharmacy',
        category: 'pharmacy',
        title: 'Pharmacy & Medicines',
        subtitle: 'Retail pharmacy, prescription drugs, OTC healthcare & wellness supplies',
        icon: 'medkit-outline',
        description: 'For licensed retail chemists, medical stores and pharmacies.',
        documents: [
          {
            key: 'drug_license_no',
            label: 'Drug License Number (Form 20 / 21)',
            placeholder: 'e.g. KA-DH-2024-DL-8812',
            required: true,
            helpText: 'Mandatory license issued under Drugs and Cosmetics Act for allopathic medicine sales.',
          },
          {
            key: 'pharmacist_name',
            label: 'Registered Pharmacist Full Name',
            placeholder: 'e.g. Anand Kulkarni',
            required: true,
            helpText: 'Full name of certified pharmacist registered in State Pharmacy Council.',
          },
          {
            key: 'pharmacist_reg_no',
            label: 'Pharmacist Council Reg. Number',
            placeholder: 'e.g. KSPC/2019/54821',
            required: true,
            helpText: 'Registration certificate number issued by the State Pharmacy Council.',
          },
          {
            key: 'gst_number',
            label: 'GSTIN Number',
            placeholder: '15-digit GSTIN (e.g. 29ABCDE1234F1Z5)',
            required: true,
            pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
            helpText: 'Mandatory GST identification number for pharmaceutical distribution.',
          },
        ],
      },
      {
        id: 'lab_test',
        category: 'healthcare',
        title: 'Diagnostics & Pathology Lab',
        subtitle: 'Clinical blood tests, health packages, pathology & diagnostic home collection',
        icon: 'flask-outline',
        description: 'For pathology laboratories, diagnostic test centers and scan facilities.',
        documents: [
          {
            key: 'clinical_establishment_no',
            label: 'Clinical Establishment Act License',
            placeholder: 'e.g. CEA/KA/2023/1109',
            required: true,
            helpText: 'State Clinical Establishments (Registration & Regulation) certificate.',
          },
          {
            key: 'pathologist_name',
            label: 'Consulting Pathologist / Lab Director',
            placeholder: 'Dr. Pathologist / Biochemist Name',
            required: true,
            helpText: 'Supervising MD Pathologist or authorized lab director.',
          },
          {
            key: 'pathologist_reg_no',
            label: 'Medical Council Reg. Number of Pathologist',
            placeholder: 'e.g. KMC/2015/8834',
            required: true,
            helpText: 'State Medical Council / NMC doctor registration number.',
          },
          {
            key: 'bmw_number',
            label: 'Bio-Medical Waste (BMW) Authorization No.',
            placeholder: 'e.g. BMW/PCB/2024/772',
            required: true,
            helpText: 'Pollution Control Board bio-medical waste disposal authorization.',
          },
          {
            key: 'nabl_number',
            label: 'NABL Accreditation Number (Optional)',
            placeholder: 'e.g. NABL-MC-2024-512',
            required: false,
            helpText: 'Quality accreditation number if your laboratory is NABL certified.',
          },
          {
            key: 'gst_number',
            label: 'GSTIN Number',
            placeholder: '15-digit GSTIN',
            required: true,
          },
        ],
      },
      {
        id: 'doctor',
        category: 'healthcare',
        title: 'Doctor & Medical Clinic',
        subtitle: 'Doctor consultations, clinic appointments, OPD care & patient diagnosis',
        icon: 'pulse-outline',
        description: 'For registered medical practitioners, specialized doctors and polyclinics.',
        documents: [
          {
            key: 'medical_council_no',
            label: 'State Medical Council (SMC) / NMC Reg. No.',
            placeholder: 'e.g. KMC/2012/48192',
            required: true,
            helpText: 'Doctor registration certificate from National Medical Commission / State Council.',
          },
          {
            key: 'medical_degree',
            label: 'Highest Medical Degree & Specialization',
            placeholder: 'e.g. MBBS, MD (General Medicine), MS (Ortho)',
            required: true,
            helpText: 'Recognized medical degrees and clinical specializations.',
          },
          {
            key: 'clinic_reg_no',
            label: 'Clinic / Establishment Reg. Number (Optional)',
            placeholder: 'e.g. CLN/2022/9401 (leave blank if independent)',
            required: false,
            helpText: 'Local municipal or Clinical Establishment registration if consulting at own clinic.',
          },
          {
            key: 'pan_number',
            label: 'Doctor / Clinic PAN Card',
            placeholder: '10-digit PAN (e.g. ABCDE1234F)',
            required: true,
            pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
            helpText: 'Personal or clinic entity PAN card for tax compliance and payouts.',
          },
        ],
      },
      {
        id: 'restaurant',
        category: 'food',
        title: 'Food, Restaurant & Dineout',
        subtitle: 'Restaurants, cafes, cloud kitchens, fast food, bakeries & dining spots',
        icon: 'restaurant-outline',
        description: 'For dining establishments, cloud kitchens and commercial food makers.',
        documents: [
          {
            key: 'fssai_number',
            label: 'FSSAI Food License Number (14 Digits)',
            placeholder: '14-digit FSSAI License',
            required: true,
            pattern: '^[0-9]{14}$',
            helpText: 'Mandatory 14-digit FSSAI license under Food Safety and Standards Act.',
          },
          {
            key: 'trade_license_no',
            label: 'Municipal Trade License / Eating House No.',
            placeholder: 'e.g. TL/MUN/2023/5102',
            required: true,
            helpText: 'Municipal Corporation Trade License for food and beverage outlet.',
          },
          {
            key: 'pan_number',
            label: 'Business / Proprietor PAN Card',
            placeholder: '10-digit PAN',
            required: true,
            pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
          },
          {
            key: 'gst_number',
            label: 'GSTIN Number (Optional if below threshold)',
            placeholder: '15-digit GSTIN',
            required: false,
          },
        ],
      },
      {
        id: 'grocery',
        category: 'daily needs',
        title: 'Grocery & Supermarket',
        subtitle: 'Daily essentials, FMCG, fresh fruits, vegetables & packaged provisions',
        icon: 'basket-outline',
        description: 'For supermarkets, kirana stores, marts and provision stores.',
        documents: [
          {
            key: 'fssai_number',
            label: 'FSSAI Registration Number (14 Digits)',
            placeholder: '14-digit FSSAI Number',
            required: true,
            pattern: '^[0-9]{14}$',
            helpText: 'Mandatory FSSAI registration for selling edible provisions and packaged foods.',
          },
          {
            key: 'trade_license_no',
            label: 'Shop & Establishment Act Certificate / Gumasta',
            placeholder: 'e.g. SE/ACT/2022/8812',
            required: true,
            helpText: 'State Shop and Commercial Establishment registration certificate.',
          },
          {
            key: 'pan_number',
            label: 'Business / Proprietor PAN Card',
            placeholder: '10-digit PAN',
            required: true,
            pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
          },
          {
            key: 'gst_number',
            label: 'GSTIN Number (Optional)',
            placeholder: '15-digit GSTIN',
            required: false,
          },
        ],
      },
      {
        id: 'property',
        category: 'real estate',
        title: 'Properties & Real Estate',
        subtitle: 'Commercial properties, residential rentals, lands & verified broker listings',
        icon: 'business-outline',
        description: 'For certified real estate brokers, property managers and agencies.',
        documents: [
          {
            key: 'rera_number',
            label: 'RERA Agent / Agency Registration Number',
            placeholder: 'e.g. PRM/KA/RERA/1251/308/AG/2401',
            required: true,
            helpText: 'Mandatory Real Estate Regulatory Authority (RERA) agent registration.',
          },
          {
            key: 'pan_number',
            label: 'Proprietor / Agency PAN Card',
            placeholder: '10-digit PAN',
            required: true,
            pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
          },
          {
            key: 'gst_number',
            label: 'GSTIN Number (Optional)',
            placeholder: '15-digit GSTIN',
            required: false,
          },
        ],
      },
      {
        id: 'store',
        category: 'retail',
        title: 'Retail & Specialty Store',
        subtitle: 'Fashion, electronics, mobile accessories, books, gifts & stationery',
        icon: 'bag-handle-outline',
        description: 'For general retail stores selling physical non-food goods.',
        documents: [
          {
            key: 'trade_license_no',
            label: 'Shop & Commercial Establishment Registration',
            placeholder: 'e.g. SE/REG/2023/4491',
            required: true,
            helpText: 'State Shop & Establishment certificate or municipal trade license.',
          },
          {
            key: 'pan_number',
            label: 'Proprietor / Business PAN Card',
            placeholder: '10-digit PAN',
            required: true,
            pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
          },
          {
            key: 'gst_number',
            label: 'GSTIN Number (Optional if exempt)',
            placeholder: '15-digit GSTIN',
            required: false,
          },
        ],
      },
    ];

    return res.status(200).json({
      success: true,
      cities: mergedCities,
      services,
      singleStorePolicy: {
        maxInitialStores: 1,
        title: 'Initial Primary Store Onboarding',
        message: 'You are registering your 1st primary store location. Once your account is verified and approved, you can add and manage multiple branch stores directly from your merchant dashboard.',
      },
    });
  } catch (error) {
    console.error('Error in getRegistrationMetadata:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch onboarding metadata: ' + error.message,
    });
  }
}

/**
 * 3. Save / Update Registration Draft Progress
 * POST /api/vendor/register/save-draft
 * Body: { email, formData, step }
 */
async function saveRegistrationDraft(req, res) {
  try {
    const { email, formData, step } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to save progress',
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const data = formData || {};

    const cleanPhone = data.phone ? String(data.phone).replace(/\D/g, '').slice(-10) : null;

    // If phone is provided and 10 digits, verify it is not already used by another vendor
    if (cleanPhone && cleanPhone.length === 10) {
      const existingVendor = await Vendor.findOne({ where: { phone: cleanPhone } });
      if (existingVendor && existingVendor.email.toLowerCase().trim() !== cleanEmail) {
        return res.status(409).json({
          success: false,
          phoneTaken: true,
          message: `Phone number +91 ${cleanPhone} is already registered to store "${existingVendor.store_name}".`,
        });
      }
    }

    const payload = {
      email: cleanEmail,
      phone: cleanPhone,
      name: data.name || data.owner_name || null,
      store_name: data.store_name || null,
      category: data.category || data.service_type || 'grocery',
      service_type: data.service_type || data.category || 'grocery',
      city: data.city || 'Hubballi',
      address: data.address || null,
      pincode: data.pincode || null,
      fssai_number: data.fssai_number || data.documents?.fssai_number || null,
      gst_number: data.gst_number || data.documents?.gst_number || null,
      pan_number: data.pan_number || data.documents?.pan_number || null,
      license_number: data.license_number || data.documents?.drug_license_no || data.documents?.trade_license_no || data.documents?.rera_number || null,
      documents: data.documents || {},
      bank_details: data.bank_details || {},
      draft_data: data,
      step: step || 1,
      status: 'draft',
    };

    let draft = await VendorRegistration.findOne({ where: { email: cleanEmail } });

    if (draft) {
      await draft.update(payload);
    } else {
      draft = await VendorRegistration.create(payload);
    }

    return res.status(200).json({
      success: true,
      message: 'Draft progress saved successfully',
      draft: {
        id: draft.id,
        email: draft.email,
        store_name: draft.store_name,
        service_type: draft.service_type,
        step: draft.step,
        updatedAt: draft.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error in saveRegistrationDraft:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save draft: ' + error.message,
    });
  }
}

/**
 * 4. Delete Registration Draft
 * DELETE /api/vendor/register/draft/:email
 */
async function deleteRegistrationDraft(req, res) {
  try {
    const emailParam = req.params.email || req.body.email;
    if (!emailParam) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter is required',
      });
    }

    const cleanEmail = String(emailParam).toLowerCase().trim();
    const deletedCount = await VendorRegistration.destroy({
      where: { email: cleanEmail },
    });

    console.log(`🗑️ [REGISTRATION DRAFT DELETED] Email: ${cleanEmail} | Rows: ${deletedCount}`);

    return res.status(200).json({
      success: true,
      message: 'Draft removed successfully. You can now start with a fresh registration form.',
      deleted: deletedCount > 0,
    });
  } catch (error) {
    console.error('Error in deleteRegistrationDraft:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete draft: ' + error.message,
    });
  }
}

/**
 * 5. Submit Final Registration for Approval
 * POST /api/vendor/register/submit
 * Body: { email, formData }
 */
async function submitRegistration(req, res) {
  try {
    const { email, formData } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for submission',
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const data = formData || {};

    // Validate required fields
    if (!data.store_name || !data.store_name.trim()) {
      return res.status(400).json({ success: false, message: 'Store Name is required' });
    }
    if (!data.phone || !data.phone.trim()) {
      return res.status(400).json({ success: false, message: 'Merchant Contact Phone is required' });
    }
    if (!data.address || !data.address.trim()) {
      return res.status(400).json({ success: false, message: 'Store Address is required' });
    }

    const cleanPhone = String(data.phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Mobile number must be a valid 10-digit number' });
    }

    // Check if phone belongs to another vendor
    const phoneVendor = await Vendor.findOne({ where: { phone: cleanPhone } });
    if (phoneVendor && phoneVendor.email.toLowerCase().trim() !== cleanEmail) {
      return res.status(409).json({
        success: false,
        message: `This mobile number (+91 ${cleanPhone}) is already registered with another vendor store ("${phoneVendor.store_name}"). Please use a different phone number.`,
      });
    }

    // Check if email belongs to an existing vendor
    const emailVendor = await Vendor.findOne({ where: { email: cleanEmail } });
    if (emailVendor) {
      return res.status(409).json({
        success: false,
        message: `This email (${cleanEmail}) is already registered with an existing vendor store ("${emailVendor.store_name}"). Please sign in.`,
      });
    }

    const serviceType = data.service_type || data.category || 'grocery';
    const documents = data.documents || {};
    const fssaiNumber = data.fssai_number || documents.fssai_number || null;
    const gstNumber = data.gst_number || documents.gst_number || null;
    const panNumber = data.pan_number || documents.pan_number || null;
    const licenseNumber = data.license_number || documents.drug_license_no || documents.trade_license_no || documents.clinical_establishment_no || documents.medical_council_no || documents.rera_number || null;

    // Update or create draft record as 'submitted'
    let reg = await VendorRegistration.findOne({ where: { email: cleanEmail } });
    const regPayload = {
      email: cleanEmail,
      phone: cleanPhone,
      name: data.name || data.owner_name || 'Vendor Partner',
      store_name: data.store_name.trim(),
      category: serviceType,
      service_type: serviceType,
      city: data.city || 'Hubballi',
      address: data.address.trim(),
      pincode: data.pincode || null,
      fssai_number: fssaiNumber,
      gst_number: gstNumber,
      pan_number: panNumber,
      license_number: licenseNumber,
      documents,
      bank_details: data.bank_details || {},
      draft_data: data,
      step: 4,
      status: 'submitted',
    };

    if (reg) {
      await reg.update(regPayload);
    } else {
      reg = await VendorRegistration.create(regPayload);
    }

    // Also register or update entry in Vendor table with 'pending_approval'
    const existingVendor = await Vendor.findOne({
      where: {
        phone: cleanPhone,
      },
    });

    if (!existingVendor) {
      await Vendor.create({
        name: regPayload.name,
        store_name: regPayload.store_name,
        phone: cleanPhone,
        email: cleanEmail,
        category: regPayload.category,
        city: regPayload.city,
        address: regPayload.address,
        is_open: false,
        status: 'pending_approval',
        rating: 5.0,
        fssai_number: regPayload.fssai_number,
        gst_number: regPayload.gst_number,
        role: 'vendor',
      });
      console.log(`✅ [VENDOR ONBOARDING] Staged new vendor for approval: ${regPayload.store_name} (${cleanPhone})`);
    }

    // Send confirmation email
    const submitHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #a000e2; margin: 0; font-size: 24px; font-weight: 800;">Application Received! 🎉</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Pintu Partner Onboarding</p>
        </div>
        <p style="font-size: 15px; color: #1e293b; font-weight: 600;">Hello ${regPayload.name},</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Thank you for registering <strong>${regPayload.store_name}</strong> with Pintu! Our partner verification team has received your application and regulatory documents for review.
        </p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <div style="font-size: 13px; color: #334155; margin-bottom: 6px;"><strong>Store Name:</strong> ${regPayload.store_name}</div>
          <div style="font-size: 13px; color: #334155; margin-bottom: 6px;"><strong>Service Category:</strong> ${regPayload.category}</div>
          <div style="font-size: 13px; color: #334155; margin-bottom: 6px;"><strong>Operating City:</strong> ${regPayload.city}</div>
          <div style="font-size: 13px; color: #334155;"><strong>Contact:</strong> +91 ${cleanPhone}</div>
        </div>
        <div style="background: #eff6ff; border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; font-size: 12.5px; color: #1d4ed8; line-height: 1.5;">
          ℹ️ <strong>Initial Store:</strong> This is your 1st primary store registration. You can register and add multiple branch store outlets from your merchant dashboard after activation.
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          You will receive an email and SMS once your store is activated. You can then sign in directly using your registered phone number.
        </p>
      </div>
    `;
    sendEmailUtility(cleanEmail, `Pintu Partner Application Received: ${regPayload.store_name}`, submitHtml).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Registration submitted successfully! Our partner onboarding team will review your application.',
      registrationId: reg.id,
      store_name: reg.store_name,
    });
  } catch (error) {
    console.error('Error in submitRegistration:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit registration: ' + error.message,
    });
  }
}

module.exports = {
  sendRegistrationOtp,
  verifyRegistrationOtp,
  checkPhoneAvailability,
  getRegistrationMetadata,
  saveRegistrationDraft,
  deleteRegistrationDraft,
  submitRegistration,
};

