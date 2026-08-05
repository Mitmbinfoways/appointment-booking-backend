const express = require("express");
const router = express.Router();
const userManagementController = require("../Controllers/userManagement.controller");

router.get("/", userManagementController.getSubUsers);
router.get("/medical-users", userManagementController.getMedicalSubUsers);
router.post("/", userManagementController.createSubUser);
router.put("/:id", userManagementController.updateSubUser);
router.patch(
  "/:id/toggle-active",
  userManagementController.toggleSubUserActive,
);
router.delete("/:id", userManagementController.deleteSubUser);

module.exports = router;
