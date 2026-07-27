const User = require("../Models/User");
const SlotSettings = require("../Models/SlotSettings");
const FormConfig = require("../Models/FormConfig");
const Booking = require("../Models/Booking");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const ApiError = require("../Utils/ApiError");
const ApiResponse = require("../Utils/ApiResponse");

const generateUniqueKey = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  for (let i = 0; i < 12; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};

// ==========================================
// 1. Authentication & Common Endpoints
// ==========================================

// Login (Admins and SuperAdmins)
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ApiError(400, "Email and password are required."));
    }

    const admin = await User.findOne({ email, isDeleted: false });
    if (!admin) {
      return next(new ApiError(401, "Invalid email or password."));
    }

    if (!admin.isActive) {
      return next(new ApiError(403, "Account is deactivated."));
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return next(new ApiError(401, "Invalid email or password."));
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET || "s5AUmDxD6NftPCHmeet.mbinfoways@gmail.com",
      { expiresIn: process.env.JWT_EXPIRESIN || "1d" },
    );

    const adminObj = admin.toObject();
    delete adminObj.password;

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { admin: adminObj, token },
          "Logged in successfully.",
        ),
      );
  } catch (error) {
    next(error);
  }
};

// Get profile
const getProfile = async (req, res, next) => {
  try {
    const adminObj = req.user.toObject();
    delete adminObj.password;
    res
      .status(200)
      .json(new ApiResponse(200, adminObj, "Profile retrieved successfully."));
  } catch (error) {
    next(error);
  }
};

// Update own Profile details
const updateProfile = async (req, res, next) => {
  try {
    const { username, email, businessName, phoneNumber } = req.body;
    const userId = req.user._id;

    // Check if email or username is already taken by someone else
    if (email || username) {
      const orConditions = [];
      if (email) orConditions.push({ email });
      if (username) orConditions.push({ username });

      const existing = await User.findOne({
        _id: { $ne: userId },
        $or: orConditions,
        isDeleted: false,
      });

      if (existing) {
        return next(new ApiError(400, "Username or email is already in use."));
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new ApiError(404, "User not found."));
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (user.role === "Admin" && businessName) {
      user.businessName = businessName;
    }

    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    res
      .status(200)
      .json(new ApiResponse(200, userObj, "Profile updated successfully."));
  } catch (error) {
    next(error);
  }
};

// Update own password
const updatePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return next(
        new ApiError(400, "Old password and new password are required."),
      );
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return next(new ApiError(404, "User not found."));
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return next(new ApiError(400, "Incorrect current password."));
    }

    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json(new ApiResponse(200, null, "Password changed successfully."));
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. SuperAdmin Core Endpoints
// ==========================================

// Create Admin Profile
const createAdmin = async (req, res, next) => {
  try {
    const { username, email, password, businessName, timezone, phoneNumber } = req.body;

    if (!username || !email || !password || !businessName) {
      return next(new ApiError(400, "All fields are required."));
    }

    const existingAdmin = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingAdmin) {
      return next(
        new ApiError(400, "User with this email or username already exists."),
      );
    }

    const admin = new User({
      username,
      email,
      password,
      role: "Admin",
      businessName,
      timezone: timezone || "UTC",
      phoneNumber,
      secretKey: "sec_" + require("crypto").randomBytes(16).toString("hex"),
      createdBy: req.user._id,
    });

    await admin.save();

    // Automatically initialize SlotSettings and FormConfig with defaults for this Admin
    const defaultWorkingDays = [
      { day: "Monday", isOpen: true, startTime: "09:00", endTime: "17:00", breakTimes: [] },
      { day: "Tuesday", isOpen: true, startTime: "09:00", endTime: "17:00", breakTimes: [] },
      { day: "Wednesday", isOpen: true, startTime: "09:00", endTime: "17:00", breakTimes: [] },
      { day: "Thursday", isOpen: true, startTime: "09:00", endTime: "17:00", breakTimes: [] },
      { day: "Friday", isOpen: true, startTime: "09:00", endTime: "17:00", breakTimes: [] },
      { day: "Saturday", isOpen: true, startTime: "09:00", endTime: "17:00", breakTimes: [] },
      { day: "Sunday", isOpen: false, startTime: "09:00", endTime: "17:00", breakTimes: [] },
    ];

    const slotSettings = new SlotSettings({
      adminId: admin._id,
      slotDurationMinutes: 30,
      capacityPerSlot: 1,
      workingDays: defaultWorkingDays,
      breakTimes: [],
    });
    await slotSettings.save();

    const formConfig = new FormConfig({
      adminId: admin._id,
      fields: [
        {
          fieldKey: generateUniqueKey(),
          label: "First Name",
          type: "text",
          required: true,
          order: 0,
        },
        {
          fieldKey: generateUniqueKey(),
          label: "Last Name",
          type: "text",
          required: true,
          order: 1,
        },
        {
          fieldKey: generateUniqueKey(),
          label: "Email",
          type: "email",
          required: true,
          order: 2,
        },
        {
          fieldKey: generateUniqueKey(),
          label: "Phone Number",
          type: "tel",
          required: true,
          order: 3,
        },
      ],
    });
    await formConfig.save();

    const adminObj = admin.toObject();
    delete adminObj.password;

    res
      .status(201)
      .json(
        new ApiResponse(201, adminObj, "Admin profile created successfully."),
      );
  } catch (error) {
    next(error);
  }
};

// Get all non-deleted Admins
const getAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: "Admin", isDeleted: false }).select(
      "-password",
    );

    let modified = false;
    for (const admin of admins) {
      if (!admin.secretKey) {
        admin.secretKey = "sec_" + require("crypto").randomBytes(16).toString("hex");
        await admin.save();
        modified = true;
      }
    }

    const finalAdmins = modified
      ? await User.find({ role: "Admin", isDeleted: false }).select("-password")
      : admins;

    res
      .status(200)
      .json(new ApiResponse(200, finalAdmins, "Admins retrieved successfully."));
  } catch (error) {
    next(error);
  }
};

// Update Admin info
const updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, email, businessName, timezone, phoneNumber } = req.body;

    const admin = await User.findOne({
      _id: id,
      role: "Admin",
      isDeleted: false,
    });
    if (!admin) {
      return next(new ApiError(404, "Admin not found."));
    }

    if (username) admin.username = username;
    if (email) admin.email = email;
    if (businessName) admin.businessName = businessName;
    if (timezone) admin.timezone = timezone;
    if (phoneNumber !== undefined) admin.phoneNumber = phoneNumber;

    await admin.save();

    const adminObj = admin.toObject();
    delete adminObj.password;

    res
      .status(200)
      .json(
        new ApiResponse(200, adminObj, "Admin profile updated successfully."),
      );
  } catch (error) {
    next(error);
  }
};

// Toggle Admin Status
const toggleAdminStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await User.findOne({
      _id: id,
      role: "Admin",
      isDeleted: false,
    });
    if (!admin) {
      return next(new ApiError(404, "Admin not found."));
    }

    admin.isActive = !admin.isActive;
    await admin.save();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isActive: admin.isActive },
          `Admin profile ${admin.isActive ? "activated" : "deactivated"} successfully.`,
        ),
      );
  } catch (error) {
    next(error);
  }
};

// Toggle Admin API Credentials Visibility (SuperAdmin)
const toggleAdminApiCredentials = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await User.findOne({
      _id: id,
      role: "Admin",
      isDeleted: false,
    });
    if (!admin) {
      return next(new ApiError(404, "Admin not found."));
    }

    admin.showApiCredentials = !admin.showApiCredentials;
    await admin.save();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { showApiCredentials: admin.showApiCredentials },
          `API Credentials visibility turned ${admin.showApiCredentials ? "ON" : "OFF"}.`,
        ),
      );
  } catch (error) {
    next(error);
  }
};

// Soft Delete Admin
const deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await User.findOne({
      _id: id,
      role: "Admin",
      isDeleted: false,
    });
    if (!admin) {
      return next(new ApiError(404, "Admin not found."));
    }

    admin.isDeleted = true;
    admin.isActive = false;
    await admin.save();

    res
      .status(200)
      .json(
        new ApiResponse(200, null, "Admin account soft deleted successfully."),
      );
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. Admin Core Endpoints
// ==========================================

// Get Form Config
const getFormConfig = async (req, res, next) => {
  try {
    const formConfig = await FormConfig.findOne({ adminId: req.user._id });
    if (!formConfig) {
      return next(new ApiError(404, "Form configuration not found."));
    }
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          formConfig,
          "Form configuration retrieved successfully.",
        ),
      );
  } catch (error) {
    next(error);
  }
};

// Update Form Config
const updateFormConfig = async (req, res, next) => {
  try {
    const { fields } = req.body;
    if (!Array.isArray(fields)) {
      return next(new ApiError(400, "Fields must be an array."));
    }

    // Generate unique key if empty, null, undefined or placeholder
    for (const field of fields) {
      if (!field.fieldKey || field.fieldKey.trim() === "" || field.fieldKey.startsWith("custom_field_")) {
        field.fieldKey = generateUniqueKey();
      }

      if (
        !field.label ||
        !field.type ||
        typeof field.order !== "number"
      ) {
        return next(
          new ApiError(
            400,
            "Each field must have label, type, and order.",
          ),
        );
      }
    }

    let formConfig = await FormConfig.findOne({ adminId: req.user._id });
    if (!formConfig) {
      formConfig = new FormConfig({ adminId: req.user._id, fields });
    } else {
      formConfig.fields = fields;
    }

    await formConfig.save();
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          formConfig,
          "Form configuration updated successfully.",
        ),
      );
  } catch (error) {
    next(error);
  }
};

// Get Slot Settings
const getSlotSettings = async (req, res, next) => {
  try {
    const settings = await SlotSettings.findOne({ adminId: req.user._id });
    if (!settings) {
      return next(new ApiError(404, "Slot settings not found."));
    }
    res
      .status(200)
      .json(
        new ApiResponse(200, settings, "Slot settings retrieved successfully."),
      );
  } catch (error) {
    next(error);
  }
};

// Update Slot Settings
const updateSlotSettings = async (req, res, next) => {
  try {
    const { slotDurationMinutes, capacityPerSlot, minAdvanceNoticeMinutes, workingDays, breakTimes } =
      req.body;

    let settings = await SlotSettings.findOne({ adminId: req.user._id });
    if (!settings) {
      settings = new SlotSettings({ adminId: req.user._id });
    }

    if (typeof slotDurationMinutes === "number") {
      if (slotDurationMinutes < 5) {
        return next(new ApiError(400, "Slot duration must be at least 5 minutes."));
      }
      settings.slotDurationMinutes = slotDurationMinutes;
    }
    if (typeof capacityPerSlot === "number") {
      if (capacityPerSlot < 1) {
        return next(new ApiError(400, "Capacity per slot must be at least 1."));
      }
      settings.capacityPerSlot = capacityPerSlot;
    }
    if (typeof minAdvanceNoticeMinutes === "number") {
      if (minAdvanceNoticeMinutes < 0) {
        return next(new ApiError(400, "Minimum advance notice cannot be negative."));
      }
      settings.minAdvanceNoticeMinutes = minAdvanceNoticeMinutes;
    }
    if (Array.isArray(workingDays)) {
      settings.workingDays = workingDays;
      settings.markModified('workingDays');
    }
    if (Array.isArray(breakTimes)) settings.breakTimes = breakTimes;

    await settings.save();
    res
      .status(200)
      .json(
        new ApiResponse(200, settings, "Slot settings updated successfully."),
      );
  } catch (error) {
    next(error);
  }
};

// Get Bookings
const getBookings = async (req, res, next) => {
  try {
    const { status, date, search, startDate, endDate, page = 1, limit = 1000 } = req.query;
    const adminId = req.user._id;

    const idList = [adminId];
    if (mongoose.Types.ObjectId.isValid(adminId)) {
      idList.push(new mongoose.Types.ObjectId(adminId));
    }

    const filter = { adminId: { $in: idList } };

    if (status) filter.status = status;
    if (date) filter.slotDate = date;

    // Date range filter
    if (startDate || endDate) {
      filter.slotDate = filter.slotDate || {};
      if (typeof filter.slotDate === "string") {
        // If exact date was already set, skip range
      } else {
        if (startDate) filter.slotDate.$gte = startDate;
        if (endDate) filter.slotDate.$lte = endDate;
      }
    }

    // Search filter: search across bookingId and dynamicResponses values
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      const formConfig = await FormConfig.findOne({ adminId: req.user._id });
      const searchConditions = [
        { bookingId: searchRegex },
      ];
      if (formConfig && formConfig.fields) {
        formConfig.fields.forEach((field) => {
          if (field.type !== "image" && field.type !== "video") {
            searchConditions.push({
              [`dynamicResponses.${field.fieldKey}`]: searchRegex,
            });
          }
        });
      }
      filter.$or = searchConditions;
    }

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(filter)
      .sort({ slotDate: -1, slotStartTime: 1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          bookings,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
          },
        },
        "Bookings retrieved successfully.",
      ),
    );
  } catch (error) {
    next(error);
  }
};

// Get Admin Bookings for SuperAdmin
const getAdminBookingsSuper = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { status, date, search, startDate, endDate, page = 1, limit = 1000 } = req.query;

    const idList = [adminId];
    if (mongoose.Types.ObjectId.isValid(adminId)) {
      idList.push(new mongoose.Types.ObjectId(adminId));
    }

    const filter = { adminId: { $in: idList } };

    if (status) filter.status = status;
    if (date) filter.slotDate = date;

    // Date range filter
    if (startDate || endDate) {
      filter.slotDate = filter.slotDate || {};
      if (typeof filter.slotDate === "string") {
        // If exact date was already set, skip range
      } else {
        if (startDate) filter.slotDate.$gte = startDate;
        if (endDate) filter.slotDate.$lte = endDate;
      }
    }

    // Search filter
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      const formConfig = await FormConfig.findOne({ adminId });
      const searchConditions = [
        { bookingId: searchRegex },
      ];
      if (formConfig && formConfig.fields) {
        formConfig.fields.forEach((field) => {
          if (field.type !== "image" && field.type !== "video") {
            searchConditions.push({
              [`dynamicResponses.${field.fieldKey}`]: searchRegex,
            });
          }
        });
      }
      filter.$or = searchConditions;
    }

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(filter)
      .sort({ slotDate: -1, slotStartTime: 1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          bookings,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
          },
        },
        "Admin bookings retrieved successfully."
      )
    );
  } catch (error) {
    next(error);
  }
};

// Update Booking
const updateBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { slotDate, slotStartTime, slotEndTime, status, dynamicResponses } =
      req.body;

    const booking = await Booking.findOne({ _id: id, adminId: req.user._id });
    if (!booking) {
      return next(new ApiError(404, "Booking not found or not authorized."));
    }

    if (slotDate) booking.slotDate = slotDate;
    if (slotStartTime) booking.slotStartTime = slotStartTime;
    if (slotEndTime) booking.slotEndTime = slotEndTime;
    if (status) booking.status = status;
    if (dynamicResponses) {
      for (const [key, value] of Object.entries(dynamicResponses)) {
        booking.dynamicResponses.set(key, value);
      }
    }

    await booking.save();
    res
      .status(200)
      .json(new ApiResponse(200, booking, "Booking updated successfully."));
  } catch (error) {
    next(error);
  }
};

// Delete Booking
const deleteBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOneAndDelete({
      _id: id,
      adminId: req.user._id,
    });
    if (!booking) {
      return next(new ApiError(404, "Booking not found or not authorized."));
    }

    res
      .status(200)
      .json(new ApiResponse(200, null, "Booking deleted successfully."));
  } catch (error) {
    next(error);
  }
};

// Update Booking for SuperAdmin
const updateBookingSuper = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { slotDate, slotStartTime, slotEndTime, status, dynamicResponses } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return next(new ApiError(404, "Booking not found."));
    }

    if (slotDate) booking.slotDate = slotDate;
    if (slotStartTime) booking.slotStartTime = slotStartTime;
    if (slotEndTime) booking.slotEndTime = slotEndTime;
    if (status) booking.status = status;
    if (dynamicResponses) {
      for (const [key, value] of Object.entries(dynamicResponses)) {
        booking.dynamicResponses.set(key, value);
      }
    }

    await booking.save();
    res.status(200).json(new ApiResponse(200, booking, "Booking updated successfully."));
  } catch (error) {
    next(error);
  }
};

// Delete Booking for SuperAdmin
const deleteBookingSuper = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByIdAndDelete(id);
    if (!booking) {
      return next(new ApiError(404, "Booking not found."));
    }
    res.status(200).json(new ApiResponse(200, null, "Booking deleted successfully."));
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. SuperAdmin On-behalf Admin Config Endpoints
// ==========================================

// Get Form Config for a specific Admin
const getAdminFormConfigSuper = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const admin = await User.findOne({
      _id: adminId,
      role: "Admin",
      isDeleted: false,
    });
    if (!admin) {
      return next(new ApiError(404, "Admin not found."));
    }

    let formConfig = await FormConfig.findOne({ adminId });
    if (!formConfig) {
      formConfig = new FormConfig({ adminId, fields: [] });
      await formConfig.save();
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, formConfig, "Admin form configuration retrieved."),
      );
  } catch (error) {
    next(error);
  }
};

// Update Form Config for a specific Admin
const updateAdminFormConfigSuper = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { fields } = req.body;

    if (!Array.isArray(fields)) {
      return next(new ApiError(400, "Fields must be an array."));
    }

    for (const field of fields) {
      if (!field.fieldKey || field.fieldKey.trim() === "" || field.fieldKey.startsWith("custom_field_")) {
        field.fieldKey = generateUniqueKey();
      }

      if (
        !field.label ||
        !field.type ||
        typeof field.order !== "number"
      ) {
        return next(
          new ApiError(
            400,
            "Each field must have label, type, and order.",
          ),
        );
      }
    }

    const admin = await User.findOne({
      _id: adminId,
      role: "Admin",
      isDeleted: false,
    });
    if (!admin) {
      return next(new ApiError(404, "Admin not found."));
    }

    let formConfig = await FormConfig.findOne({ adminId });
    if (!formConfig) {
      formConfig = new FormConfig({ adminId, fields });
    } else {
      formConfig.fields = fields;
    }

    await formConfig.save();
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          formConfig,
          "Admin form configuration updated successfully.",
        ),
      );
  } catch (error) {
    next(error);
  }
};

// Get Slot Settings for a specific Admin
const getAdminSlotSettingsSuper = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const admin = await User.findOne({
      _id: adminId,
      role: "Admin",
      isDeleted: false,
    });
    if (!admin) {
      return next(new ApiError(404, "Admin not found."));
    }

    const settings = await SlotSettings.findOne({ adminId });
    if (!settings) {
      return next(new ApiError(404, "Slot settings not found."));
    }

    res
      .status(200)
      .json(new ApiResponse(200, settings, "Admin slot settings retrieved."));
  } catch (error) {
    next(error);
  }
};

// Update Slot Settings for a specific Admin
const updateAdminSlotSettingsSuper = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { slotDurationMinutes, capacityPerSlot, minAdvanceNoticeMinutes, workingDays, breakTimes } =
      req.body;

    const admin = await User.findOne({
      _id: adminId,
      role: "Admin",
      isDeleted: false,
    });
    if (!admin) {
      return next(new ApiError(404, "Admin not found."));
    }

    let settings = await SlotSettings.findOne({ adminId });
    if (!settings) {
      settings = new SlotSettings({ adminId });
    }

    if (typeof slotDurationMinutes === "number") {
      if (slotDurationMinutes < 5) {
        return next(new ApiError(400, "Slot duration must be at least 5 minutes."));
      }
      settings.slotDurationMinutes = slotDurationMinutes;
    }
    if (typeof capacityPerSlot === "number") {
      if (capacityPerSlot < 1) {
        return next(new ApiError(400, "Capacity per slot must be at least 1."));
      }
      settings.capacityPerSlot = capacityPerSlot;
    }
    if (typeof minAdvanceNoticeMinutes === "number") {
      if (minAdvanceNoticeMinutes < 0) {
        return next(new ApiError(400, "Minimum advance notice cannot be negative."));
      }
      settings.minAdvanceNoticeMinutes = minAdvanceNoticeMinutes;
    }
    if (Array.isArray(workingDays)) {
      settings.workingDays = workingDays;
      settings.markModified('workingDays');
    }
    if (Array.isArray(breakTimes)) settings.breakTimes = breakTimes;

    await settings.save();
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          settings,
          "Admin slot settings updated successfully.",
        ),
      );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getProfile,
  updateProfile,
  updatePassword,
  createAdmin,
  getAdmins,
  updateAdmin,
  toggleAdminStatus,
  toggleAdminApiCredentials,
  deleteAdmin,
  getFormConfig,
  updateFormConfig,
  getSlotSettings,
  updateSlotSettings,
  getBookings,
  updateBooking,
  deleteBooking,
  getAdminFormConfigSuper,
  updateAdminFormConfigSuper,
  getAdminSlotSettingsSuper,
  updateAdminSlotSettingsSuper,
  getAdminBookingsSuper,
  updateBookingSuper,
  deleteBookingSuper,
};
