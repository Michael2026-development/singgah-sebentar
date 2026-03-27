const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { errorHandler, notFound } = require("./middleware/errorHandler.middleware");
const app = express();
const staffRoutes = require("./routes/staff.routes");
const reportRoutes = require("./routes/report.routes");

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));

// Rate limiter — general API (dashboard polling needs higher limit)
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  max: 500,
  message: {
    success: false,
    message: "Terlalu banyak request, coba lagi dalam 10 menit",
  },
});
app.use("/api", apiLimiter);

// Strict rate limiter — login endpoint (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Terlalu banyak percobaan login, coba lagi dalam 10 menit",
  },
});
app.use("/api/auth/login", authLimiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Singgah Sebentar API is running! ☕",
    version: "1.0.0",
  });
});

// Serve static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/categories", require("./routes/category.routes"));
app.use("/api/menus", require("./routes/menu.routes"));
app.use("/api/tables", require("./routes/table.routes"));
app.use("/api/orders", require("./routes/order.routes"));
app.use("/api/payments", require("./routes/payment.routes"));
app.use("/api/reports", reportRoutes);
app.use("/api/staff", staffRoutes);

// Error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;