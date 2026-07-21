const express = require('express');
const router = express.Router();
const { verifyToken, restrictTo } = require('../Middlewares/auth.middleware');
const {
  login,
  getProfile,
  updateProfile,
  updatePassword,
  createAdmin,
  getAdmins,
  updateAdmin,
  toggleAdminStatus,
  deleteAdmin,
  getFormConfig,
  updateFormConfig,
  getSlotSettings,
  updateSlotSettings,
  getBookings,
  updateBooking,
  deleteBooking,
  getAdminFormConfigSuper,
  updateAdminFormConfigSuper,
  getAdminSlotSettingsSuper,
  updateAdminSlotSettingsSuper,
  getAdminBookingsSuper,
  updateBookingSuper,
  deleteBookingSuper
} = require('../Controllers/user.controller');

// ==========================================
// 1. Public Auth Routes
// ==========================================
router.post('/admin/auth/login', login);

// ==========================================
// 2. Private Token-Required Routes
// ==========================================
router.use(verifyToken);

// Common Profile Settings (Admins & SuperAdmins)
router.get('/admin/profile', getProfile);
router.put('/admin/profile', updateProfile);
router.put('/admin/profile/change-password', updatePassword);

// ==========================================
// 3. SuperAdmin Restricted Routes
// ==========================================
router.post('/superadmin/admins', restrictTo('SuperAdmin'), createAdmin);
router.get('/superadmin/admins', restrictTo('SuperAdmin'), getAdmins);
router.put('/superadmin/admins/:id', restrictTo('SuperAdmin'), updateAdmin);
router.put('/superadmin/admins/:id/toggle', restrictTo('SuperAdmin'), toggleAdminStatus);
router.delete('/superadmin/admins/:id', restrictTo('SuperAdmin'), deleteAdmin);

router.get('/superadmin/form-config/:adminId', restrictTo('SuperAdmin'), getAdminFormConfigSuper);
router.put('/superadmin/form-config/:adminId', restrictTo('SuperAdmin'), updateAdminFormConfigSuper);
router.get('/superadmin/slot-settings/:adminId', restrictTo('SuperAdmin'), getAdminSlotSettingsSuper);
router.put('/superadmin/slot-settings/:adminId', restrictTo('SuperAdmin'), updateAdminSlotSettingsSuper);
router.get('/superadmin/bookings/:adminId', restrictTo('SuperAdmin'), getAdminBookingsSuper);
router.put('/superadmin/bookings/:id', restrictTo('SuperAdmin'), updateBookingSuper);
router.delete('/superadmin/bookings/:id', restrictTo('SuperAdmin'), deleteBookingSuper);

// ==========================================
// 4. Admin Restricted Routes
// ==========================================
router.get('/admin/form-config', restrictTo('Admin'), getFormConfig);
router.put('/admin/form-config', restrictTo('Admin'), updateFormConfig);

router.get('/admin/slot-settings', restrictTo('Admin'), getSlotSettings);
router.put('/admin/slot-settings', restrictTo('Admin'), updateSlotSettings);

router.get('/admin/bookings', restrictTo('Admin'), getBookings);
router.put('/admin/bookings/:id', restrictTo('Admin'), updateBooking);
router.delete('/admin/bookings/:id', restrictTo('Admin'), deleteBooking);

module.exports = router;
