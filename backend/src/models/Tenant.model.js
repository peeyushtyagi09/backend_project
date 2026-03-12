const mongoose = require("mongoose");

const TenantSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    ownerUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    createdDate: {
        type: Date,
        default: Date.now
    },
    planType: {
        type: String,
        enum: ["free", "pro", "enterprise"], 
        default: "free"
    }
});

module.exports = mongoose.model("Tenant", TenantSchema);