const mongoose = require("mongoose");

const TenantSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    ownerUser: {
        type: mongoose.Schema.Types.ObjectId,
<<<<<<< HEAD
        ref: "User", 
=======
        ref: "User",
        // Not required on first save — set after User is created in register flow
>>>>>>> ba3d8e17aea35f57c428bac38be7aabc7cb46d80
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