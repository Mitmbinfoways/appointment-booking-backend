const express = require("express");
const cors = require("cors");
const path = require("path");
const ApiError = require("./Utils/ApiError");
const ApiResponse = require("./Utils/ApiResponse");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  }),
);
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

// Import Routes
const userRoutes = require("./Routes/user.routes");
const holidayRoutes = require("./Routes/holiday.routes");
const bookingRoutes = require("./Routes/booking.routes");
const userModuleRoutes = require("./Routes/userModule.routes");
const medicineRoutes = require("./Routes/medicine.routes");
const userManagementRoutes = require("./Routes/userManagement.routes");
const prescriptionRoutes = require("./Routes/prescription.routes");
const adminLinkRoutes = require("./Routes/adminLink.routes");

// Register Routes
app.use("/api/holidays", holidayRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/user-modules", userModuleRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/user-management", userManagementRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/admin-links", adminLinkRoutes);
app.use("/api", userRoutes);

app.get("/", (req, res) => {
  res.send("Dynamic Appointment Booking API is Running!");
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";
  const errorData = err.errorData || null;

  if (
    err instanceof RangeError ||
    (message &&
      (message.includes("out of range") ||
        message.includes("too large") ||
        message.includes("entity too large")))
  ) {
    statusCode = 413;
    message =
      "Uploaded file size is too large for transmission. Please select a smaller file (max 5MB for images, 20MB for videos).";
  }

  console.error("API Error Response:", {
    statusCode,
    message,
    errorData,
    stack: err.stack,
  });

  res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    errors: errorData,
  });
});

module.exports = app;
