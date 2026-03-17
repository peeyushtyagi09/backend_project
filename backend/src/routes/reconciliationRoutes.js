const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/user.middleware");

const reconciliationController = require("../controllers/reconciliation.controller");

router.post(
  "/upload",
  protect,
  upload.fields([
    { name: "ordersFile", maxCount: 1 },
    { name: "paymentsFile", maxCount: 1 },
    { name: "bankFile", maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      await reconciliationController.uploadReconciliationFiles(req, res);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;