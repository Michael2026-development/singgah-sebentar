const { errorResponse } = require("../utils/response");

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, "Akses ditolak — belum login", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, "Akses ditolak — role tidak sesuai", 403);
    }

    next();
  };
};

module.exports = { authorize };