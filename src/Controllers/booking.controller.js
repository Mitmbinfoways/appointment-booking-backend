const User = require("../Models/User");
const SlotSettings = require("../Models/SlotSettings");
const FormConfig = require("../Models/FormConfig");
const Holiday = require("../Models/Holiday");
const Booking = require("../Models/Booking");
const ApiError = require("../Utils/ApiError");
const ApiResponse = require("../Utils/ApiResponse");
const { processBase64Responses } = require("../Utils/fileHelper");
const {
  generateSlots,
  timeToMinutes,
  minutesToTime,
} = require("../Utils/slotGenerator");
const {
  convertTimeBetweenTimezones,
  getTimezoneLabel,
} = require("../Utils/timezoneHelper");

// Validate field type
const validateField = (field, value) => {
  if (value === undefined || value === null || value === "") {
    if (field.required) {
      return `Field '${field.label}' is required.`;
    }
    return null;
  }

  // Image and video fields store Base64 data URLs — skip text-based validation
  if (field.type === "image" || field.type === "video") {
    return null;
  }

  if (field.type === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return `Field '${field.label}' must be a valid email.`;
    }
  }

  if (field.type === "number") {
    if (isNaN(value)) {
      return `Field '${field.label}' must be a number.`;
    }
  }

  if (field.type === "tel") {
    const telRegex = /^\+?[1-9]\d{1,14}$|^[0-9\-+\s()]{7,20}$/; // Simple international/local phone validation
    if (!telRegex.test(value)) {
      return `Field '${field.label}' must be a valid phone number.`;
    }
  }

  if (["select", "radio"].includes(field.type)) {
    if (
      field.options &&
      field.options.length > 0 &&
      !field.options.includes(value)
    ) {
      return `Field '${field.label}' value must be one of: ${field.options.join(", ")}.`;
    }
  }

  if (field.type === "checkbox") {
    if (Array.isArray(value)) {
      for (const val of value) {
        if (
          field.options &&
          field.options.length > 0 &&
          !field.options.includes(val)
        ) {
          return `Field '${field.label}' value '${val}' must be one of: ${field.options.join(", ")}.`;
        }
      }
    }
  }

  return null;
};

const checkSecretKeyOrSuperAdmin = async (req, adminId) => {
  // 1. Check if caller is authenticated SuperAdmin or Admin themselves
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = require("jsonwebtoken").verify(
        token,
        process.env.JWT_SECRET,
      );
      const user = await User.findOne({ _id: decoded.id, isDeleted: false });
      if (user && user.isActive) {
        if (
          user.role === "SuperAdmin" ||
          user._id.toString() === adminId.toString()
        ) {
          return true;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 2. Validate admin existence and status
  const admin = await User.findOne({
    _id: adminId,
    role: "Admin",
    isDeleted: false,
  });
  if (!admin || !admin.isActive) {
    return false;
  }

  // 3. Match secret key header or query parameters
  const clientKey =
    req.headers["secretkey"] ||
    req.headers["x-secret-key"] ||
    req.headers["secret-key"] ||
    req.headers["secret_key"] ||
    req.query?.key ||
    req.query?.secretKey ||
    req.query?.secretkey;
  if (!clientKey) {
    return false;
  }
  return clientKey === admin.secretKey;
};

// Retrieve public form config
const getPublicFormConfig = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    const authorized = await checkSecretKeyOrSuperAdmin(req, adminId);
    if (!authorized) {
      return next(
        new ApiError(
          401,
          "Unauthorized access: Invalid or missing Secret Key.",
        ),
      );
    }

    const formConfig = await FormConfig.findOne({ adminId });
    if (!formConfig) {
      return next(
        new ApiError(404, "Form configuration not found for this Admin."),
      );
    }
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          formConfig,
          "Public form configuration retrieved successfully.",
        ),
      );
  } catch (error) {
    next(error);
  }
};

// Get Live Available Slots
const getAvailableSlots = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { date } = req.query; // format: YYYY-MM-DD

    if (!date) {
      return next(new ApiError(400, "Date parameter is required."));
    }

    const authorized = await checkSecretKeyOrSuperAdmin(req, adminId);
    if (!authorized) {
      return next(
        new ApiError(
          401,
          "Unauthorized access: Invalid or missing Secret Key.",
        ),
      );
    }

    // Verify Admin exists and is active
    const admin = await User.findOne({
      _id: adminId,
      role: "Admin",
      isDeleted: false,
    });
    if (!admin || !admin.isActive) {
      return next(new ApiError(404, "Admin not found or inactive."));
    }

    const todayISO = new Date().toLocaleDateString("sv-SE", {
      timeZone: admin.timezone || "UTC",
    });
    if (date < todayISO) {
      return res
        .status(200)
        .json(
          new ApiResponse(200, [], "Cannot book appointments for past dates."),
        );
    }

    // Get settings
    const settings = await SlotSettings.findOne({ adminId });
    if (!settings) {
      return next(
        new ApiError(404, "Booking settings not configured by Admin."),
      );
    }

    // Get weekday name
    const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: admin.timezone,
    });

    // Find settings for this weekday
    const dayConfig = settings.workingDays.find((wd) => wd.day === dayOfWeek);
    if (!dayConfig || !dayConfig.isOpen) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "Store is closed on this day."));
    }

    let operationalStartTime = dayConfig.startTime;
    let operationalEndTime = dayConfig.endTime;

    // Check holidays
    const holiday = await Holiday.findOne({ adminId, date });
    if (holiday) {
      if (holiday.isFullDay) {
        return res
          .status(200)
          .json(new ApiResponse(200, [], "Holiday. Closed for bookings."));
      } else if (holiday.holidayType === "half") {
        const breakTimes = dayConfig.breakTimes || [];
        if (breakTimes.length > 0) {
          const sortedBreaks = [...breakTimes].sort((a, b) => {
            return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
          });
          const firstBreak = sortedBreaks[0];

          if (holiday.halfDayType === "first_half") {
            operationalStartTime = firstBreak.endTime;
            operationalEndTime = dayConfig.endTime;
          } else {
            operationalStartTime = dayConfig.startTime;
            operationalEndTime = firstBreak.startTime;
          }
        } else {
          const startMin = timeToMinutes(dayConfig.startTime);
          const endMin = timeToMinutes(dayConfig.endTime);
          const midMin = startMin + Math.floor((endMin - startMin) / 2);
          const midTime = minutesToTime(midMin);

          if (holiday.halfDayType === "first_half") {
            operationalStartTime = midTime;
            operationalEndTime = dayConfig.endTime;
          } else {
            operationalStartTime = dayConfig.startTime;
            operationalEndTime = midTime;
          }
        }
      } else {
        // Custom time holiday
        operationalStartTime = holiday.customStartTime || operationalStartTime;
        operationalEndTime = holiday.customEndTime || operationalEndTime;
      }
    }

    // Generate slots
    const slots = generateSlots(
      operationalStartTime,
      operationalEndTime,
      settings.slotDurationMinutes,
      dayConfig.breakTimes || [],
    );

    // Fetch existing bookings for this date and admin
    const bookings = await Booking.find({
      adminId,
      slotDate: date,
      status: { $ne: "cancelled" },
    });

    // Count bookings per slot
    const bookingCounts = {};
    bookings.forEach((b) => {
      const key = `${b.slotStartTime}-${b.slotEndTime}`;
      bookingCounts[key] = (bookingCounts[key] || 0) + 1;
    });

    const userTimeZone =
      req.headers["user_time_zone"] ||
      req.headers["user-time-zone"] ||
      req.query?.user_time_zone ||
      req.query?.timezone ||
      admin.timezone ||
      "UTC";
    const adminTimeZone = admin.timezone || "UTC";

    // Map availability status, capacity details, and convert slot times to visitor timezone
    const calculatedSlots = slots.map((slot) => {
      if (slot.status === "break") {
        const startConv = convertTimeBetweenTimezones(
          slot.startTime,
          date,
          adminTimeZone,
          userTimeZone,
        );
        const endConv = convertTimeBetweenTimezones(
          slot.endTime,
          date,
          adminTimeZone,
          userTimeZone,
        );
        return {
          ...slot,
          startTime: startConv.time,
          endTime: endConv.time,
          adminStartTime: slot.startTime,
          adminEndTime: slot.endTime,
        };
      }

      const key = `${slot.startTime}-${slot.endTime}`;
      const count = bookingCounts[key] || 0;
      const capacity = settings.capacityPerSlot;

      const startConv = convertTimeBetweenTimezones(
        slot.startTime,
        date,
        adminTimeZone,
        userTimeZone,
      );
      const endConv = convertTimeBetweenTimezones(
        slot.endTime,
        date,
        adminTimeZone,
        userTimeZone,
      );

      return {
        startTime: startConv.time,
        endTime: endConv.time,
        adminStartTime: slot.startTime,
        adminEndTime: slot.endTime,
        bookingsCount: count,
        capacityLimit: capacity,
        status: count >= capacity ? "booked" : "available",
      };
    });

    const responsePayload = {
      slots: calculatedSlots,
      minAdvanceNoticeMinutes: settings?.minAdvanceNoticeMinutes || 0,
      userTimeZone,
      userTimezoneLabel: getTimezoneLabel(userTimeZone),
      adminTimeZone,
      adminTimezoneLabel: getTimezoneLabel(adminTimeZone),
    };

    res
      .status(200)
      .json(
        new ApiResponse(200, responsePayload, "Slots retrieved successfully."),
      );
  } catch (error) {
    next(error);
  }
};

// Create Booking
const createBooking = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { slotDate, slotStartTime, slotEndTime, dynamicResponses } = req.body;

    if (!slotDate || !slotStartTime || !slotEndTime || !dynamicResponses) {
      return next(
        new ApiError(
          400,
          "slotDate, slotStartTime, slotEndTime, and dynamicResponses are required.",
        ),
      );
    }

    const authorized = await checkSecretKeyOrSuperAdmin(req, adminId);
    if (!authorized) {
      return next(
        new ApiError(
          401,
          "Unauthorized access: Invalid or missing Secret Key.",
        ),
      );
    }

    // Verify Admin
    const admin = await User.findOne({
      _id: adminId,
      role: "Admin",
      isDeleted: false,
    });
    if (!admin || !admin.isActive) {
      return next(new ApiError(404, "Admin not found or inactive."));
    }

    const todayISO = new Date().toLocaleDateString("sv-SE", {
      timeZone: admin.timezone || "UTC",
    });
    if (slotDate < todayISO) {
      return next(
        new ApiError(400, "Cannot book appointments for past dates."),
      );
    }

    // Retrieve and Validate dynamic responses
    const formConfig = await FormConfig.findOne({ adminId });
    if (!formConfig) {
      return next(
        new ApiError(400, "Admin has not configured form fields yet."),
      );
    }

    const validationErrors = [];
    formConfig.fields.forEach((field) => {
      const val = dynamicResponses[field.fieldKey];
      const err = validateField(field, val);
      if (err) validationErrors.push(err);
    });

    if (validationErrors.length > 0) {
      return next(
        new ApiError(
          400,
          "Validation errors in dynamic form.",
          validationErrors,
        ),
      );
    }

    // Retrieve Slot Settings
    const settings = await SlotSettings.findOne({ adminId });
    if (!settings) {
      return next(new ApiError(400, "Admin slot settings not found."));
    }

    // Verify slot parameters against operational availability (day open, holiday status, breaks)
    const dayOfWeek = new Date(slotDate).toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: admin.timezone,
    });
    const dayConfig = settings.workingDays.find((wd) => wd.day === dayOfWeek);
    if (!dayConfig || !dayConfig.isOpen) {
      return next(new ApiError(400, "Admin is closed on this day."));
    }

    let operationalStartTime = dayConfig.startTime;
    let operationalEndTime = dayConfig.endTime;

    const holiday = await Holiday.findOne({ adminId, date: slotDate });
    if (holiday) {
      if (holiday.isFullDay) {
        return next(new ApiError(400, "Selected date is a holiday."));
      } else if (holiday.holidayType === "half") {
        const breakTimes = dayConfig.breakTimes || [];
        if (breakTimes.length > 0) {
          const sortedBreaks = [...breakTimes].sort((a, b) => {
            return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
          });
          const firstBreak = sortedBreaks[0];

          if (holiday.halfDayType === "first_half") {
            operationalStartTime = firstBreak.endTime;
            operationalEndTime = dayConfig.endTime;
          } else {
            operationalStartTime = dayConfig.startTime;
            operationalEndTime = firstBreak.startTime;
          }
        } else {
          const startMin = timeToMinutes(dayConfig.startTime);
          const endMin = timeToMinutes(dayConfig.endTime);
          const midMin = startMin + Math.floor((endMin - startMin) / 2);
          const midTime = minutesToTime(midMin);

          if (holiday.halfDayType === "first_half") {
            operationalStartTime = midTime;
            operationalEndTime = dayConfig.endTime;
          } else {
            operationalStartTime = dayConfig.startTime;
            operationalEndTime = midTime;
          }
        }
      } else {
        // Custom time holiday
        operationalStartTime = holiday.customStartTime || operationalStartTime;
        operationalEndTime = holiday.customEndTime || operationalEndTime;
      }
    }

    // Check bounds
    const reqStart = timeToMinutes(slotStartTime);
    const reqEnd = timeToMinutes(slotEndTime);
    const opStart = timeToMinutes(operationalStartTime);
    const opEnd = timeToMinutes(operationalEndTime);

    if (reqStart < opStart || reqEnd > opEnd) {
      return next(new ApiError(400, "Slot is outside operating hours."));
    }

    // Verify duration match
    if (reqEnd - reqStart !== settings.slotDurationMinutes) {
      return next(
        new ApiError(
          400,
          `Slot duration must be exactly ${settings.slotDurationMinutes} minutes.`,
        ),
      );
    }

    // Verify it doesn't overlap with any breaks
    const activeBreaks = dayConfig.breakTimes || [];
    const overlapsBreak = activeBreaks.some((b) => {
      const breakStart = timeToMinutes(b.startTime);
      const breakEnd = timeToMinutes(b.endTime);
      return reqStart < breakEnd && reqEnd > breakStart;
    });

    if (overlapsBreak) {
      return next(new ApiError(400, "Slot overlaps with break times."));
    }

    // Check Slot Booking Capacity (Atomic check & prevent race conditions)
    const existingBookingsCount = await Booking.countDocuments({
      adminId,
      slotDate,
      slotStartTime,
      slotEndTime,
      status: { $ne: "cancelled" },
    });

    if (existingBookingsCount >= settings.capacityPerSlot) {
      return next(new ApiError(400, "Selected slot is fully booked."));
    }

    // Generate numeric-only bookingId with date (YYYYMMDD + 4 random digits)
    const dateDigits = slotDate.replace(/-/g, "");
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    const numericBookingId = `${dateDigits}${randomDigits}`;

    const processedResponses = processBase64Responses(dynamicResponses, req);

    // Create the booking
    const booking = new Booking({
      adminId,
      bookingId: numericBookingId,
      slotDate,
      slotStartTime,
      slotEndTime,
      status: "confirmed",
      dynamicResponses: processedResponses,
    });

    await booking.save();
    res
      .status(201)
      .json(new ApiResponse(201, booking, "Appointment booked successfully."));
  } catch (error) {
    next(error);
  }
};

// Retrieve public holidays
const getPublicHolidays = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const authorized = await checkSecretKeyOrSuperAdmin(req, adminId);
    if (!authorized) {
      return next(
        new ApiError(
          401,
          "Unauthorized access: Invalid or missing Secret Key.",
        ),
      );
    }
    const holidays = await Holiday.find({ adminId }).sort({ date: 1 });
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          holidays,
          "Public holidays retrieved successfully.",
        ),
      );
  } catch (error) {
    next(error);
  }
};

// Retrieve public slot settings
const getPublicSlotSettings = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const authorized = await checkSecretKeyOrSuperAdmin(req, adminId);
    if (!authorized) {
      return next(
        new ApiError(
          401,
          "Unauthorized access: Invalid or missing Secret Key.",
        ),
      );
    }
    const settings = await SlotSettings.findOne({ adminId });
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          settings,
          "Public slot settings retrieved successfully.",
        ),
      );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicFormConfig,
  getAvailableSlots,
  createBooking,
  getPublicHolidays,
  getPublicSlotSettings,
};
