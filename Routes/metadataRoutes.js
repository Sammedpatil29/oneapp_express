const express = require('express');
const router = express.Router();
const { getPolygon, updatePolygon } = require('../controllers/metadataController');

// Route: /api/metadata

router.get('/', getPolygon);
router.patch('/', updatePolygon);

module.exports = router;