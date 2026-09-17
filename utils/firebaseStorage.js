const admin = require('firebase-admin');
const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

let bucketInstance = null;

/**
 * Get or initialize Firebase Storage Bucket
 */
function getFirebaseBucket() {
  if (bucketInstance) {
    return bucketInstance;
  }

  if (!admin.apps.length) {
    let credential = null;

    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      });
    } else {
      // Fallback to local service account file if present
      const localKeyPath = path.resolve(__dirname, '../oneapp-74b5a-firebase-adminsdk-fbsvc-c8af2f253e.json');
      if (fs.existsSync(localKeyPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
        credential = admin.credential.cert(serviceAccount);
      }
    }

    if (!credential) {
      throw new Error('Firebase credentials not found in environment variables or service account key file.');
    }

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'oneapp-74b5a.firebasestorage.app';
    admin.initializeApp({
      credential,
      storageBucket: bucketName
    });
    console.log(`✅ Firebase Storage initialized with bucket: ${bucketName}`);
  }

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'oneapp-74b5a.firebasestorage.app';
  bucketInstance = admin.storage().bucket(bucketName);
  return bucketInstance;
}

/**
 * Converts image buffer to WebP with size optimization and uploads to banners/ folder
 * @param {Buffer} fileBuffer
 * @param {string} [originalName]
 * @returns {Promise<{ url: string, filePath: string, size: number, originalSize: number }>}
 */
async function uploadBannerToFirebase(fileBuffer, originalName = 'banner') {
  const bucket = getFirebaseBucket();

  // 1. Optimize and convert to WebP using sharp
  // Resize to max 1600px width (without enlarging smaller images) for crisp, lightweight mobile banners
  const webpBuffer = await sharp(fileBuffer)
    .resize({
      width: 1600,
      withoutEnlargement: true,
      fit: 'inside'
    })
    .webp({
      quality: 82,
      effort: 4
    })
    .toBuffer();

  // 2. Generate unique filename in banners/ folder
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const sanitizedBase = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  const filePath = `banners/${sanitizedBase}_${Date.now()}_${randomSuffix}.webp`;

  // 3. Generate persistent Firebase download token
  const downloadToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

  // 4. Save to Firebase Storage
  const file = bucket.file(filePath);
  await file.save(webpBuffer, {
    metadata: {
      contentType: 'image/webp',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken
      }
    }
  });

  // 5. Construct public download URL
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;

  return {
    url,
    filePath,
    size: webpBuffer.length,
    originalSize: fileBuffer.length
  };
}

/**
 * Deletes a banner image file from Firebase Storage if it was uploaded there
 * @param {string} imageUrl
 * @returns {Promise<boolean>}
 */
async function deleteBannerFromFirebase(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return false;
  }

  // Check if it's a Firebase Storage URL for banners
  if (!imageUrl.includes('firebasestorage.googleapis.com') || !imageUrl.includes('/o/banners')) {
    return false;
  }

  try {
    const bucket = getFirebaseBucket();
    const parts = imageUrl.split('/o/');
    if (parts.length < 2) return false;

    const pathWithQuery = parts[1];
    const encodedPath = pathWithQuery.split('?')[0];
    const decodedPath = decodeURIComponent(encodedPath);

    // Security check: only delete within banners/ directory
    if (!decodedPath.startsWith('banners/')) {
      return false;
    }

    const file = bucket.file(decodedPath);
    await file.delete({ ignoreNotFound: true });
    console.log(`🗑️ Deleted banner image from Firebase Storage: ${decodedPath}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ Could not delete banner image from Firebase (${imageUrl}):`, error.message);
    return false;
  }
}

/**
 * Detect document type from filename
 */
function detectDocType(fileName = '') {
  const lower = fileName.toLowerCase();
  if (lower.startsWith('dl') || lower.includes('license') || lower.includes('licence') || lower.includes('driving')) return 'driving_license';
  if (lower.startsWith('rc') || lower.includes('registration') || lower.includes('rc_book') || lower.includes('rcbook')) return 'vehicle_rc';
  if (lower.startsWith('insurance') || lower.includes('policy') || lower.includes('insur')) return 'vehicle_insurance';
  if (lower.includes('adhaar') || lower.includes('aadhaar') || lower.includes('aadhar') || lower.includes('pan') || lower.includes('voter')) return 'aadhaar_pan';
  if (lower.includes('selfie') || lower.includes('face') || lower.includes('photo') || lower.includes('avatar') || lower.includes('portrait')) return 'live_selfie';
  if (lower.includes('passbook') || lower.includes('cheque') || lower.includes('bank')) return 'bank_passbook';
  return 'document';
}

/**
 * Uploads a rider document (image or PDF) to Firebase Storage under rider_documents/
 * @param {Buffer} fileBuffer
 * @param {string} originalName
 * @param {string|number} [riderId]
 * @param {string} [docType]
 * @returns {Promise<{ url: string, filePath: string, size: number, originalSize: number, contentType: string, docType: string }>}
 */
async function uploadRiderDocumentToFirebase(fileBuffer, originalName = 'document', riderId = 'general', docType = '') {
  const bucket = getFirebaseBucket();
  const ext = path.extname(originalName).toLowerCase();
  const determinedDocType = docType || detectDocType(originalName);
  const sanitizedRiderId = String(riderId).replace(/[^a-zA-Z0-9_-]/g, '_');

  const isImage = /\.(webp|jpg|jpeg|png|gif|svg|bmp)$/i.test(originalName) || !ext;
  const isPdf = ext === '.pdf';

  let uploadBuffer = fileBuffer;
  let contentType = 'application/octet-stream';
  let targetExt = ext || '.bin';

  if (isImage) {
    try {
      uploadBuffer = await sharp(fileBuffer)
        .rotate()
        .resize({ width: 1920, withoutEnlargement: true, fit: 'inside' })
        .webp({ quality: 85, effort: 4 })
        .toBuffer();
      contentType = 'image/webp';
      targetExt = '.webp';
    } catch (err) {
      console.warn('⚠️ Sharp optimization failed, uploading original buffer:', err.message);
      contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
      targetExt = ext || '.jpg';
    }
  } else if (isPdf) {
    contentType = 'application/pdf';
    targetExt = '.pdf';
  }

  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const filePath = `rider_documents/${sanitizedRiderId}/${determinedDocType}_${Date.now()}_${randomSuffix}${targetExt}`;
  const downloadToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

  const file = bucket.file(filePath);
  await file.save(uploadBuffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
        riderId: String(riderId),
        docType: determinedDocType,
        originalName
      }
    }
  });

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;

  return {
    url,
    filePath,
    size: uploadBuffer.length,
    originalSize: fileBuffer.length,
    contentType,
    docType: determinedDocType
  };
}

/**
 * Uploads a rider KYC ZIP archive to Firebase Storage
 */
async function uploadRiderKycZipToFirebase(fileBuffer, originalName = 'kyc_archive.zip', riderId = 'general') {
  const bucket = getFirebaseBucket();
  const sanitizedRiderId = String(riderId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const filePath = `rider_documents/${sanitizedRiderId}/kyc_archive_${Date.now()}_${randomSuffix}.zip`;
  const downloadToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

  const file = bucket.file(filePath);
  await file.save(fileBuffer, {
    metadata: {
      contentType: 'application/zip',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
        riderId: String(riderId),
        originalName
      }
    }
  });

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;

  return {
    url,
    filePath,
    size: fileBuffer.length
  };
}

/**
 * Extracts a KYC ZIP archive in-memory and uploads each document directly to Firebase Storage
 */
async function extractAndUploadKycZipToFirebase(zipBufferOrPath, riderId) {
  try {
    const AdmZip = require('adm-zip');
    let zip;
    if (Buffer.isBuffer(zipBufferOrPath)) {
      zip = new AdmZip(zipBufferOrPath);
    } else if (typeof zipBufferOrPath === 'string' && fs.existsSync(zipBufferOrPath)) {
      zip = new AdmZip(zipBufferOrPath);
    } else {
      console.warn('⚠️ Invalid zip input provided to extractAndUploadKycZipToFirebase');
      return null;
    }

    const zipEntries = zip.getEntries();
    const extractedFiles = {};
    let metadataJson = null;

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const entryName = entry.entryName;
      if (entryName.includes('__MACOSX') || entryName.includes('.DS_Store')) continue;

      const baseName = path.basename(entryName).toLowerCase();
      const fileData = entry.getData();

      if (baseName === 'metadata.json') {
        try {
          metadataJson = JSON.parse(fileData.toString('utf8'));
        } catch (e) {}
      } else {
        const docType = detectDocType(baseName);
        const uploadResult = await uploadRiderDocumentToFirebase(fileData, entry.name, riderId, docType);
        extractedFiles[docType] = uploadResult.url;
      }
    }

    return {
      extractedFiles,
      metadataJson,
      uploadedCount: Object.keys(extractedFiles).length
    };
  } catch (err) {
    console.error('Error in extractAndUploadKycZipToFirebase:', err);
    return null;
  }
}

/**
 * Deletes a rider document from Firebase Storage
 */
async function deleteRiderDocumentFromFirebase(fileUrlOrPath) {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string') return false;

  try {
    const bucket = getFirebaseBucket();
    let filePath = fileUrlOrPath;

    if (fileUrlOrPath.includes('/o/')) {
      const parts = fileUrlOrPath.split('/o/');
      filePath = decodeURIComponent(parts[1].split('?')[0]);
    }

    if (!filePath.startsWith('rider_documents/')) {
      return false;
    }

    const file = bucket.file(filePath);
    await file.delete({ ignoreNotFound: true });
    console.log(`🗑️ Deleted rider document from Firebase Storage: ${filePath}`);
    return true;
  } catch (err) {
    console.warn(`⚠️ Could not delete rider document from Firebase (${fileUrlOrPath}):`, err.message);
    return false;
  }
}

module.exports = {
  getFirebaseBucket,
  uploadBannerToFirebase,
  deleteBannerFromFirebase,
  detectDocType,
  uploadRiderDocumentToFirebase,
  uploadRiderKycZipToFirebase,
  extractAndUploadKycZipToFirebase,
  deleteRiderDocumentFromFirebase
};

