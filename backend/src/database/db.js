const mongoose = require("mongoose");
const { MONGO_URI } = require("../../example.env")

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("🙌 Database is connect succesfully 🙌");
    }catch(err){
        console.log("❌ Error in connecting Database with server error -> ", err.message);
    }
}

module.exports = {
    connectDB
}