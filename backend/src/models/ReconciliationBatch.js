const mongoose = require("mongoose");

const reconciliationBatchSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        required: true
    },
    ordersFileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UploadedFile",
    },
    paymentsFileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UploadedFile"
    },
    bankFileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UploadedFile"
    },
    status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending"
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("ReconciliationBatch", reconciliationBatchSchema);