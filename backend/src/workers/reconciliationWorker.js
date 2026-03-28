require("dotenv").config();
const { Worker } = require("bullmq");
const connection = require("../config/redis");
const ReconciliationBatch = require("../models/ReconciliationBatch");
const { connectDB } = require("../database/db"); 

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
            batch = await ReconciliationBatch.findByIdAndUpdate(
                batchId,
                { status: "processing", error: undefined },
                { new: true }
            );
            if (!batch) {
                throw new Error(`Batch with id ${batchId} not found`);
            }
            console.log(`Batch ${batchId} set to 'processing'`);

            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 3000));

            await ReconciliationBatch.findByIdAndUpdate(batchId, {
                status: "completed",
                error: undefined
            });
            console.log(`Batch ${batchId} set to 'completed'`);
            console.log("Completed batch:", batchId);
        } catch (error) {
            console.error("Failed to process batch:", error);
            // Mark batch as failed only if this was a batch that reached processing step
            if (batchId) {
                await ReconciliationBatch.findByIdAndUpdate(batchId, {
                    status: "failed",
                    error: error.message
                });
            }
            throw error; // rethrow to let BullMQ handle (for retries, etc.)
        }
    },
    { connection }
);

module.exports = worker;