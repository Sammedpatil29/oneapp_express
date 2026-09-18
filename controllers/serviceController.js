// controllers/serviceController.js
const Service = require('../models/Services');
const { uploadServiceToFirebase, deleteServiceFromFirebase } = require('../utils/firebaseStorage');

/**
 * 1. Create Service
 * POST /api/services
 */
async function createService(req, res) {
  try {
    const newService = await Service.create(req.body);
    return res.status(201).json({ 
      success: true, 
      message: 'Service created successfully', 
      data: newService 
    });
  } catch (error) {
    console.error('Create Service Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 2. Get All Services
 * GET /api/services
 */
async function getAllServices(req, res) {
  try {
    const services = await Service.findAll({});
    return res.json({ 
      success: true, 
      count: services.length, 
      data: services 
    });
  } catch (error) {
    console.error('Get Services Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching services' });
  }
}

/**
 * 3. Get Service By ID
 * GET /api/services/:id
 */
async function getServiceById(req, res) {
  try {
    const { id } = req.params;
    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    return res.json({ success: true, data: service });
  } catch (error) {
    console.error('Get Service Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * 4. Update Service (Full Update)
 * PUT /api/services/:id
 */
async function updateService(req, res) {
  try {
    const { id } = req.params;
    
    // Check if existing service has a Firebase image that needs replacement
    if (req.body.img) {
      try {
        const existingService = await Service.findByPk(id);
        if (existingService && existingService.img && existingService.img !== req.body.img) {
          await deleteServiceFromFirebase(existingService.img);
        }
      } catch (checkErr) {
        console.warn('Could not check existing service image for deletion:', checkErr.message);
      }
    }

    // Update returns an array: [numberOfAffectedRows]
    const [updated] = await Service.update(req.body, {
      where: { id: id }
    });

    if (updated) {
      const updatedService = await Service.findByPk(id);
      return res.json({ 
        success: true, 
        message: 'Service updated successfully', 
        data: updatedService 
      });
    }

    return res.status(404).json({ success: false, message: 'Service not found' });

  } catch (error) {
    console.error('Update Service Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating service' });
  }
}

/**
 * 5. Patch Service (Partial Update)
 * PATCH /api/services/:id
 * Best for toggling active status or changing price only.
 */
async function patchService(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body; // e.g. { "is_active": false }

    const [updated] = await Service.update(updates, {
      where: { id: id }
    });

    if (updated) {
      const patchedService = await Service.findByPk(id);
      return res.json({ 
        success: true, 
        message: 'Service patched successfully', 
        data: patchedService 
      });
    }

    return res.status(404).json({ success: false, message: 'Service not found' });

  } catch (error) {
    console.error('Patch Service Error:', error);
    return res.status(500).json({ success: false, message: 'Server error patching service' });
  }
}

/**
 * 6. Delete Service
 * DELETE /api/services/:id
 */
async function deleteService(req, res) {
  try {
    const { id } = req.params;
    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Clean up image from Firebase Storage if it was uploaded there
    if (service.img) {
      await deleteServiceFromFirebase(service.img);
    }

    await service.destroy();
    return res.json({ success: true, message: 'Service deleted successfully' });

  } catch (error) {
    console.error('Delete Service Error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting service' });
  }
}

/**
 * 7. Upload Service Image
 * POST /service/upload
 * Converts uploaded image to WebP and saves to services/ folder in Firebase Storage
 */
async function uploadServiceImage(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const originalName = req.file.originalname || 'service';
    const result = await uploadServiceToFirebase(req.file.buffer, originalName);

    return res.status(200).json({
      success: true,
      message: 'Service image converted to WebP and uploaded to Firebase Storage',
      data: {
        url: result.url,
        filePath: result.filePath,
        size: result.size,
        originalSize: result.originalSize
      }
    });
  } catch (error) {
    console.error('Upload Service Image Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  patchService,
  deleteService,
  uploadServiceImage
};
