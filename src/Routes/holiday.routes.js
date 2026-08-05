const express = require("express");
const router = express.Router();
const { verifyToken, restrictTo } = require("../Middlewares/auth.middleware");
const {
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
  getAdminHolidaysSuper,
  createAdminHolidaySuper,
  updateAdminHolidaySuper,
  deleteAdminHolidaySuper,
} = require("../Controllers/holiday.controller");

router.use(verifyToken);

// Admin standard routes
router.post("/", restrictTo("Admin", "SuperAdmin"), createHoliday);
router.get("/", restrictTo("Admin", "SuperAdmin"), getHolidays);
router.put("/:id", restrictTo("Admin", "SuperAdmin"), updateHoliday);
router.delete("/:id", restrictTo("Admin", "SuperAdmin"), deleteHoliday);

// SuperAdmin on-behalf routes
router.get("/admin/:adminId", restrictTo("SuperAdmin"), getAdminHolidaysSuper);
router.post(
  "/admin/:adminId",
  restrictTo("SuperAdmin"),
  createAdminHolidaySuper,
);
router.put(
  "/admin/:adminId/:id",
  restrictTo("SuperAdmin"),
  updateAdminHolidaySuper,
);
router.delete(
  "/admin/:adminId/:id",
  restrictTo("SuperAdmin"),
  deleteAdminHolidaySuper,
);

module.exports = router;
