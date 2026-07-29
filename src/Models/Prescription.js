const mongoose = require("mongoose");

const PrescribedMedicineSchema = new mongoose.Schema({
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Medicine",
    default: null,
  },
  isCustom: {
    type: Boolean,
    default: true,
  },
  name: {
    type: String,
    required: true,
  },
  dosage: {
    type: String,
    default: "",
  },
  frequency: {
    type: String,
    default: "1-0-1",
  },
  duration: {
    type: String,
    default: "5 Days",
  },
  instructions: {
    type: String,
    default: "",
  },
  quantity: {
    type: Number,
    default: 1,
  },
  timing: {
    type: String,
    default: "After Food",
  },
});

const PrescriptionSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientName: {
      type: String,
      default: "",
    },
    patientEmail: {
      type: String,
      default: "",
    },
    patientPhone: {
      type: String,
      default: "",
    },
    doctorName: {
      type: String,
      default: "",
    },
    businessName: {
      type: String,
      default: "",
    },
    diagnosis: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    medicines: [PrescribedMedicineSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Prescription", PrescriptionSchema);
