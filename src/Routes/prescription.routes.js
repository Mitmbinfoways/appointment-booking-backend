const express = require("express");
const router = express.Router();
const prescriptionController = require("../Controllers/prescription.controller");

// Prescription Endpoints
router.get("/:bookingId", prescriptionController.getPrescriptionByBooking);
router.post("/", prescriptionController.savePrescription);

module.exports = router;
