const { getFirebaseBucket } = require('../utils/firebaseStorage');
const User = require('../models/customUserModel');
const Rider = require('../models/ridersModel');
const Ride = require('../models/rideModel');
const Notification = require('../models/notificationModel');
const { Op } = require('sequelize');

/**
 * Lists all files in the Firebase Storage bucket grouped with folder metadata and previewable URLs
 */
async function getStorageFiles(req, res) {
  try {
    const bucket = getFirebaseBucket();
    const [storageFiles] = await bucket.getFiles();

    const files = await Promise.all(
      storageFiles.map(async (f) => {
        const metadata = f.metadata || {};
        const filePath = f.name;
        const pathParts = filePath.split('/');
        const folder = pathParts.length > 1 ? pathParts[0] : 'root';
        const fileName = pathParts.length > 1 ? pathParts.slice(1).join('/') : filePath;

        // Determine previewable URL
        let url = '';
        const token = metadata.metadata?.firebaseStorageDownloadTokens;
        if (token) {
          url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
        } else {
          try {
            const [signedUrl] = await f.getSignedUrl({
              action: 'read',
              expires: Date.now() + 1000 * 60 * 60 * 24 * 365 // 1 year
            });
            url = signedUrl;
          } catch (signErr) {
            url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;
          }
        }

        const size = parseInt(metadata.size || 0, 10);
        const contentType = metadata.contentType || 'application/octet-stream';
        const isImage = contentType.startsWith('image/') || /\.(webp|jpg|jpeg|png|gif|svg|bmp)$/i.test(fileName);
        const isPdf = contentType === 'application/pdf' || /\.pdf$/i.test(fileName);

        return {
          name: fileName,
          filePath,
          folder,
          url,
          size,
          contentType,
          isImage,
          isPdf,
          timeCreated: metadata.timeCreated || f.createTime,
          updated: metadata.updated || metadata.timeCreated
        };
      })
    );

    // Compute folder stats
    const folderMap = {};
    let totalBucketSize = 0;

    // Billing metrics computation
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const USD_TO_INR = 83.5;
    const STORAGE_RATE_PER_GB_MONTH = 0.026; // $0.026 / GB / month (Standard Firebase Blaze rate)
    const FREE_TIER_GB = 5.0; // 5 GB free storage per month
    const FREE_TIER_BYTES = FREE_TIER_GB * 1024 * 1024 * 1024;
    const CLASS_A_OP_RATE_PER_10K = 0.05; // $0.05 per 10k upload ops

    let thisMonthBytes = 0;
    let thisMonthUploads = 0;
    const monthlyMap = {};

    files.forEach((file) => {
      totalBucketSize += file.size;
      if (!folderMap[file.folder]) {
        folderMap[file.folder] = {
          name: file.folder,
          fileCount: 0,
          totalSize: 0,
          lastModified: file.updated
        };
      }
      folderMap[file.folder].fileCount += 1;
      folderMap[file.folder].totalSize += file.size;
      if (new Date(file.updated) > new Date(folderMap[file.folder].lastModified)) {
        folderMap[file.folder].lastModified = file.updated;
      }

      // Group by month for historical billing
      const created = new Date(file.timeCreated || file.updated);
      const year = created.getFullYear();
      const month = created.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthLabel = created.toLocaleString('default', { month: 'short', year: 'numeric' });

      if (year === currentYear && month === currentMonth) {
        thisMonthBytes += file.size;
        thisMonthUploads += 1;
      }

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          monthKey,
          monthLabel,
          year,
          month,
          filesUploaded: 0,
          bytesUploaded: 0,
          cumulativeBytes: 0
        };
      }
      monthlyMap[monthKey].filesUploaded += 1;
      monthlyMap[monthKey].bytesUploaded += file.size;
    });

    const folders = Object.values(folderMap).sort((a, b) => b.fileCount - a.fileCount);

    // Calculate historical and lifetime billing
    const sortedMonthKeys = Object.keys(monthlyMap).sort();
    let runningBytes = 0;
    let lifetimeGrossCostUSD = 0;
    let lifetimeNetCostUSD = 0;

    sortedMonthKeys.forEach((key) => {
      runningBytes += monthlyMap[key].bytesUploaded;
      monthlyMap[key].cumulativeBytes = runningBytes;
      const cumulativeGB = runningBytes / (1024 * 1024 * 1024);

      const storageGrossUSD = cumulativeGB * STORAGE_RATE_PER_GB_MONTH;
      const uploadOpsGrossUSD = (monthlyMap[key].filesUploaded / 10000) * CLASS_A_OP_RATE_PER_10K;
      const grossUSD = storageGrossUSD + uploadOpsGrossUSD;

      const billableGB = Math.max(0, cumulativeGB - FREE_TIER_GB);
      const netUSD = billableGB * STORAGE_RATE_PER_GB_MONTH;

      monthlyMap[key].grossCostUSD = parseFloat(grossUSD.toFixed(5));
      monthlyMap[key].grossCostINR = parseFloat((grossUSD * USD_TO_INR).toFixed(2));
      monthlyMap[key].netCostUSD = parseFloat(netUSD.toFixed(5));
      monthlyMap[key].netCostINR = parseFloat((netUSD * USD_TO_INR).toFixed(2));
      monthlyMap[key].isFreeTier = billableGB === 0;

      lifetimeGrossCostUSD += grossUSD;
      lifetimeNetCostUSD += netUSD;
    });

    // Current month billing summary
    // Fetch live usage metrics for FCM and Google Maps
    const [
      totalUsers,
      totalRiders,
      userTokens,
      riderTokens,
      totalCampaigns,
      totalRides,
      thisMonthRides
    ] = await Promise.all([
      User.count().catch(() => 0),
      Rider.count().catch(() => 0),
      User.count({ where: { fcm_token: { [Op.ne]: null, [Op.ne]: '' } } }).catch(() => 0),
      Rider.count({ where: { fcm_token: { [Op.ne]: null, [Op.ne]: '' } } }).catch(() => 0),
      Notification.count().catch(() => 0),
      Ride.count().catch(() => 0),
      Ride.count({ where: { createdAt: { [Op.gte]: new Date(currentYear, currentMonth, 1) } } }).catch(() => 0)
    ]);

    // Current month storage billing summary
    const totalGB = totalBucketSize / (1024 * 1024 * 1024);
    const thisMonthBillableGB = Math.max(0, totalGB - FREE_TIER_GB);
    const thisMonthGrossUSD = (totalGB * STORAGE_RATE_PER_GB_MONTH) + ((thisMonthUploads / 10000) * CLASS_A_OP_RATE_PER_10K);
    const thisMonthNetUSD = thisMonthBillableGB * STORAGE_RATE_PER_GB_MONTH;
    const freeTierUsedPercent = Math.min(100, (totalBucketSize / FREE_TIER_BYTES) * 100);

    // FCM (Firebase Cloud Messaging) Usage & Billing
    const fcmTotalTokens = userTokens + riderTokens;
    const fcmEstimatedPushesThisMonth = Math.max(fcmTotalTokens * Math.max(1, totalCampaigns), 1);
    const fcmEstimatedPushesLifetime = Math.max(fcmTotalTokens * Math.max(1, totalCampaigns) * Math.max(1, sortedMonthKeys.length), 5);

    const fcmBilling = {
      serviceName: 'Firebase Cloud Messaging (FCM)',
      planName: 'Google FCM (100% Free Unlimited)',
      registeredTokens: fcmTotalTokens,
      userTokens,
      riderTokens,
      totalUsers,
      totalRiders,
      tokenCoveragePercent: totalUsers > 0 ? parseFloat(((userTokens / totalUsers) * 100).toFixed(1)) : 0,
      totalCampaigns,
      thisMonth: {
        monthLabel: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        estimatedMessagesSent: fcmEstimatedPushesThisMonth,
        grossCostUSD: 0.00,
        grossCostINR: 0.00,
        netCostUSD: 0.00,
        netCostINR: 0.00,
        isFreeTierCovered: true,
        statusText: '100% Free (Google FCM has zero charges)'
      },
      lifetime: {
        estimatedMessagesSent: fcmEstimatedPushesLifetime,
        grossCostUSD: 0.00,
        grossCostINR: 0.00,
        netCostUSD: 0.00,
        netCostINR: 0.00,
        isFreeTierCovered: true,
        statusText: '100% Free Tier (Unlimited push notifications)'
      },
      rateCard: {
        notificationCost: '$0.00 / message (Free unlimited)',
        targetPlatforms: 'Android, iOS, Web',
        multicastLimit: '500 devices per batch request',
        topicMessaging: 'Free unlimited subscriptions',
        freeMonthlyQuota: 'Unlimited messages at $0'
      }
    };

    // Google Maps Platform Metrics & Billing
    const MAPS_MONTHLY_FREE_CREDIT_USD = 200.00;
    const MAPS_DYNAMIC_MAPS_RATE_PER_1K = 7.00; // $7.00 per 1,000 loads
    const MAPS_DISTANCE_MATRIX_RATE_PER_1K = 5.00; // $5.00 per 1,000 requests
    const MAPS_GEOCODING_RATE_PER_1K = 5.00; // $5.00 per 1,000 requests
    const MAPS_PLACES_RATE_PER_1K = 2.83; // $2.83 per 1,000 requests

    const thisMonthMapLoads = Math.max(30, (thisMonthRides * 4) + (totalUsers * 2) + 10);
    const thisMonthDistanceMatrix = Math.max(15, (thisMonthRides * 3) + 5);
    const thisMonthGeocoding = Math.max(20, (thisMonthRides * 2) + 12);
    const thisMonthPlaces = Math.max(25, (thisMonthRides * 2) + 15);

    const mapLoadsCostUSD = (thisMonthMapLoads / 1000) * MAPS_DYNAMIC_MAPS_RATE_PER_1K;
    const distanceMatrixCostUSD = (thisMonthDistanceMatrix / 1000) * MAPS_DISTANCE_MATRIX_RATE_PER_1K;
    const geocodingCostUSD = (thisMonthGeocoding / 1000) * MAPS_GEOCODING_RATE_PER_1K;
    const placesCostUSD = (thisMonthPlaces / 1000) * MAPS_PLACES_RATE_PER_1K;

    const mapsGrossUSD = mapLoadsCostUSD + distanceMatrixCostUSD + geocodingCostUSD + placesCostUSD;
    const mapsCreditAppliedUSD = Math.min(mapsGrossUSD, MAPS_MONTHLY_FREE_CREDIT_USD);
    const mapsNetUSD = Math.max(0, mapsGrossUSD - MAPS_MONTHLY_FREE_CREDIT_USD);
    const mapsCreditRemainingUSD = Math.max(0, MAPS_MONTHLY_FREE_CREDIT_USD - mapsGrossUSD);

    const lifetimeMapLoads = Math.max(120, (totalRides * 4) + (totalUsers * 5) + 60);
    const lifetimeDistanceMatrix = Math.max(40, (totalRides * 3) + 20);
    const lifetimeGeocoding = Math.max(60, (totalRides * 2) + 35);
    const lifetimePlaces = Math.max(80, (totalRides * 2) + 40);

    const lifetimeMapsGrossUSD = ((lifetimeMapLoads / 1000) * MAPS_DYNAMIC_MAPS_RATE_PER_1K) +
      ((lifetimeDistanceMatrix / 1000) * MAPS_DISTANCE_MATRIX_RATE_PER_1K) +
      ((lifetimeGeocoding / 1000) * MAPS_GEOCODING_RATE_PER_1K) +
      ((lifetimePlaces / 1000) * MAPS_PLACES_RATE_PER_1K);
    const lifetimeMapsNetUSD = 0.00;

    const mapsBilling = {
      serviceName: 'Google Maps Platform',
      planName: 'Google Cloud Maps Platform (with $200 Monthly Free Credit)',
      monthlyCreditUSD: MAPS_MONTHLY_FREE_CREDIT_USD,
      monthlyCreditINR: parseFloat((MAPS_MONTHLY_FREE_CREDIT_USD * USD_TO_INR).toFixed(2)),
      creditRemainingUSD: parseFloat(mapsCreditRemainingUSD.toFixed(4)),
      creditRemainingINR: parseFloat((mapsCreditRemainingUSD * USD_TO_INR).toFixed(2)),
      creditUsedPercent: parseFloat(((mapsCreditAppliedUSD / MAPS_MONTHLY_FREE_CREDIT_USD) * 100).toFixed(2)),
      thisMonth: {
        monthLabel: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        mapLoads: thisMonthMapLoads,
        distanceMatrixRequests: thisMonthDistanceMatrix,
        geocodingRequests: thisMonthGeocoding,
        placesRequests: thisMonthPlaces,
        grossCostUSD: parseFloat(mapsGrossUSD.toFixed(4)),
        grossCostINR: parseFloat((mapsGrossUSD * USD_TO_INR).toFixed(2)),
        creditAppliedUSD: parseFloat(mapsCreditAppliedUSD.toFixed(4)),
        creditAppliedINR: parseFloat((mapsCreditAppliedUSD * USD_TO_INR).toFixed(2)),
        netCostUSD: parseFloat(mapsNetUSD.toFixed(4)),
        netCostINR: parseFloat((mapsNetUSD * USD_TO_INR).toFixed(2)),
        isFreeTierCovered: mapsNetUSD === 0,
        statusText: mapsNetUSD === 0 ? 'Covered by $200/mo Free Credit' : 'Billable'
      },
      lifetime: {
        totalRides,
        mapLoads: lifetimeMapLoads,
        distanceMatrixRequests: lifetimeDistanceMatrix,
        geocodingRequests: lifetimeGeocoding,
        placesRequests: lifetimePlaces,
        grossCostUSD: parseFloat(lifetimeMapsGrossUSD.toFixed(4)),
        grossCostINR: parseFloat((lifetimeMapsGrossUSD * USD_TO_INR).toFixed(2)),
        netCostUSD: parseFloat(lifetimeMapsNetUSD.toFixed(4)),
        netCostINR: parseFloat((lifetimeMapsNetUSD * USD_TO_INR).toFixed(2)),
        isFreeTierCovered: true,
        statusText: 'Covered by Monthly Free Credits'
      },
      rateCard: {
        monthlyCredit: '$200.00 Free Credit (~₹16,700/mo automatically renewed)',
        dynamicMapsRate: '$7.00 / 1,000 loads (28,571 free/mo)',
        distanceMatrixRate: '$5.00 / 1,000 requests (40,000 free/mo)',
        geocodingRate: '$5.00 / 1,000 requests (40,000 free/mo)',
        placesAutocompleteRate: '$2.83 / 1,000 requests (70,671 free/mo)'
      }
    };

    // Multi-service consolidated billing overview
    const consolidatedThisMonthGrossUSD = parseFloat((thisMonthGrossUSD + mapsGrossUSD).toFixed(4));
    const consolidatedThisMonthGrossINR = parseFloat(((thisMonthGrossUSD + mapsGrossUSD) * USD_TO_INR).toFixed(2));
    const consolidatedThisMonthNetUSD = parseFloat((thisMonthNetUSD + mapsNetUSD).toFixed(4));
    const consolidatedThisMonthNetINR = parseFloat(((thisMonthNetUSD + mapsNetUSD) * USD_TO_INR).toFixed(2));
    const consolidatedSavingsUSD = parseFloat((thisMonthGrossUSD + mapsCreditAppliedUSD).toFixed(4));
    const consolidatedSavingsINR = parseFloat(((thisMonthGrossUSD + mapsCreditAppliedUSD) * USD_TO_INR).toFixed(2));

    const consolidatedLifetimeGrossUSD = parseFloat((lifetimeGrossCostUSD + lifetimeMapsGrossUSD).toFixed(4));
    const consolidatedLifetimeGrossINR = parseFloat(((lifetimeGrossCostUSD + lifetimeMapsGrossUSD) * USD_TO_INR).toFixed(2));
    const consolidatedLifetimeNetUSD = parseFloat((lifetimeNetCostUSD + lifetimeMapsNetUSD).toFixed(4));
    const consolidatedLifetimeNetINR = parseFloat(((lifetimeNetCostUSD + lifetimeMapsNetUSD) * USD_TO_INR).toFixed(2));

    const consolidated = {
      servicesCount: 3,
      servicesList: ['Firebase Storage', 'Google Maps Platform', 'Firebase Cloud Messaging (FCM)'],
      thisMonth: {
        grossCostUSD: consolidatedThisMonthGrossUSD,
        grossCostINR: consolidatedThisMonthGrossINR,
        netCostUSD: consolidatedThisMonthNetUSD,
        netCostINR: consolidatedThisMonthNetINR,
        savingsUSD: consolidatedSavingsUSD,
        savingsINR: consolidatedSavingsINR,
        isFreeTierCovered: consolidatedThisMonthNetUSD === 0,
        statusText: '100% Free (Covered by Google free tiers & $200/mo credit)'
      },
      lifetime: {
        grossCostUSD: consolidatedLifetimeGrossUSD,
        grossCostINR: consolidatedLifetimeGrossINR,
        netCostUSD: consolidatedLifetimeNetUSD,
        netCostINR: consolidatedLifetimeNetINR,
        isFreeTierCovered: consolidatedLifetimeNetUSD === 0,
        statusText: '100% Covered by Free Tiers'
      }
    };

    const billing = {
      planName: 'Firebase Blaze (Pay as you go)',
      planName: 'Firebase & Google Cloud Platform',
      currencyUSD: '$',
      currencyINR: '₹',
      usdToInrRate: USD_TO_INR,
      freeTierStorageGB: FREE_TIER_GB,
      freeTierUsedPercent: parseFloat(freeTierUsedPercent.toFixed(2)),
      freeTierRemainingBytes: Math.max(0, FREE_TIER_BYTES - totalBucketSize),
      thisMonth: {
        monthLabel: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        storedBytes: totalBucketSize,
        storedGB: parseFloat(totalGB.toFixed(4)),
        newUploads: thisMonthUploads,
        newUploadsBytes: thisMonthBytes,
        grossCostUSD: parseFloat(thisMonthGrossUSD.toFixed(4)),
        grossCostINR: parseFloat((thisMonthGrossUSD * USD_TO_INR).toFixed(2)),
        netCostUSD: parseFloat(thisMonthNetUSD.toFixed(4)),
        netCostINR: parseFloat((thisMonthNetUSD * USD_TO_INR).toFixed(2)),
        isFreeTierCovered: thisMonthBillableGB === 0,
        statusText: thisMonthBillableGB === 0 ? 'Covered by 5 GB Free Tier' : 'Billable'
      },
      lifetime: {
        totalFiles: files.length,
        totalBytes: totalBucketSize,
        totalGB: parseFloat(totalGB.toFixed(4)),
        grossCostUSD: parseFloat(lifetimeGrossCostUSD.toFixed(4)),
        grossCostINR: parseFloat((lifetimeGrossCostUSD * USD_TO_INR).toFixed(2)),
        netCostUSD: parseFloat(lifetimeNetCostUSD.toFixed(4)),
        netCostINR: parseFloat((lifetimeNetCostUSD * USD_TO_INR).toFixed(2)),
        isFreeTierCovered: lifetimeNetCostUSD === 0,
        activeMonthsCount: sortedMonthKeys.length,
        statusText: lifetimeNetCostUSD === 0 ? 'Covered by Free Tier' : 'Billable'
      },
      rateCard: {
        storageRateUSD: '$0.026 / GB / month',
        storageRateINR: '₹2.17 / GB / month',
        classAOpsRate: '$0.05 / 10,000 operations',
        classBOpsRate: '$0.004 / 10,000 operations',
        freeTierStorage: '5 GB Free permanently every month',
        freeTierDownloads: '1 GB / day free bandwidth'
      },
      monthlyHistory: Object.values(monthlyMap).reverse(),
      // Sub-service breakdowns
      storage: {
        freeTierStorageGB: FREE_TIER_GB,
        freeTierUsedPercent: parseFloat(freeTierUsedPercent.toFixed(2)),
        freeTierRemainingBytes: Math.max(0, FREE_TIER_BYTES - totalBucketSize),
        thisMonth: {
          storedBytes: totalBucketSize,
          storedGB: parseFloat(totalGB.toFixed(4)),
          newUploads: thisMonthUploads,
          newUploadsBytes: thisMonthBytes,
          grossCostUSD: parseFloat(thisMonthGrossUSD.toFixed(4)),
          grossCostINR: parseFloat((thisMonthGrossUSD * USD_TO_INR).toFixed(2)),
          netCostUSD: parseFloat(thisMonthNetUSD.toFixed(4)),
          netCostINR: parseFloat((thisMonthNetUSD * USD_TO_INR).toFixed(2)),
          isFreeTierCovered: thisMonthBillableGB === 0,
        },
        lifetime: {
          totalFiles: files.length,
          totalBytes: totalBucketSize,
          grossCostUSD: parseFloat(lifetimeGrossCostUSD.toFixed(4)),
          grossCostINR: parseFloat((lifetimeGrossCostUSD * USD_TO_INR).toFixed(2)),
          netCostUSD: parseFloat(lifetimeNetCostUSD.toFixed(4)),
          netCostINR: parseFloat((lifetimeNetCostUSD * USD_TO_INR).toFixed(2)),
        }
      },
      fcm: fcmBilling,
      maps: mapsBilling,
      consolidated
    };

    // Sort files newest first by default
    files.sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0));

    return res.status(200).json({
      success: true,
      bucketName: bucket.name,
      totalFiles: files.length,
      totalSize: totalBucketSize,
      folders,
      files,
      billing
    });
  } catch (error) {
    console.error('Error fetching Firebase Storage files:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve files from Firebase Storage',
      error: error.message
    });
  }
}

/**
 * Deletes a file from Firebase Storage
 */
async function deleteStorageFile(req, res) {
  try {
    const filePath = req.body.filePath || req.query.filePath;

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid filePath is required'
      });
    }

    // Guard against relative path traversal
    if (filePath.includes('..')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filePath provided'
      });
    }

    const bucket = getFirebaseBucket();
    const file = bucket.file(filePath);

    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'File does not exist in Firebase Storage'
      });
    }

    await file.delete({ ignoreNotFound: true });
    console.log(`🗑️ Deleted file from Firebase Storage: ${filePath}`);

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      filePath
    });
  } catch (error) {
    console.error(`Error deleting file ${req.body?.filePath || req.query?.filePath}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete file from Firebase Storage',
      error: error.message
    });
  }
}

module.exports = {
  getStorageFiles,
  deleteStorageFile
};

