const OtaRelease = require('../models/otaReleaseModel');
const path = require('path');
const fs = require('fs');

/**
 * Compare two semver/dotted version strings (v1 > v2 returns 1, v1 < v2 returns -1, equal returns 0)
 */
function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const parts1 = v1.replace(/^v/, '').split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = v2.replace(/^v/, '').split('.').map(p => parseInt(p, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

// 1. Check for updates (Used by mobile apps on launch/resume)
exports.checkUpdate = async (req, res) => {
  try {
    const { appId, version, channel = 'production', platform = 'android' } = req.query;

    if (!appId || !version) {
      return res.status(400).json({
        success: false,
        message: 'appId and version query parameters are required.'
      });
    }

    // Standardize app ID matching
    // Matches io.ionic.oneapp, io.oneapp.partner, oneapp, oneapp_partner
    const releases = await OtaRelease.findAll({
      where: {
        app_id: appId,
        channel,
        platform,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    if (!releases || releases.length === 0) {
      return res.json({
        success: true,
        updateAvailable: false,
        message: 'No releases found for this app and channel.'
      });
    }

    // Find the highest version release
    let latestRelease = releases[0];
    for (const rel of releases) {
      if (compareVersions(rel.version, latestRelease.version) > 0) {
        latestRelease = rel;
      }
    }

    const hasUpdate = compareVersions(latestRelease.version, version) > 0;

    if (hasUpdate) {
      return res.json({
        success: true,
        updateAvailable: true,
        version: latestRelease.version,
        channel: latestRelease.channel,
        bundleUrl: latestRelease.bundle_url,
        checksum: latestRelease.checksum,
        isMandatory: latestRelease.is_mandatory,
        minNativeVersion: latestRelease.min_native_version,
        releaseNotes: latestRelease.release_notes,
        createdAt: latestRelease.created_at
      });
    }

    return res.json({
      success: true,
      updateAvailable: false,
      currentVersion: version,
      message: 'App is already up to date.'
    });
  } catch (error) {
    console.error('❌ Error checking OTA update:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check OTA update',
      error: error.message
    });
  }
};

// 2. OtaKit / CDN Manifest compatibility endpoint
exports.getManifest = async (req, res) => {
  try {
    const { appId, channel = 'production' } = req.params;

    const releases = await OtaRelease.findAll({
      where: {
        app_id: appId,
        channel: channel,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    if (!releases || releases.length === 0) {
      return res.status(404).json({ error: 'No active release found for this app.' });
    }

    let latest = releases[0];
    for (const rel of releases) {
      if (compareVersions(rel.version, latest.version) > 0) {
        latest = rel;
      }
    }

    return res.json({
      appId: latest.app_id,
      version: latest.version,
      channel: latest.channel,
      url: latest.bundle_url,
      checksum: latest.checksum,
      mandatory: latest.is_mandatory,
      notes: latest.release_notes,
      updatedAt: latest.updated_at
    });
  } catch (error) {
    console.error('❌ Error serving OTA manifest:', error);
    return res.status(500).json({ error: error.message });
  }
};

// 3. Publish a new OTA release (Admin / CI Pipeline)
exports.publishRelease = async (req, res) => {
  try {
    const {
      app_id,
      version,
      channel = 'production',
      platform = 'android',
      bundle_url,
      checksum,
      min_native_version = '1.0.0',
      is_mandatory = false,
      release_notes = ''
    } = req.body;

    if (!app_id || !version || !bundle_url) {
      return res.status(400).json({
        success: false,
        message: 'app_id, version, and bundle_url are required fields.'
      });
    }

    // Check if release with same version already exists
    let existingRelease = await OtaRelease.findOne({
      where: { app_id, version, channel, platform }
    });

    if (existingRelease) {
      existingRelease.bundle_url = bundle_url;
      existingRelease.checksum = checksum || existingRelease.checksum;
      existingRelease.min_native_version = min_native_version;
      existingRelease.is_mandatory = is_mandatory;
      existingRelease.release_notes = release_notes;
      existingRelease.is_active = true;
      await existingRelease.save();

      return res.json({
        success: true,
        message: `OTA release ${version} updated successfully.`,
        release: existingRelease
      });
    }

    const newRelease = await OtaRelease.create({
      app_id,
      version,
      channel,
      platform,
      bundle_url,
      checksum,
      min_native_version,
      is_mandatory,
      is_active: true,
      release_notes
    });

    return res.status(201).json({
      success: true,
      message: `OTA release ${version} for ${app_id} published successfully.`,
      release: newRelease
    });
  } catch (error) {
    console.error('❌ Error publishing OTA release:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to publish OTA release',
      error: error.message
    });
  }
};

// 4. List all releases (Admin panel)
exports.getReleases = async (req, res) => {
  try {
    const { appId, channel } = req.query;
    const where = {};
    if (appId) where.app_id = appId;
    if (channel) where.channel = channel;

    const releases = await OtaRelease.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    return res.json({
      success: true,
      count: releases.length,
      releases
    });
  } catch (error) {
    console.error('❌ Error fetching OTA releases:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch OTA releases',
      error: error.message
    });
  }
};

// 5. Toggle active status
exports.toggleRelease = async (req, res) => {
  try {
    const { id } = req.params;
    const release = await OtaRelease.findByPk(id);

    if (!release) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }

    release.is_active = !release.is_active;
    await release.save();

    return res.json({
      success: true,
      message: `Release ${release.version} is now ${release.is_active ? 'active' : 'inactive'}.`,
      release
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 6. Delete release
exports.deleteRelease = async (req, res) => {
  try {
    const { id } = req.params;
    const release = await OtaRelease.findByPk(id);

    if (!release) {
      return res.status(404).json({ success: false, message: 'Release not found' });
    }

    await release.destroy();
    return res.json({ success: true, message: 'Release deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 7. Client telemetry / status reporting
exports.reportStatus = async (req, res) => {
  try {
    const { appId, version, status, deviceId, error } = req.body;
    console.log(`📱 [OTA Telemetry] ${appId} v${version} → Status: ${status} ${error ? `| Error: ${error}` : ''}`);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 8. Upload & publish OTA bundle directly (Called from CLI publish-ota script)
exports.uploadBundle = async (req, res) => {
  try {
    const secret = req.headers['x-ota-secret'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const validSecret = process.env.OTA_SECRET_KEY || 'pintu-ota-secret-key-2026';

    if (!secret || secret !== validSecret) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing OTA secret key.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No bundle file uploaded.'
      });
    }

    const {
      appId = 'io.ionic.oneapp',
      channel = '__base__',
      runtime = '__default__',
      version,
      manifest: rawManifest,
      forceImmediate
    } = req.body;

    let parsedManifest = {};
    if (rawManifest) {
      try {
        parsedManifest = typeof rawManifest === 'string' ? JSON.parse(rawManifest) : rawManifest;
      } catch (e) {
        parsedManifest = {};
      }
    }

    const relVersion = version || parsedManifest.version || '1.0.0';
    const bundleFileName = req.file.filename;

    // Determine target manifest directory
    const otaPublicDir = path.join(__dirname, '..', 'public', 'ota');
    const manifestDir = path.join(otaPublicDir, 'manifests', appId, channel, runtime);
    fs.mkdirSync(manifestDir, { recursive: true });

    // Build the final manifest object
    const hostUrl = process.env.OTA_CDN_URL || `${req.protocol}://${req.get('host')}/ota`;
    const bundleUrl = `${hostUrl}/bundles/${bundleFileName}`;

    const finalManifest = {
      version: relVersion,
      url: bundleUrl,
      sha256: parsedManifest.sha256 || '',
      size: req.file.size,
      releaseId: parsedManifest.releaseId || `${appId}-${relVersion}-${Date.now().toString(36)}`,
      strategy: 'zip',
      forceImmediate: forceImmediate === 'true' || forceImmediate === true || parsedManifest.forceImmediate === true
    };

    // Save manifest.json in the channel/runtime path
    const manifestFilePath = path.join(manifestDir, 'manifest.json');
    fs.writeFileSync(manifestFilePath, JSON.stringify(finalManifest, null, 2), 'utf-8');

    // Also write a copy to root manifest dir for easy access: manifests/<appId>/manifest.json
    const rootManifestDir = path.join(otaPublicDir, 'manifests', appId);
    fs.mkdirSync(rootManifestDir, { recursive: true });
    fs.writeFileSync(path.join(rootManifestDir, 'manifest.json'), JSON.stringify(finalManifest, null, 2), 'utf-8');

    // Sync with database if OtaRelease model exists
    try {
      if (OtaRelease) {
        let existingRelease = await OtaRelease.findOne({
          where: { app_id: appId, version: relVersion, channel: channel }
        });

        if (existingRelease) {
          existingRelease.bundle_url = bundleUrl;
          existingRelease.checksum = finalManifest.sha256;
          existingRelease.is_active = true;
          await existingRelease.save();
        } else {
          await OtaRelease.create({
            app_id: appId,
            version: relVersion,
            channel: channel,
            platform: 'android',
            bundle_url: bundleUrl,
            checksum: finalManifest.sha256,
            is_active: true
          });
        }
      }
    } catch (dbErr) {
      console.warn('⚠️  Could not sync OTA release to DB (file stored successfully):', dbErr.message);
    }

    console.log(`✅ [OTA Upload] Uploaded ${bundleFileName} (${req.file.size} bytes) for ${appId} v${relVersion}`);

    return res.status(200).json({
      success: true,
      message: `OTA bundle and manifest for ${appId} v${relVersion} uploaded successfully!`,
      version: relVersion,
      bundleUrl,
      manifestUrl: `${hostUrl}/manifests/${appId}/${channel}/${runtime}/manifest.json`,
      manifest: finalManifest
    });
  } catch (error) {
    console.error('❌ Error uploading OTA bundle:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload OTA bundle',
      error: error.message
    });
  }
};


