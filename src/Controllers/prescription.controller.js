const Prescription = require("../Models/Prescription");
const Medicine = require("../Models/Medicine");
const UserModule = require("../Models/UserModule");
const User = require("../Models/User");
const FormConfig = require("../Models/FormConfig");
const mongoose = require("mongoose");

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

    const prescription = await Prescription.findOne({ bookingId }).populate(
      "medicines.medicineId",
    );

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

// Get Medicine Name Suggestions from past prescriptions
exports.getMedicineSuggestions = async (req, res) => {
  try {
    const { search } = req.query;

    if (!search || search.trim().length === 0) {
      return res.status(200).json({ statusCode: 200, data: [] });
    }

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const suggestions = await Prescription.aggregate([
      { $unwind: "$medicines" },
      {
        $match: {
          "medicines.name": { $regex: escapedSearch, $options: "i" },
        },
      },
      {
        $group: {
          _id: { name: "$medicines.name", dosage: "$medicines.dosage" },
        },
      },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          name: "$_id.name",
          dosage: "$_id.dosage",
        },
      },
    ]);

    return res.status(200).json({ statusCode: 200, data: suggestions });
  } catch (error) {
    console.error("Error fetching medicine suggestions:", error);
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
      sentToMedicalUser,
    } = req.body;

    if (!bookingId || !adminId) {
      return res.status(400).json({
        statusCode: 400,
        message: "bookingId and adminId are required fields.",
      });
    }

    const hasMedicineAccess = await checkMedicineAccess(adminId);

    // Filter & sanitize medicines based on module access & validity
    const ProcessedMedicines = Array.isArray(medicines)
      ? medicines.map((m) => {
          const isInvalidId =
            !m.medicineId ||
            m.medicineId === "custom" ||
            !mongoose.Types.ObjectId.isValid(m.medicineId);
          return {
            name: m.name || "",
            dosage: m.dosage || "",
            frequency: m.frequency || "1-0-1",
            duration: m.duration || "5 Days",
            instructions: m.instructions || "",
            quantity: Number(m.quantity) || 1,
            timing: m.timing || "After Food",
            medicineId: isInvalidId ? null : m.medicineId,
            isCustom: isInvalidId ? true : Boolean(m.isCustom),
          };
        })
      : [];

    // If medicineModule is enabled, process inventory stock deductions ONLY if NOT sent to a Medical User / Pharmacy
    const isSentToMedical = Boolean(
      sentToMedicalUser && mongoose.Types.ObjectId.isValid(sentToMedicalUser),
    );

    if (hasMedicineAccess && !isSentToMedical) {
      for (const item of ProcessedMedicines) {
        if (!item.isCustom && item.medicineId) {
          const medRecord = await Medicine.findById(item.medicineId);
          if (medRecord) {
            const qtyToDeduct = Number(item.quantity) || 1;
            medRecord.stock = Math.max(
              0,
              Number(medRecord.stock) - qtyToDeduct,
            );
            await medRecord.save();
          }
        }
      }
    } else if (!hasMedicineAccess) {
      // If medicineModule is disabled, force all prescribed items to be custom
      ProcessedMedicines.forEach((m) => {
        m.isCustom = true;
        m.medicineId = null;
      });
    }

    const updatePayload = {
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
    };

    if (
      sentToMedicalUser &&
      mongoose.Types.ObjectId.isValid(sentToMedicalUser)
    ) {
      updatePayload.sentToMedicalUser = sentToMedicalUser;
      updatePayload.fulfillmentStatus = "sent";
      updatePayload.sentAt = new Date();
    }

    const prescription = await Prescription.findOneAndUpdate(
      { bookingId },
      updatePayload,
      { new: true, upsert: true },
    );

    return res.status(200).json({
      statusCode: 200,
      message: sentToMedicalUser
        ? "Prescription sent to Medical User successfully!"
        : "Prescription saved successfully!",
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

// Get List of Prescriptions Sent to Medical Users
exports.getMedicalPrescriptions = async (req, res) => {
  try {
    const { adminId, medicalUserId } = req.query;

    if (!adminId) {
      return res.status(400).json({
        statusCode: 400,
        message: "adminId parameter is required.",
      });
    }

    const idList = [adminId];
    if (mongoose.Types.ObjectId.isValid(adminId)) {
      idList.push(new mongoose.Types.ObjectId(adminId));
    }

    const filter = {
      $or: [
        { adminId: { $in: idList } },
        { sentToMedicalUser: { $in: idList } },
      ],
      fulfillmentStatus: { $ne: "not_sent" },
    };

    if (medicalUserId) {
      filter.sentToMedicalUser = medicalUserId;
    }

    const rawPrescriptions = await Prescription.find(filter)
      .populate(
        "sentToMedicalUser",
        "name username email phoneNumber phone role businessName",
      )
      .populate("bookingId")
      .populate("medicines.medicineId")
      .sort({ updatedAt: -1 })
      .lean();

    // Enrich sentToMedicalUser if it was an Admin User or SubUser
    for (let i = 0; i < rawPrescriptions.length; i++) {
      const p = rawPrescriptions[i];
      if (p.sentToMedicalUser && typeof p.sentToMedicalUser === "object") {
        if (!p.sentToMedicalUser.name && p.sentToMedicalUser.username) {
          p.sentToMedicalUser.name = `${p.sentToMedicalUser.username}${p.sentToMedicalUser.businessName ? ` (${p.sentToMedicalUser.businessName})` : ""}`;
        }
      } else if (p.sentToMedicalUser) {
        const adminUser = await User.findById(p.sentToMedicalUser).select(
          "username email businessName role phoneNumber",
        );
        if (adminUser) {
          p.sentToMedicalUser = {
            _id: adminUser._id,
            name: `${adminUser.username}${adminUser.businessName ? ` (${adminUser.businessName})` : ""}`,
            email: adminUser.email,
            role: "Medical Admin / Store",
          };
        }
      }
    }

    // Enrich patient details from booking's dynamicResponses using FormConfig labels
    // This handles cases where patientName/Email/Phone were not captured at save time
    for (let i = 0; i < rawPrescriptions.length; i++) {
      const p = rawPrescriptions[i];
      const booking = p.bookingId;
      if (!booking || !booking.dynamicResponses) continue;

      const dyn =
        booking.dynamicResponses instanceof Map
          ? Object.fromEntries(booking.dynamicResponses)
          : booking.dynamicResponses;

      // Load FormConfig to map fieldKey -> label
      let fieldLabelMap = {};
      try {
        const fc = await FormConfig.findOne({ adminId: p.adminId }).lean();
        if (fc && fc.fields) {
          fc.fields.forEach((f) => {
            fieldLabelMap[f.fieldKey] = (f.label || "").toLowerCase().trim();
          });
        }
      } catch (_) {}

      // Helper: find value from dynamicResponses by matching label keywords
      const findByLabel = (labelKeywords) => {
        for (const [key, val] of Object.entries(dyn)) {
          if (!val) continue;
          const label = fieldLabelMap[key] || key.toLowerCase();
          for (const kw of labelKeywords) {
            if (label.includes(kw)) return String(val);
          }
        }
        return "";
      };

      if (
        !p.patientName ||
        p.patientName === "Patient" ||
        p.patientName.trim() === ""
      ) {
        const firstName = findByLabel([
          "first name",
          "first_name",
          "firstname",
          "fname",
        ]);
        const lastName = findByLabel([
          "last name",
          "last_name",
          "lastname",
          "lname",
        ]);
        const fullName =
          `${firstName} ${lastName}`.trim() ||
          findByLabel(["name", "patient name", "full name"]);
        if (fullName) p.patientName = fullName;
      }

      if (!p.patientEmail || p.patientEmail.trim() === "") {
        const email = findByLabel(["email", "e-mail", "mail"]);
        if (email) p.patientEmail = email;
      }

      if (!p.patientPhone || p.patientPhone.trim() === "") {
        const phone = findByLabel(["phone", "mobile", "contact", "tel"]);
        if (phone) p.patientPhone = phone;
      }
    }

    return res.status(200).json({
      statusCode: 200,
      data: rawPrescriptions,
    });
  } catch (error) {
    console.error("Error fetching medical prescriptions:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Update Prescription Fulfillment Status (e.g. sent -> dispensed -> completed)
exports.updateFulfillmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { fulfillmentStatus } = req.body;

    if (!id || !fulfillmentStatus) {
      return res.status(400).json({
        statusCode: 400,
        message: "Prescription ID and fulfillmentStatus are required.",
      });
    }

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({
        statusCode: 404,
        message: "Prescription record not found.",
      });
    }

    prescription.fulfillmentStatus = fulfillmentStatus;
    await prescription.save();

    return res.status(200).json({
      statusCode: 200,
      message: `Prescription fulfillment status updated to '${fulfillmentStatus}'.`,
      data: prescription,
    });
  } catch (error) {
    console.error("Error updating fulfillment status:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};
