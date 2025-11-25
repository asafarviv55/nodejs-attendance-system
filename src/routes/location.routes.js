const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

router.get('/', locationController.getLocations);
router.post('/', verifyToken, isAdmin, locationController.addLocation);
router.delete('/:index', verifyToken, isAdmin, locationController.deleteLocation);

module.exports = router;
