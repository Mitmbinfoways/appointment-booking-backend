const mongoose = require("mongoose");

const AdminLinkSchema = new mongoose.Schema(
  {
    fromAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fromModule: {
      type: String,
      required: true,
      trim: true,
    },
    toModule: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    linkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    linkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Prevent duplicate links between the same two admins
AdminLinkSchema.index({ fromAdminId: 1, toAdminId: 1 }, { unique: true });

module.exports = mongoose.model("AdminLink", AdminLinkSchema);
