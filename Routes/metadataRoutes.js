const express = require('express');
const router = express.Router();
const { getMetadata, updateMetadata, queryMetadata } = require('../controllers/metadataController');

// Route: /api/metadata

router.post('/query', queryMetadata);
router.get('/', getMetadata);
router.patch('/', updateMetadata);

module.exports = router;