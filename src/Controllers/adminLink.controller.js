const AdminLink = require("../Models/AdminLink");
const User = require("../Models/User");
const UserModule = require("../Models/UserModule");
const mongoose = require("mongoose");
const ApiError = require("../Utils/ApiError");
const ApiResponse = require("../Utils/ApiResponse");

// Helper: get primary module name for an admin from UserModule
const getAdminModuleName = async (adminId) => {
  const userModule = await UserModule.findOne({ adminId });
  if (!userModule) return "general";
  if (userModule.medicalModule && !userModule.doctorModule) return "medical";
  if (userModule.doctorModule && !userModule.medicalModule) return "doctor";
  if (userModule.medicalModule) return "medical";
  if (userModule.doctorModule) return "doctor";
  if (userModule.medicineModule) return "medicine";
  if (userModule.userManagementModule) return "userManagement";
  return "general";
};

// Create a link between two admins using joinId
const createLink = async (req, res, next) => {
  try {
    const { fromAdminId, fromJoinId, toJoinId } = req.body;

    if ((!fromAdminId && !fromJoinId) || !toJoinId) {
      return next(
        new ApiError(400, "Both Join IDs (or fromAdminId and toJoinId) are required."),
      );
    }

    // Find the source admin (by fromJoinId or fromAdminId)
    const fromFilter = fromJoinId
      ? { joinId: fromJoinId.trim(), role: "Admin", isDeleted: false }
      : { _id: fromAdminId, role: "Admin", isDeleted: false };

    const fromAdmin = await User.findOne(fromFilter);
    if (!fromAdmin) {
      return next(new ApiError(404, "Source admin not found with provided ID / Join ID."));
    }

    // Find the target admin by joinId or toAdminId
    const toFilter = toJoinId.startsWith("JN-")
      ? { joinId: toJoinId.trim(), role: "Admin", isDeleted: false }
      : { _id: toJoinId, role: "Admin", isDeleted: false };

    const toAdmin = await User.findOne(toFilter);
    if (!toAdmin) {
      return next(
        new ApiError(404, "Target admin not found with provided Join ID."),
      );
    }

    if (fromAdmin._id.toString() === toAdmin._id.toString()) {
      return next(new ApiError(400, "Cannot link an admin to themselves."));
    }

    // Check if link already exists (in either direction)
    const existingLink = await AdminLink.findOne({
      $or: [
        { fromAdminId: fromAdmin._id, toAdminId: toAdmin._id },
        { fromAdminId: toAdmin._id, toAdminId: fromAdmin._id },
      ],
    });
    if (existingLink) {
      return next(
        new ApiError(400, "These two admins are already linked."),
      );
    }

    // Get module names for both admins
    const fromModule = await getAdminModuleName(fromAdmin._id);
    const toModule = await getAdminModuleName(toAdmin._id);

    const link = new AdminLink({
      fromAdminId: fromAdmin._id,
      toAdminId: toAdmin._id,
      fromModule,
      toModule,
      status: "active",
      linkedBy: req.user ? req.user._id : fromAdmin._id,
      linkedAt: new Date(),
    });

    await link.save();

    // Populate admin details for response
    const populatedLink = await AdminLink.findById(link._id)
      .populate("fromAdminId", "username email businessName joinId")
      .populate("toAdminId", "username email businessName joinId");

    res
      .status(201)
      .json(
        new ApiResponse(201, populatedLink, "Admins linked successfully."),
      );
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(400, "These two admins are already linked."));
    }
    next(error);
  }
};

// Get all linked admins for a specific admin
const getLinkedAdmins = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { module: moduleFilter } = req.query;

    if (!adminId) {
      return next(new ApiError(400, "adminId parameter is required."));
    }

    const idList = [adminId];
    if (mongoose.Types.ObjectId.isValid(adminId)) {
      idList.push(new mongoose.Types.ObjectId(adminId));
    }

    const isSuperAdmin = req.user?.role === "SuperAdmin" || adminId === "all";

    const filter = isSuperAdmin
      ? {}
      : {
          $or: [
            { fromAdminId: { $in: idList } },
            { toAdminId: { $in: idList } },
          ],
        };

    const links = await AdminLink.find(filter)
      .populate("fromAdminId", "username email businessName joinId phoneNumber isActive")
      .populate("toAdminId", "username email businessName joinId phoneNumber isActive")
      .sort({ linkedAt: -1 });

    // Build clean list with live module evaluation
    const result = await Promise.all(
      links.map(async (link) => {
        const liveFromModule = link.fromAdminId?._id
          ? await getAdminModuleName(link.fromAdminId._id)
          : link.fromModule;
        const liveToModule = link.toAdminId?._id
          ? await getAdminModuleName(link.toAdminId._id)
          : link.toModule;

        if (isSuperAdmin) {
          return {
            _id: link._id,
            fromAdmin: link.fromAdminId,
            toAdmin: link.toAdminId,
            fromModule: liveFromModule,
            toModule: liveToModule,
            linkedAdmin: link.toAdminId,
            linkedModule: liveToModule,
            myModule: liveFromModule,
            status: link.status,
            linkedAt: link.linkedAt,
          };
        }

        const isFrom = idList.some(
          (id) =>
            link.fromAdminId?._id &&
            id.toString() === link.fromAdminId._id.toString(),
        );
        const linkedAdmin = isFrom ? link.toAdminId : link.fromAdminId;
        const linkedModule = isFrom ? liveToModule : liveFromModule;
        const myModule = isFrom ? liveFromModule : liveToModule;

        return {
          _id: link._id,
          linkedAdmin: {
            _id: linkedAdmin._id,
            username: linkedAdmin.username,
            email: linkedAdmin.email,
            businessName: linkedAdmin.businessName,
            joinId: linkedAdmin.joinId,
            phoneNumber: linkedAdmin.phoneNumber,
            isActive: linkedAdmin.isActive,
          },
          linkedModule,
          myModule,
          status: link.status,
          linkedAt: link.linkedAt,
        };
      }),
    );

    // Filter by module if requested
    const filtered = moduleFilter
      ? result.filter(
          (r) =>
            r.linkedModule === moduleFilter ||
            r.myModule === moduleFilter,
        )
      : result;

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          filtered,
          "Linked admins retrieved successfully.",
        ),
      );
  } catch (error) {
    next(error);
  }
};

// Get linked medical admins for a specific admin (for prescription "Send to Medical" dropdown)
const getLinkedMedicalAdmins = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    if (!adminId) {
      return next(new ApiError(400, "adminId parameter is required."));
    }

    const idList = [adminId];
    if (mongoose.Types.ObjectId.isValid(adminId)) {
      idList.push(new mongoose.Types.ObjectId(adminId));
    }

    // Find all active links for this admin
    const links = await AdminLink.find({
      $or: [
        { fromAdminId: { $in: idList } },
        { toAdminId: { $in: idList } },
      ],
      status: "active",
    })
      .populate(
        "fromAdminId",
        "username email businessName joinId phoneNumber isActive",
      )
      .populate(
        "toAdminId",
        "username email businessName joinId phoneNumber isActive",
      );

    const medicalAdmins = [];

    for (const link of links) {
      if (!link.fromAdminId || !link.toAdminId) continue;
      const fromIdStr = (link.fromAdminId._id || link.fromAdminId).toString();
      const isFrom = idList.some((id) => id.toString() === fromIdStr);
      const otherAdmin = isFrom ? link.toAdminId : link.fromAdminId;

      if (otherAdmin && otherAdmin.isActive !== false) {
        if (
          !medicalAdmins.some(
            (m) => m._id.toString() === otherAdmin._id.toString(),
          )
        ) {
          medicalAdmins.push({
            _id: otherAdmin._id,
            name: `${otherAdmin.username}${otherAdmin.businessName ? ` (${otherAdmin.businessName})` : ""}`,
            email: otherAdmin.email,
            phoneNumber: otherAdmin.phoneNumber || "",
            role: "Medical Admin / Pharmacy",
            isMainAdmin: true,
            isLinked: true,
          });
        }
      }
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          medicalAdmins,
          "Linked medical admins retrieved successfully.",
        ),
      );
  } catch (error) {
    next(error);
  }
};

// Remove a link between two admins
const removeLink = async (req, res, next) => {
  try {
    const { linkId } = req.params;

    if (!linkId) {
      return next(new ApiError(400, "linkId parameter is required."));
    }

    const link = await AdminLink.findByIdAndDelete(linkId);
    if (!link) {
      return next(new ApiError(404, "Link not found."));
    }

    res
      .status(200)
      .json(new ApiResponse(200, null, "Admin link removed successfully."));
  } catch (error) {
    next(error);
  }
};

// Toggle link status (active/inactive)
const toggleLinkStatus = async (req, res, next) => {
  try {
    const { linkId } = req.params;

    const link = await AdminLink.findById(linkId);
    if (!link) {
      return next(new ApiError(404, "Link not found."));
    }

    link.status = link.status === "active" ? "inactive" : "active";
    await link.save();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { status: link.status },
          `Link ${link.status === "active" ? "activated" : "deactivated"} successfully.`,
        ),
      );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLink,
  getLinkedAdmins,
  getLinkedMedicalAdmins,
  removeLink,
  toggleLinkStatus,
};
