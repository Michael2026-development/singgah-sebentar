const express = require("express");
const router = express.Router();
const { getAllMenus, getMenuById, createMenu, updateMenu, toggleMenuAvailability, deleteMenu } = require("../controllers/menu.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const upload = require("../middleware/upload.middleware");

router.get("/", getAllMenus);
router.get("/:id", getMenuById);
router.post("/", authenticate, authorize("owner", "manager"), upload.single("image"), createMenu);
router.put("/:id", authenticate, authorize("owner", "manager"), upload.single("image"), updateMenu);
router.patch("/:id/toggle", authenticate, authorize("owner", "manager"), toggleMenuAvailability);
router.delete("/:id", authenticate, authorize("owner", "manager"), deleteMenu);

module.exports = router;