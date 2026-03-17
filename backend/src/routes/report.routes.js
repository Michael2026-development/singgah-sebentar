const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { getDailyReport, getRangeReport } = require("../controllers/report.controller");

router.use(authenticate);
router.use(authorize("owner", "manager"));

router.get("/daily", getDailyReport);
router.get("/range", getRangeReport);

module.exports = router;