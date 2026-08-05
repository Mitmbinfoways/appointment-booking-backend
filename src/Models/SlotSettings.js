const mongoose = require("mongoose");

const BreakTimeSchema = new mongoose.Schema({
  name: { type: String, default: "Break" },
  startTime: { type: String, required: true }, // format "HH:MM"
  endTime: { type: String, required: true }, // format "HH:MM"
});

const WorkingDaySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    required: true,
  },
  isOpen: {
    type: Boolean,
    default: true,
  },
  startTime: {
    type: String, // format "HH:MM" e.g., "09:00"
    default: "09:00",
  },
  endTime: {
    type: String, // format "HH:MM" e.g., "17:00"
    default: "17:00",
  },
  breakTimes: [BreakTimeSchema],
});

const SlotSettingsSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    slotDurationMinutes: {
      type: Number,
      required: true,
      default: 30, // Any custom value (5, 10, 15, 30, 45, 60, etc.)
    },
    capacityPerSlot: {
      type: Number,
      required: true,
      default: 1, // If set to 5, the slot remains "Available" until 5 users book it.
    },
    minAdvanceNoticeMinutes: {
      type: Number,
      required: true,
      default: 0, // Minimum advance notice required before slot start time (e.g. 15, 30, 60 mins)
    },
    workingDays: [WorkingDaySchema],
    breakTimes: [BreakTimeSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("SlotSettings", SlotSettingsSchema);
