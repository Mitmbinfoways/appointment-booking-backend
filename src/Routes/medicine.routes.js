const express = require("express");
const router = express.Router();
const medicineController = require("../Controllers/medicine.controller");

router.get("/", medicineController.getMedicines);
router.post("/", medicineController.createMedicine);
router.put("/:id", medicineController.updateMedicine);
router.delete("/:id", medicineController.deleteMedicine);

module.exports = router;
