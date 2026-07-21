const express = require('express');
const router = express.Router();
const {
  getPublicFormConfig,
  getAvailableSlots,
  createBooking
} = require('../Controllers/booking.controller');

router.get('/form-config/:adminId', getPublicFormConfig);
router.get('/available-slots/:adminId', getAvailableSlots);
router.post('/:adminId', createBooking);

module.exports = router;
