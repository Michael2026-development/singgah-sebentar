const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/response");

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, "Akses ditolak — token tidak ditemukan", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, "Token expired — silakan login ulang", 401);
    }
    return errorResponse(res, "Token tidak valid", 401);
  }
};

module.exports = { authenticate };