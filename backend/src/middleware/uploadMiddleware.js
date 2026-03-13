const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {

    if (file.fieldname === "ordersFile") {
      cb(null, "uploads/orders");
    } 
    else if (file.fieldname === "paymentsFile") {
      cb(null, "uploads/payments");
    } 
    else if (file.fieldname === "bankFile") {
      cb(null, "uploads/banks");
    }
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {

  const ext = path.extname(file.originalname);

  if (ext !== ".csv") {
    return cb(new Error("Only CSV files are allowed"));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter
});

module.exports = upload;