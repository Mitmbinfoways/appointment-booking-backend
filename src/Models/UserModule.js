const mongoose = require("mongoose");

const UserModuleSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    medicineModule: {
      type: Boolean,
      default: false,
    },
    userManagementModule: {
      type: Boolean,
      default: false,
    },
    medicalModule: {
      type: Boolean,
      default: false,
    },
    doctorModule: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UserModule", UserModuleSchema);
