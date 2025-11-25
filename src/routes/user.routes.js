const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

router.get('/', verifyToken, isAdmin, userController.getAllUsers);
router.get('/roles', verifyToken, isAdmin, userController.getAllRoles);
router.put('/:id', verifyToken, isAdmin, userController.updateUser);
router.put('/:id/role', verifyToken, isAdmin, userController.updateUserRole);
router.delete('/:id', verifyToken, isAdmin, userController.deleteUser);

module.exports = router;
