const express = require("express");
const router = express.Router();
const { verifyToken } = require("../Middlewares/auth.middleware");
const {
  createLink,
  getLinkedAdmins,
  getLinkedMedicalAdmins,
  removeLink,
  toggleLinkStatus,
} = require("../Controllers/adminLink.controller");

// All admin-link routes require authentication
router.use(verifyToken);

router.post("/", createLink);
router.get("/:adminId", getLinkedAdmins);
router.get("/:adminId/medical", getLinkedMedicalAdmins);
router.put("/:linkId/toggle", toggleLinkStatus);
router.delete("/:linkId", removeLink);

module.exports = router;
