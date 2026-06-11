const express = require('express');
const router = express.Router();
const sidebarItemController = require('../controllers/sidebarItemController');

// Define routes for sidebar items
router.post('/create', sidebarItemController.createItem);
router.post('/seed', sidebarItemController.seedItems); // Route to seed your initial JSON array

router.get('/valid', sidebarItemController.getValidItems);
router.get('/', sidebarItemController.getAllItems);
router.get('/:id', sidebarItemController.getItemById);

router.put('/:id', sidebarItemController.updateItem);
router.delete('/:id', sidebarItemController.deleteItem);

module.exports = router;