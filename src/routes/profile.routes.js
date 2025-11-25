const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', verifyToken, userController.getProfile);
router.put('/', verifyToken, userController.updateProfile);

module.exports = router;
