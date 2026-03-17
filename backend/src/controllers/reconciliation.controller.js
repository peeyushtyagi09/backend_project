const UploadedFile = require("../models/UploadedFile");
const ReconciliationBatch = require("../models/ReconciliationBatch");

exports.uploadReconciliationFiles = async (req, res) => {

  try {

    const tenantId = req.tenantId;
    const userId = req.userId;

    const files = req.files;

    if (!files.ordersFile || !files.paymentsFile || !files.bankFile) {
      return res.status(400).json({
        message: "All three files are required"
      });
    }

    // Create UploadedFile records

    const ordersFile = await UploadedFile.create({
      tenantId,
      fileType: "orders",
      originalName: files.ordersFile[0].originalname,
      storedPath: files.ordersFile[0].path,
      fileSize: files.ordersFile[0].size,
      uploadedBy: userId
    });

    const paymentsFile = await UploadedFile.create({
      tenantId,
      fileType: "payments",
      originalName: files.paymentsFile[0].originalname,
      storedPath: files.paymentsFile[0].path,
      fileSize: files.paymentsFile[0].size,
      uploadedBy: userId
    });

    const bankFile = await UploadedFile.create({
      tenantId,
      fileType: "bank",
      originalName: files.bankFile[0].originalname,
      storedPath: files.bankFile[0].path,
      fileSize: files.bankFile[0].size,
      uploadedBy: userId
    });

    // Create reconciliation batch

    const batch = await ReconciliationBatch.create({
      tenantId,
      ordersFileId: ordersFile._id,
      paymentsFileId: paymentsFile._id,
      bankFileId: bankFile._id,
      createdBy: userId,
      status: "pending"
    });

    res.status(201).json({
      message: "Files uploaded successfully",
      batchId: batch._id
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Upload failed"
    });

  }

};