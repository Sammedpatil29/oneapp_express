const { getFirebaseBucket } = require('../utils/firebaseStorage');

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
    });

    const folders = Object.values(folderMap).sort((a, b) => b.fileCount - a.fileCount);

    // Sort files newest first by default
    files.sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0));

    return res.status(200).json({
      success: true,
      bucketName: bucket.name,
      totalFiles: files.length,
      totalSize: totalBucketSize,
      folders,
      files
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

