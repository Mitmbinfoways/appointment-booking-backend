const UserModule = require("../Models/UserModule");
const User = require("../Models/User");

// Toggle user modules for a specific Admin (SuperAdmin operation)
exports.toggleUserModule = async (req, res) => {
  try {
    const { adminId, moduleName, enabled } = req.body;

    if (!adminId || !moduleName) {
      return res.status(400).json({
        statusCode: 400,
        message: "adminId and moduleName are required.",
      });
    }

    const adminUser = await User.findById(adminId);
    if (!adminUser || adminUser.isDeleted) {
      return res.status(404).json({
        statusCode: 404,
        message: "Admin user not found.",
      });
    }

    let userModule = await UserModule.findOne({ adminId });
    if (!userModule) {
      userModule = new UserModule({ adminId });
    }

    userModule[moduleName] = Boolean(enabled);
    await userModule.save();

    return res.status(200).json({
      statusCode: 200,
      message: `Module '${moduleName}' updated successfully.`,
      data: userModule,
    });
  } catch (error) {
    console.error("Error toggling user module:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Get modules for a specific Admin
exports.getUserModules = async (req, res) => {
  try {
    const { adminId } = req.params;

    if (!adminId) {
      return res.status(400).json({
        statusCode: 400,
        message: "adminId parameter is required.",
      });
    }

    let userModule = await UserModule.findOne({ adminId });
    if (!userModule) {
      userModule = { adminId, medicineModule: false };
    }

    return res.status(200).json({
      statusCode: 200,
      data: userModule,
    });
  } catch (error) {
    console.error("Error getting user modules:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};
