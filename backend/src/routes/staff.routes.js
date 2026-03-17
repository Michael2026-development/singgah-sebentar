const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const {
  getAllStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  toggleStaffActive,
} = require("../controllers/staff.controller");

router.use(authenticate);
router.use(authorize("owner"));

router.get("/", getAllStaff);
router.post("/", createStaff);
router.put("/:id", updateStaff);
router.delete("/:id", deleteStaff);
router.patch("/:id/toggle", toggleStaffActive);

module.exports = router;