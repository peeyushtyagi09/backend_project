const mongoose = require("mongoose");

const matchingRuleSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant", 
        required: true, 
        unique: true
    },
    matchFields: {
        type: [String], 
        defaut: ["orderId"]
    },
    amountTolerance: {
        type: Number, 
        default: 0
    },
    allowPartialPayments: {
        type: Boolean, 
        default: false
    },
    settlementDelayDays: {
        type:Number, 
        default: 0    
    },
    createdAt: {
        type: Date, 
        default: Date.now
    }
});

module.exports = mongoose.model("MatchingRule", matchingRuleSchema);