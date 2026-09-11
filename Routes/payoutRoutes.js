const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');

router.get('/', payoutController.getAllPayoutRequests);
router.put('/:id', payoutController.updatePayoutStatus);

module.exports = router;

