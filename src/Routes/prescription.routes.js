const express = require("express");
const router = express.Router();
const prescriptionController = require("../Controllers/prescription.controller");

// Prescription Endpoints
router.get("/medical/list", prescriptionController.getMedicalPrescriptions);
router.patch("/medical/:id/status", prescriptionController.updateFulfillmentStatus);
router.get("/suggestions/medicines", prescriptionController.getMedicineSuggestions);
router.get("/:bookingId", prescriptionController.getPrescriptionByBooking);
router.post("/", prescriptionController.savePrescription);

module.exports = router;
