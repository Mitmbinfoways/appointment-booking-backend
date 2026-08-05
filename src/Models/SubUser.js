const mongoose = require("mongoose");

const SubUserSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      default: "Staff",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    hasMedicalAccess: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

SubUserSchema.index({ adminId: 1, email: 1 });

module.exports = mongoose.model("SubUser", SubUserSchema);
