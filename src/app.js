const express = require("express");
const cors = require("cors");
const path = require("path");
const ApiError = require("./Utils/ApiError");
const ApiResponse = require("./Utils/ApiResponse");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

// Import Routes
const userRoutes = require("./Routes/user.routes");
const holidayRoutes = require("./Routes/holiday.routes");
const bookingRoutes = require("./Routes/booking.routes");
const userModuleRoutes = require("./Routes/userModule.routes");
const medicineRoutes = require("./Routes/medicine.routes");
const userManagementRoutes = require("./Routes/userManagement.routes");

// Register Routes
app.use("/api/holidays", holidayRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/user-modules", userModuleRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/user-management", userManagementRoutes);
app.use("/api", userRoutes);

app.get("/", (req, res) => {
  res.send("Dynamic Appointment Booking API is Running!");
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const errorData = err.errorData || null;

  console.error("API Error Response:", {
    statusCode,
    message,
    errorData,
    stack: err.stack
  });

  res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    errors: errorData
  });
});

module.exports = app;

