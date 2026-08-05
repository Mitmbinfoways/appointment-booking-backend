const Medicine = require("../Models/Medicine");
const UserModule = require("../Models/UserModule");

// Helper to verify medicine module access for Admin
const checkMedicineAccess = async (adminId) => {
  if (!adminId) return false;
  const userModule = await UserModule.findOne({ adminId });
  if (!userModule) return true;
  return userModule.medicineModule !== false;
};

// Get all medicines for an Admin
exports.getMedicines = async (req, res) => {
  try {
    const { adminId } = req.query;

    if (!adminId) {
      return res.status(400).json({
        statusCode: 400,
        message: "adminId parameter is required.",
      });
    }

    const hasAccess = await checkMedicineAccess(adminId);
    if (!hasAccess) {
      return res.status(403).json({
        statusCode: 403,
        message: "Medicine module is not enabled for this Admin.",
      });
    }

    const medicines = await Medicine.find({ adminId }).sort({ createdAt: -1 });

    return res.status(200).json({
      statusCode: 200,
      data: medicines,
    });
  } catch (error) {
    console.error("Error fetching medicines:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Create a new medicine entry
exports.createMedicine = async (req, res) => {
  try {
    const {
      adminId,
      name,
      dosage,
      category,
      stock,
      price,
      expiryDate,
      manufacturer,
    } = req.body;

    if (!adminId || !name) {
      return res.status(400).json({
        statusCode: 400,
        message: "adminId and name are required fields.",
      });
    }

    const hasAccess = await checkMedicineAccess(adminId);
    if (!hasAccess) {
      return res.status(403).json({
        statusCode: 403,
        message: "Medicine module is not enabled for this Admin.",
      });
    }

    const newMedicine = new Medicine({
      adminId,
      name,
      dosage: dosage || "",
      category: category || "General",
      stock: Number(stock) || 0,
      price: Number(price) || 0,
      expiryDate: expiryDate || "",
      manufacturer: manufacturer || "",
    });

    await newMedicine.save();

    return res.status(201).json({
      statusCode: 201,
      message: "Medicine added successfully.",
      data: newMedicine,
    });
  } catch (error) {
    console.error("Error creating medicine:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Update an existing medicine entry
exports.updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      adminId,
      name,
      dosage,
      category,
      stock,
      price,
      expiryDate,
      manufacturer,
    } = req.body;

    if (!id || !adminId) {
      return res.status(400).json({
        statusCode: 400,
        message: "Medicine id and adminId are required.",
      });
    }

    const hasAccess = await checkMedicineAccess(adminId);
    if (!hasAccess) {
      return res.status(403).json({
        statusCode: 403,
        message: "Medicine module is not enabled for this Admin.",
      });
    }

    const medicine = await Medicine.findOne({ _id: id, adminId });
    if (!medicine) {
      return res.status(404).json({
        statusCode: 404,
        message: "Medicine entry not found.",
      });
    }

    if (name !== undefined) medicine.name = name;
    if (dosage !== undefined) medicine.dosage = dosage;
    if (category !== undefined) medicine.category = category;
    if (stock !== undefined) medicine.stock = Number(stock);
    if (price !== undefined) medicine.price = Number(price);
    if (expiryDate !== undefined) medicine.expiryDate = expiryDate;
    if (manufacturer !== undefined) medicine.manufacturer = manufacturer;

    await medicine.save();

    return res.status(200).json({
      statusCode: 200,
      message: "Medicine updated successfully.",
      data: medicine,
    });
  } catch (error) {
    console.error("Error updating medicine:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Delete a medicine entry
exports.deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.query;

    if (!id || !adminId) {
      return res.status(400).json({
        statusCode: 400,
        message: "Medicine id and adminId are required.",
      });
    }

    const hasAccess = await checkMedicineAccess(adminId);
    if (!hasAccess) {
      return res.status(403).json({
        statusCode: 403,
        message: "Medicine module is not enabled for this Admin.",
      });
    }

    const result = await Medicine.deleteOne({ _id: id, adminId });
    if (result.deletedCount === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "Medicine entry not found.",
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: "Medicine deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting medicine:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};
