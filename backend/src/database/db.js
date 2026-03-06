const mongoose = require("mongoose"); 


// variables 
const MONGO_URI = process.env.MONGO_URI;

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