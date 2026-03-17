const express = require("express");
const router = express.Router();
const {
  getAllTables,
  getTableById,
  getTableByNumber,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
} = require("../controllers/table.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

// Public — diakses pelanggan saat scan QR
router.get("/number/:number", getTableByNumber);

// Protected
router.get("/", authenticate, getAllTables);
router.get("/:id", authenticate, getTableById);
router.post("/", authenticate, authorize("owner"), createTable);
router.put("/:id", authenticate, authorize("owner"), updateTable);
router.delete("/:id", authenticate, authorize("owner"), deleteTable);

// Toggle status meja (kasir, owner, manager)
router.patch("/:id/status", authenticate, authorize("kasir", "owner", "manager"), updateTableStatus);

module.exports = router;