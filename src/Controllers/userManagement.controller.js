const SubUser = require("../Models/SubUser");
const UserModule = require("../Models/UserModule");

// Helper to verify user management module access for Admin
const checkUserManagementAccess = async (adminId) => {
  if (!adminId) return false;
  const userModule = await UserModule.findOne({ adminId });
  if (!userModule) return true;
  return userModule.userManagementModule !== false;
};

// Get all sub-users for an Admin
exports.getSubUsers = async (req, res) => {
  try {
    const { adminId } = req.query;

    if (!adminId) {
      return res.status(400).json({
        statusCode: 400,
        message: "adminId parameter is required.",
      });
    }

    const hasAccess = await checkUserManagementAccess(adminId);
    if (!hasAccess) {
      return res.status(403).json({
        statusCode: 403,
        message: "User Management module is not enabled for this Admin.",
      });
    }

    const subUsers = await SubUser.find({ adminId }).sort({ createdAt: -1 });

    return res.status(200).json({
      statusCode: 200,
      data: subUsers,
    });
  } catch (error) {
    console.error("Error fetching sub-users:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Create a new sub-user record
exports.createSubUser = async (req, res) => {
  try {
    const { adminId, name, email, phoneNumber, role } = req.body;

    if (!adminId || !name || !email) {
      return res.status(400).json({
        statusCode: 400,
        message: "adminId, name, and email are required fields.",
      });
    }

    const hasAccess = await checkUserManagementAccess(adminId);
    if (!hasAccess) {
      return res.status(403).json({
        statusCode: 403,
        message: "User Management module is not enabled for this Admin.",
      });
    }

    const newSubUser = new SubUser({
      adminId,
      name,
      email,
      phoneNumber: phoneNumber || "",
      role: role || "Staff",
      isActive: true,
    });

    await newSubUser.save();

    return res.status(201).json({
      statusCode: 201,
      message: "User added successfully.",
      data: newSubUser,
    });
  } catch (error) {
    console.error("Error creating sub-user:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Update an existing sub-user record
exports.updateSubUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, name, email, phoneNumber, role } = req.body;

    if (!id || !adminId) {
      return res.status(400).json({
        statusCode: 400,
        message: "SubUser id and adminId are required.",
      });
    }

    const hasAccess = await checkUserManagementAccess(adminId);
    if (!hasAccess) {
      return res.status(403).json({
        statusCode: 403,
        message: "User Management module is not enabled for this Admin.",
      });
    }

    const subUser = await SubUser.findOne({ _id: id, adminId });
    if (!subUser) {
      return res.status(404).json({
        statusCode: 404,
        message: "User record not found.",
      });
    }

    if (name !== undefined) subUser.name = name;
    if (email !== undefined) subUser.email = email;
    if (phoneNumber !== undefined) subUser.phoneNumber = phoneNumber;
    if (role !== undefined) subUser.role = role;

    await subUser.save();

    return res.status(200).json({
      statusCode: 200,
      message: "User details updated successfully.",
      data: subUser,
    });
  } catch (error) {
    console.error("Error updating sub-user:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Toggle active status of a sub-user
exports.toggleSubUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    if (!id || !adminId) {
      return res.status(400).json({
        statusCode: 400,
        message: "SubUser id and adminId are required.",
      });
    }

    const hasAccess = await checkUserManagementAccess(adminId);
    if (!hasAccess) {
      return res.status(403).json({
        statusCode: 403,
        message: "User Management module is not enabled for this Admin.",
      });
    }

    const subUser = await SubUser.findOne({ _id: id, adminId });
    if (!subUser) {
      return res.status(404).json({
        statusCode: 404,
        message: "User record not found.",
      });
    }

    subUser.isActive = !subUser.isActive;
    await subUser.save();

    return res.status(200).json({
      statusCode: 200,
      message: `User status changed to ${subUser.isActive ? "Active" : "Inactive"}.`,
      data: subUser,
    });
  } catch (error) {
    console.error("Error toggling sub-user status:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Delete a sub-user record
exports.deleteSubUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.query;

    if (!id || !adminId) {
      return res.status(400).json({
        statusCode: 400,
        message: "SubUser id and adminId are required.",
      });
    }

    const hasAccess = await checkUserManagementAccess(adminId);
    if (!hasAccess) {
      return res.status(403).json({
        statusCode: 403,
        message: "User Management module is not enabled for this Admin.",
      });
    }

    const result = await SubUser.deleteOne({ _id: id, adminId });
    if (result.deletedCount === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "User record not found.",
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: "User record deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting sub-user:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};
