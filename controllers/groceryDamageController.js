const GroceryDamage = require('../models/groceryDamage');
const GroceryItem = require('../models/groceryItem');
const sequelize = require('../db');

// Create a new damage record
exports.createDamage = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { itemId, quantity } = req.body;

    if (!itemId || !quantity) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'itemId and quantity are required.' });
    }

    // Find the grocery item and reduce stock
    const item = await GroceryItem.findByPk(itemId, { transaction: t });
    if (!item) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Grocery item not found.' });
    }

    if (item.stock < quantity) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Cannot report damage of ${quantity}. Only ${item.stock} in stock.` });
    }

    item.stock -= quantity;
    await item.save({ transaction: t });

    // Create the damage record
    const damage = await GroceryDamage.create(req.body, { transaction: t });

    await t.commit();
    res.status(201).json({ success: true, data: damage });
  } catch (error) {
    await t.rollback();
    console.error('Error creating grocery damage record:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all damage records
exports.getAllDamages = async (req, res) => {
  try {
    const damages = await GroceryDamage.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, data: damages });
  } catch (error) {
    console.error('Error fetching grocery damage records:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single damage record by ID
exports.getDamageById = async (req, res) => {
  try {
    const damage = await GroceryDamage.findByPk(req.params.id);
    if (!damage) {
      return res.status(404).json({ success: false, message: 'Damage record not found' });
    }
    res.status(200).json({ success: true, data: damage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a damage record
exports.updateDamage = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { itemId: newItemId, quantity: newQuantity } = req.body;

    // 1. Find the original damage record
    const originalDamage = await GroceryDamage.findByPk(id, { transaction: t });
    if (!originalDamage) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Damage record not found' });
    }

    const oldItemId = originalDamage.itemId;
    const oldQuantity = originalDamage.quantity;

    // 2. Handle stock adjustments if product or quantity is being updated
    if (newItemId !== undefined || newQuantity !== undefined) {
      const finalItemId = newItemId !== undefined ? newItemId : oldItemId;
      const finalQuantity = newQuantity !== undefined ? newQuantity : oldQuantity;

      if (oldItemId === finalItemId) {
        // Item is the same, quantity might have changed
        const quantityDiff = finalQuantity - oldQuantity;
        if (quantityDiff !== 0) {
          const item = await GroceryItem.findByPk(finalItemId, { transaction: t });
          if (!item) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Grocery item not found.' });
          }
          if (item.stock < quantityDiff) {
            await t.rollback();
            return res.status(400).json({ success: false, message: `Cannot increase damage. Only ${item.stock} more available in stock.` });
          }
          item.stock -= quantityDiff; // Reduce stock by the difference
          await item.save({ transaction: t });
        }
      } else {
        // Item has changed. Restore old, reduce new.
        const oldItem = await GroceryItem.findByPk(oldItemId, { transaction: t });
        if (oldItem) {
          oldItem.stock += oldQuantity;
          await oldItem.save({ transaction: t });
        }

        const newItem = await GroceryItem.findByPk(finalItemId, { transaction: t });
        if (!newItem) {
          await t.rollback();
          return res.status(404).json({ success: false, message: 'New grocery item not found.' });
        }
        if (newItem.stock < finalQuantity) {
          await t.rollback();
          return res.status(400).json({ success: false, message: `Cannot report damage for new item. Only ${newItem.stock} in stock.` });
        }
        newItem.stock -= finalQuantity;
        await newItem.save({ transaction: t });
      }
    }

    // 3. Update the damage record
    const [updated] = await GroceryDamage.update(req.body, { where: { id }, transaction: t });

    if (updated) {
      await t.commit();
      const updatedDamage = await GroceryDamage.findByPk(req.params.id);
      return res.status(200).json({ success: true, data: updatedDamage });
    }

    await t.rollback();
    return res.status(404).json({ success: false, message: 'Damage record not found or no changes made' });
  } catch (error) {
    await t.rollback();
    console.error('Error updating grocery damage record:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a damage record
exports.deleteDamage = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const damage = await GroceryDamage.findByPk(req.params.id, { transaction: t });
    if (!damage) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Damage record not found' });
    }

    const item = await GroceryItem.findByPk(damage.itemId, { transaction: t });
    if (item) {
      item.stock += damage.quantity;
      await item.save({ transaction: t });
    }

    await damage.destroy({ transaction: t });
    await t.commit();

    return res.status(200).json({ success: true, message: 'Damage record deleted successfully and stock restored.' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting grocery damage record:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};