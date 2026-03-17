const express = require("express");
const router = express.Router();
const { getAllCategories, createCategory, updateCategory, deleteCategory, toggleCategory } = require("../controllers/category.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

router.get("/", getAllCategories);
router.post("/", authenticate, authorize("owner", "manager"), createCategory);
router.put("/:id", authenticate, authorize("owner", "manager"), updateCategory);
router.delete("/:id", authenticate, authorize("owner", "manager"), deleteCategory);

router.patch("/:id/toggle", authenticate, authorize("owner", "manager"), toggleCategory);
module.exports = router;