const express = require("express");
const router = express.Router();
const {
  getPaymentByOrderId,
  confirmCashPayment,
  confirmQrisPayment,
  getAllPayments,
} = require("../controllers/payment.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

router.get("/", authenticate, authorize("owner", "manager", "kasir"), getAllPayments);
router.get("/order/:orderId", getPaymentByOrderId);
router.patch("/order/:orderId/confirm-cash", authenticate, authorize("owner", "manager", "kasir"), confirmCashPayment);
router.patch("/order/:orderId/confirm-qris", authenticate, authorize("owner", "manager", "kasir"), confirmQrisPayment);

module.exports = router;