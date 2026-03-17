const express = require("express");
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrderById,
  getActiveOrdersByTable,
  confirmOrder,
  updateOrderStatus,
} = require("../controllers/order.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

// Public — pelanggan buat pesanan
router.post("/", createOrder);

// Public — pelanggan cek pesanan aktif di mejanya
router.get("/table/:tableId/active", getActiveOrdersByTable);

// Protected — staff
router.get("/", authenticate, authorize("owner", "manager", "kasir", "dapur"), getAllOrders);
router.get("/:id", authenticate, authorize("owner", "manager", "kasir", "dapur"), getOrderById);
router.patch("/:id/confirm", authenticate, authorize("owner", "manager", "kasir"), confirmOrder);
router.patch("/:id/status", authenticate, authorize("owner", "manager", "kasir", "dapur"), updateOrderStatus);

module.exports = router;