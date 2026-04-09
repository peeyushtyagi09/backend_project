require("dotenv").config();

const { Worker } = require("bullmq");
const connection = require("../config/redis");

const MatchingRule = require("../models/MatchingRule");
const ReconciliationBatch = require("../models/ReconciliationBatch");
const UploadedFile = require("../models/UploadedFile");

const parseCSV = require("../utils/parseCSV");

const { connectDB } = require("../database/db");

// Connect DB
(async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  }
})();

const worker = new Worker(
  "reconciliationQueue",
  async (job) => {
    const { batchId } = job.data || {};

    if (!batchId) {
      throw new Error("Missing batchId in job data");
    }

    console.log(`Processing batch: ${batchId}`);

    try {
      // 🟢 STEP 1 — Idempotent lock (only process pending)
      const batch = await ReconciliationBatch.findOneAndUpdate(
        { _id: batchId, status: "pending" },
        { status: "processing", error: undefined },
        { returnDocument: "after" }
      );

      if (!batch) {
        console.log(`Batch ${batchId} already processed or in progress`);
        return;
      }

      console.log(`Batch ${batchId} set to 'processing'`);

      // 🟢 STEP 2 — Fetch tenant rule
      const tenantId = batch.tenantId;

      const rule = await MatchingRule.findOne({ tenantId });

      if (!rule) {
        throw new Error("Matching rule not found for tenant");
      }

      console.log("Using rule:", rule);

      // 🟢 STEP 3 — Fetch files
      const ordersFile = await UploadedFile.findById(batch.ordersFileId);
      const paymentsFile = await UploadedFile.findById(batch.paymentsFileId);

      if (!ordersFile || !paymentsFile) {
        throw new Error("Required files not found");
      }

      console.log("Files fetched successfully");

      // 🟢 STEP 4 — Parse CSV
      const orders = await parseCSV(ordersFile.storedPath);
      const payments = await parseCSV(paymentsFile.storedPath);

      console.log("Orders parsed:", orders.length);
      console.log("Payments parsed:", payments.length);

      // 🟢 STEP 5 — Build payment map
      const paymentMap = new Map();

      payments.forEach((payment) => {
        paymentMap.set(payment.orderId, payment);
      });

      // 🟢 STEP 6 — Apply rule-based matching
      let matched = 0;
      let missing = 0;
      let mismatched = 0;

      const tolerance = rule.amountTolerance || 0;

      orders.forEach((order) => {
        const payment = paymentMap.get(order.orderId);

        if (!payment) {
          missing++;
        } else {
          const orderAmount = Number(order.amount);
          const paymentAmount = Number(payment.amount);

          const diff = Math.abs(orderAmount - paymentAmount);
          const allowed = orderAmount * tolerance;

          if (diff <= allowed) {
            matched++;
          } else {
            mismatched++;
          }
        }
      });

      // 🟢 STEP 7 — Generate result
      const result = {
        totalOrders: orders.length,
        totalPayments: payments.length,
        matched,
        missing,
        mismatched,
        ruleUsed: {
          tolerance: rule.amountTolerance,
          matchFields: rule.matchFields,
        },
      };

      console.log("Result:", result);

      // 🟢 STEP 8 — Save result
      await ReconciliationBatch.findByIdAndUpdate(
        batchId,
        {
          status: "completed",
          result,
          error: undefined,
        },
        { returnDocument: "after" }
      );

      console.log(`Batch ${batchId} set to 'completed'`);

    } catch (error) {
      console.error("Failed to process batch:", error);

      await ReconciliationBatch.findByIdAndUpdate(batchId, {
        status: "failed",
        error: error.message,
      });

      throw error;
    }
  },
  { connection }
);

module.exports = worker;