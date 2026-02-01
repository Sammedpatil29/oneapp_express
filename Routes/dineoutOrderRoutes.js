const express = require('express');
const router = express.Router();
const dineoutOrderController = require('../controllers/dineoutOrderController');

router.post('/create', dineoutOrderController.createDineoutOrder);
router.post('/details', dineoutOrderController.getDineoutOrderDetails);
router.post('/cancel', dineoutOrderController.cancelDineoutOrder);

module.exports = router;