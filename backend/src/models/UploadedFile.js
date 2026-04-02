const mongoose = require("mongoose");

const uploadedFileSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true
  },

  fileType: {
    type: String,
    enum: ["orders", "payments", "bank"],
    required: true
  },

  originalName: {
    type: String,
    required: true
  },

  storedPath: {
    type: String,
    required: true
  },

  fileSize: {
    type: Number
  },
  fileHash: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  uploadedAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("UploadedFile", uploadedFileSchema);