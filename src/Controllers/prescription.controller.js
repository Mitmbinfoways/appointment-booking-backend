const Prescription = require("../Models/Prescription");
const Medicine = require("../Models/Medicine");
const UserModule = require("../Models/UserModule");

// Helper to verify medicine module access for Admin
const checkMedicineAccess = async (adminId) => {
  if (!adminId) return false;
  const userModule = await UserModule.findOne({ adminId });
  if (!userModule) return true; // Default to true if not explicitly set
  return userModule.medicineModule !== false;
};

// Get Prescription by Booking ID
exports.getPrescriptionByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        statusCode: 400,
        message: "bookingId parameter is required.",
      });
    }

    const prescription = await Prescription.findOne({ bookingId }).populate("medicines.medicineId");

    return res.status(200).json({
      statusCode: 200,
      data: prescription || null,
    });
  } catch (error) {
    console.error("Error fetching prescription:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Create or Update Prescription
exports.savePrescription = async (req, res) => {
  try {
    const {
      bookingId,
      adminId,
      patientName,
      patientEmail,
      patientPhone,
      doctorName,
      businessName,
      diagnosis,
      notes,
      medicines,
    } = req.body;

    if (!bookingId || !adminId) {
      return res.status(400).json({
        statusCode: 400,
        message: "bookingId and adminId are required fields.",
      });
    }

    const hasMedicineAccess = await checkMedicineAccess(adminId);

    // Filter medicines based on module access
    const ProcessedMedicines = Array.isArray(medicines) ? medicines : [];

    // If medicineModule is enabled, process inventory stock deductions for catalog items
    if (hasMedicineAccess) {
      for (const item of ProcessedMedicines) {
        if (!item.isCustom && item.medicineId) {
          const medRecord = await Medicine.findById(item.medicineId);
          if (medRecord) {
            const qtyToDeduct = Number(item.quantity) || 1;
            medRecord.stock = Math.max(0, Number(medRecord.stock) - qtyToDeduct);
            await medRecord.save();
          }
        }
      }
    } else {
      // If medicineModule is disabled, force all prescribed items to be custom
      ProcessedMedicines.forEach((m) => {
        m.isCustom = true;
        m.medicineId = null;
      });
    }

    const prescription = await Prescription.findOneAndUpdate(
      { bookingId },
      {
        bookingId,
        adminId,
        patientName: patientName || "",
        patientEmail: patientEmail || "",
        patientPhone: patientPhone || "",
        doctorName: doctorName || "",
        businessName: businessName || "",
        diagnosis: diagnosis || "",
        notes: notes || "",
        medicines: ProcessedMedicines,
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      statusCode: 200,
      message: "Prescription saved successfully!",
      data: prescription,
    });
  } catch (error) {
    console.error("Error saving prescription:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};
