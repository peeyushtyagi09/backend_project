require("dotenv").config();

const { Worker } = require("bullmq");
const connection = require("../config/redis");

const ReconciliationBatch = require("../models/ReconciliationBatch");
const UploadedFile = require("../models/UploadedFile");

const parseCSV = require("../utils/parseCSV"); // Step 3 utility

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
      console.error("Job data missing batchId");
      throw new Error("Missing batchId in job data");
    }

    console.log(`Processing batch: ${batchId}`);

    let batch;

    try {
      // 🟢 STEP 2 — Improve Processing Lock by updating status ONLY if pending
      batch = await ReconciliationBatch.findOneAndUpdate(
        {
          _id: batchId,
          status: "pending",
        },
        {
          status: "processing",
          error: undefined,
        },
        { returnDocument: "after" }
      );

      if (!batch) {
        console.log(`Batch ${batchId} already processed or in progress`);
        return;
      }

      console.log(`Batch ${batchId} set to 'processing'`);

      // 🟢 Step 2: Fetch uploaded files
      const ordersFile = await UploadedFile.findById(batch.ordersFileId);
      console.log("order", ordersFile);
      const paymentsFile = await UploadedFile.findById(batch.paymentsFileId);
      console.log("payments", paymentsFile)

      if (!ordersFile || !paymentsFile) {
        throw new Error("Required files not found");
      }

      console.log("Files fetched successfully");

      // 🟢 Step 3: Parse CSV files
      const orders = await parseCSV(ordersFile.storedPath);
      const payments = await parseCSV(paymentsFile.storedPath);

      console.log("Orders parsed:", orders.length);
      console.log("Payments parsed:", payments.length);

      // 🟢 Step 4: Create payment map
      const paymentMap = new Map();

      payments.forEach((payment) => {
        paymentMap.set(payment.orderId, payment);
      });

      // 🟢 Step 5: Matching logic
      let matched = 0;
      let missing = 0;
      let mismatched = 0;

      orders.forEach((order) => {
        const payment = paymentMap.get(order.orderId);

        if (!payment) {
          missing++;
        } else if (Number(payment.amount) === Number(order.amount)) {
          matched++;
        } else {
          mismatched++;
        }
      });

      // 🟢 Step 6: Generate result
      const result = {
        totalOrders: orders.length,
        totalPayments: payments.length,
        matched,
        missing,
        mismatched,
      };

      console.log("Result:", result);

      // 🟢 Step 7: Save result
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
      console.log("Completed batch:", batchId);

    } catch (error) {
      console.error("Failed to process batch:", error);

      if (batchId) {
        await ReconciliationBatch.findByIdAndUpdate(batchId, {
          status: "failed",
          error: error.message,
        });
      }

      throw error;
    }
  },
  { connection }
);

module.exports = worker;