const UploadedFile = require("../models/UploadedFile");
const generateFileHash = require("../utils/generateFileHash");
const ReconciliationBatch = require("../models/ReconciliationBatch");
const reconciliationQueue = require("../queues/reconciliationQueue");

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
 

    // Generate file hashes first
    const ordersHash = await generateFileHash(files.ordersFile[0].path);
    const paymentsHash = await generateFileHash(files.paymentsFile[0].path);
    const bankHash = await generateFileHash(files.bankFile[0].path);

    // Check for duplicate orders file
    let existingFile = await UploadedFile.findOne({
      fileHash: ordersHash,
      tenantId
    });
    if (existingFile) {
      return res.status(400).json({
        message: "Duplicate file uploaded"
      });
    }

    // Check for duplicate payments file
    existingFile = await UploadedFile.findOne({
      fileHash: paymentsHash,
      tenantId
    });
    if (existingFile) {
      return res.status(400).json({
        message: "Duplicate file uploaded"
      });
    }

    // Check for duplicate bank file
    existingFile = await UploadedFile.findOne({
      fileHash: bankHash,
      tenantId
    });
    if (existingFile) {
      return res.status(400).json({
        message: "Duplicate file uploaded"
      });
    }

    // Create UploadedFile records

    const ordersFile = await UploadedFile.create({
      tenantId,
      fileType: "orders",
      originalName: files.ordersFile[0].originalname,
      storedPath: files.ordersFile[0].path,
      fileSize: files.ordersFile[0].size,
      fileHash: ordersHash,
      uploadedBy: userId
    });

    const paymentsFile = await UploadedFile.create({
      tenantId,
      fileType: "payments",
      originalName: files.paymentsFile[0].originalname,
      storedPath: files.paymentsFile[0].path,
      fileSize: files.paymentsFile[0].size,
      fileHash: paymentsHash,
      uploadedBy: userId
    });

    const bankFile = await UploadedFile.create({
      tenantId,
      fileType: "bank",
      originalName: files.bankFile[0].originalname,
      storedPath: files.bankFile[0].path,
      fileSize: files.bankFile[0].size,
      fileHash: bankHash,
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

    // adding job after batch is created
    await reconciliationQueue.add("processReconciliation", {
      batchId: batch._id
    });
    console.log("Job added for batch:", batch._id);

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