const userService = require('../services/user.service');

const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    await userService.updateUser(id, email);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ success: false, message: 'Role ID is required' });
    }

    await userService.updateUserRole(id, roleId);
    res.json({ success: true, message: 'User role updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    await userService.updateProfile(req.userId, email, password);
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
};

const getAllRoles = async (req, res, next) => {
  try {
    const roles = await userService.getAllRoles();
    res.json({ success: true, roles });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getProfile,
  updateUser,
  updateUserRole,
  deleteUser,
  updateProfile,
  getAllRoles,
};
