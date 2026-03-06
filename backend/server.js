require.config("dotenv");
const express = require("express");


// files 

// exporting Databse file
const { connectDB } = require("./src/database/db");

const app = express();

// connecting database
connectDB();

app.get('/', (req, res) => {
    res.send("Hello World....");
})

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log("Serevr is running on PORT:", PORT)
});
