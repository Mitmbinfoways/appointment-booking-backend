const express = require('express');
const router = express.Router();
const {
  getPublicFormConfig,
  getAvailableSlots,
  createBooking,
  getPublicHolidays,
  getPublicSlotSettings
} = require('../Controllers/booking.controller');

router.get('/form-config/:adminId', getPublicFormConfig);
router.get('/available-slots/:adminId', getAvailableSlots);
router.get('/holidays/:adminId', getPublicHolidays);
router.get('/slot-settings/:adminId', getPublicSlotSettings);
router.post('/:adminId', createBooking);

module.exports = router;
