const Holiday = require('../Models/Holiday');
const ApiError = require('../Utils/ApiError');
const ApiResponse = require('../Utils/ApiResponse');
const { timeToMinutes } = require('../Utils/slotGenerator');

// Create Holiday / Off-Day
const createHoliday = async (req, res, next) => {
  try {
    const { date, holidayType, halfDayType, customStartTime, customEndTime, reason } = req.body;
    if (!date) {
      return next(new ApiError(400, 'Date is required.'));
    }

    const adminTimezone = req.user?.timezone || 'UTC';
    const todayISO = new Date().toLocaleDateString('sv-SE', { timeZone: adminTimezone });
    if (date < todayISO) {
      return next(new ApiError(400, 'Cannot set holidays for past dates.'));
    }

    // Check if holiday already exists for this date and admin
    const existing = await Holiday.findOne({ adminId: req.user._id, date });
    if (existing) {
      return next(new ApiError(400, `Holiday already exists for date ${date}.`));
    }

    const type = holidayType || 'full';
    let isFullDay = true;
    let finalStartTime = undefined;
    let finalEndTime = undefined;

    if (type === 'half') {
      isFullDay = false;
      if (halfDayType === 'first_half') {
        finalStartTime = '13:00';
        finalEndTime = '17:00';
      } else {
        finalStartTime = '09:00';
        finalEndTime = '13:00';
      }
    } else if (type === 'custom') {
      if (!customStartTime || !customEndTime) {
        return next(new ApiError(400, 'customStartTime and customEndTime are required for custom holiday.'));
      }
      if (timeToMinutes(customStartTime) >= timeToMinutes(customEndTime)) {
        return next(new ApiError(400, 'Custom start time must be earlier than end time.'));
      }
      isFullDay = false;
      finalStartTime = customStartTime;
      finalEndTime = customEndTime;
    }

    const holiday = new Holiday({
      adminId: req.user._id,
      date,
      holidayType: type,
      halfDayType: type === 'half' ? halfDayType : undefined,
      isFullDay,
      customStartTime: finalStartTime,
      customEndTime: finalEndTime,
      reason
    });

    await holiday.save();
    res.status(201).json(new ApiResponse(201, holiday, 'Holiday created successfully.'));
  } catch (error) {
    next(error);
  }
};

// Update Holiday
const updateHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, holidayType, halfDayType, customStartTime, customEndTime, reason } = req.body;

    const holiday = await Holiday.findOne({ _id: id, adminId: req.user._id });
    if (!holiday) {
      return next(new ApiError(404, 'Holiday not found or not authorized.'));
    }

    if (date) holiday.date = date;
    if (reason !== undefined) holiday.reason = reason;

    if (holidayType) {
      holiday.holidayType = holidayType;
      if (holidayType === 'full') {
        holiday.isFullDay = true;
        holiday.halfDayType = null;
        holiday.customStartTime = undefined;
        holiday.customEndTime = undefined;
      } else if (holidayType === 'half') {
        holiday.isFullDay = false;
        holiday.halfDayType = halfDayType || holiday.halfDayType || 'first_half';
        if (holiday.halfDayType === 'first_half') {
          holiday.customStartTime = '13:00';
          holiday.customEndTime = '17:00';
        } else {
          holiday.customStartTime = '09:00';
          holiday.customEndTime = '13:00';
        }
      } else if (holidayType === 'custom') {
        holiday.isFullDay = false;
        holiday.halfDayType = null;
        if (customStartTime) holiday.customStartTime = customStartTime;
        if (customEndTime) holiday.customEndTime = customEndTime;
      }
    } else {
      if (holiday.holidayType === 'half' && halfDayType) {
        holiday.halfDayType = halfDayType;
        if (halfDayType === 'first_half') {
          holiday.customStartTime = '13:00';
          holiday.customEndTime = '17:00';
        } else {
          holiday.customStartTime = '09:00';
          holiday.customEndTime = '13:00';
        }
      } else if (holiday.holidayType === 'custom') {
        if (customStartTime) holiday.customStartTime = customStartTime;
        if (customEndTime) holiday.customEndTime = customEndTime;
      }
    }

    await holiday.save();
    res.status(200).json(new ApiResponse(200, holiday, 'Holiday updated successfully.'));
  } catch (error) {
    next(error);
  }
};

// Get Holidays
const getHolidays = async (req, res, next) => {
  try {
    const holidays = await Holiday.find({ adminId: req.user._id }).sort({ date: 1 });
    res.status(200).json(new ApiResponse(200, holidays, 'Holidays retrieved successfully.'));
  } catch (error) {
    next(error);
  }
};

// Delete Holiday
const deleteHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findOneAndDelete({ _id: id, adminId: req.user._id });
    if (!holiday) {
      return next(new ApiError(404, 'Holiday not found or not authorized.'));
    }

    res.status(200).json(new ApiResponse(200, null, 'Holiday deleted successfully.'));
  } catch (error) {
    next(error);
  }
};

// Get Admin Holidays (SuperAdmin on-behalf)
const getAdminHolidaysSuper = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const holidays = await Holiday.find({ adminId }).sort({ date: 1 });
    res.status(200).json(new ApiResponse(200, holidays, 'Admin holidays retrieved successfully.'));
  } catch (error) {
    next(error);
  }
};

// Create Admin Holiday (SuperAdmin on-behalf)
const createAdminHolidaySuper = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { date, holidayType, halfDayType, customStartTime, customEndTime, reason } = req.body;
    if (!date) {
      return next(new ApiError(400, 'Date is required.'));
    }

    const todayISO = new Date().toISOString().split('T')[0];
    if (date < todayISO) {
      return next(new ApiError(400, 'Cannot set holidays for past dates.'));
    }

    const existing = await Holiday.findOne({ adminId, date });
    if (existing) {
      return next(new ApiError(400, `Holiday already exists for date ${date}.`));
    }

    const type = holidayType || 'full';
    let isFullDay = true;
    let finalStartTime = undefined;
    let finalEndTime = undefined;

    if (type === 'half') {
      isFullDay = false;
      if (halfDayType === 'first_half') {
        finalStartTime = '13:00';
        finalEndTime = '17:00';
      } else {
        finalStartTime = '09:00';
        finalEndTime = '13:00';
      }
    } else if (type === 'custom') {
      isFullDay = false;
      finalStartTime = customStartTime;
      finalEndTime = customEndTime;
    }

    const holiday = new Holiday({
      adminId,
      date,
      holidayType: type,
      halfDayType: type === 'half' ? halfDayType : undefined,
      isFullDay,
      customStartTime: finalStartTime,
      customEndTime: finalEndTime,
      reason
    });

    await holiday.save();
    res.status(201).json(new ApiResponse(201, holiday, 'Holiday created successfully.'));
  } catch (error) {
    next(error);
  }
};

// Update Admin Holiday (SuperAdmin on-behalf)
const updateAdminHolidaySuper = async (req, res, next) => {
  try {
    const { adminId, id } = req.params;
    const { date, holidayType, halfDayType, customStartTime, customEndTime, reason } = req.body;

    const holiday = await Holiday.findOne({ _id: id, adminId });
    if (!holiday) {
      return next(new ApiError(404, 'Holiday not found for this admin.'));
    }

    if (date) holiday.date = date;
    if (reason !== undefined) holiday.reason = reason;

    if (holidayType) {
      holiday.holidayType = holidayType;
      if (holidayType === 'full') {
        holiday.isFullDay = true;
        holiday.halfDayType = null;
        holiday.customStartTime = undefined;
        holiday.customEndTime = undefined;
      } else if (holidayType === 'half') {
        holiday.isFullDay = false;
        holiday.halfDayType = halfDayType || holiday.halfDayType || 'first_half';
        if (holiday.halfDayType === 'first_half') {
          holiday.customStartTime = '13:00';
          holiday.customEndTime = '17:00';
        } else {
          holiday.customStartTime = '09:00';
          holiday.customEndTime = '13:00';
        }
      } else if (holidayType === 'custom') {
        holiday.isFullDay = false;
        holiday.halfDayType = null;
        if (customStartTime) holiday.customStartTime = customStartTime;
        if (customEndTime) holiday.customEndTime = customEndTime;
      }
    } else {
      if (holiday.holidayType === 'half' && halfDayType) {
        holiday.halfDayType = halfDayType;
        if (halfDayType === 'first_half') {
          holiday.customStartTime = '13:00';
          holiday.customEndTime = '17:00';
        } else {
          holiday.customStartTime = '09:00';
          holiday.customEndTime = '13:00';
        }
      } else if (holiday.holidayType === 'custom') {
        if (customStartTime) holiday.customStartTime = customStartTime;
        if (customEndTime) holiday.customEndTime = customEndTime;
      }
    }

    await holiday.save();
    res.status(200).json(new ApiResponse(200, holiday, 'Holiday updated successfully.'));
  } catch (error) {
    next(error);
  }
};

// Delete Admin Holiday (SuperAdmin on-behalf)
const deleteAdminHolidaySuper = async (req, res, next) => {
  try {
    const { adminId, id } = req.params;
    const holiday = await Holiday.findOneAndDelete({ _id: id, adminId });
    if (!holiday) {
      return next(new ApiError(404, 'Holiday not found.'));
    }
    res.status(200).json(new ApiResponse(200, null, 'Holiday deleted successfully.'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
  getAdminHolidaysSuper,
  createAdminHolidaySuper,
  updateAdminHolidaySuper,
  deleteAdminHolidaySuper
};
