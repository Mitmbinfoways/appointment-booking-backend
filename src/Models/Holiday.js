const mongoose = require("mongoose");

const HolidaySchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String, // Format: "YYYY-MM-DD"
      required: true,
    },
    holidayType: {
      type: String,
      enum: ["full", "half", "custom"],
      default: "full",
    },
    halfDayType: {
      type: String, // 'first_half' or 'second_half'
      enum: ["first_half", "second_half", null],
      default: null,
    },
    isFullDay: {
      type: Boolean,
      default: true,
    },
    // If isFullDay is false, admin configures custom hours they are available/unavailable
    customStartTime: {
      type: String, // Format: "HH:MM", e.g., "13:00"
    },
    customEndTime: {
      type: String, // Format: "HH:MM", e.g., "17:00"
    },
    reason: {
      type: String,
    },
  },
  { timestamps: true },
);

// Ensure unique date per Admin
HolidaySchema.index({ adminId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Holiday", HolidaySchema);
