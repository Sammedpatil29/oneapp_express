const express = require('express');
const router = express.Router();
const {
  getStorageFiles,
  deleteStorageFile
} = require('../controllers/firebaseStorageController');

// GET /api/firebase-storage/files - List all files grouped by folder with stats and URLs
router.get('/files', getStorageFiles);

// DELETE /api/firebase-storage/file - Delete a specific file from Firebase Storage
router.delete('/file', deleteStorageFile);

module.exports = router;

