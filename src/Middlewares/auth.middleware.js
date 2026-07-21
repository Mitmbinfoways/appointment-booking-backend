const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const ApiError = require('../Utils/ApiError');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(401, 'Access denied. No token provided.'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 's5AUmDxD6NftPCHmeet.mbinfoways@gmail.com');

    const user = await User.findOne({ _id: decoded.id, isDeleted: false });
    if (!user) {
      return next(new ApiError(401, 'Invalid user or token.'));
    }

    if (!user.isActive) {
      return next(new ApiError(403, 'Account is deactivated.'));
    }

    req.user = user;
    req.role = user.role; // Always read the role directly from the DB record
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(401, 'Unauthorized access: ' + error.message));
    }
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.role)) {
      return next(new ApiError(403, `Access denied. Role '${req.role}' is not authorized.`));
    }
    next();
  };
};

module.exports = {
  verifyToken,
  restrictTo
};
