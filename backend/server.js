const express = require("express");

// files
const { PORT } = require("./example.env");
// exporting Databse file
const { connectDB } = require("./src/database/db");

const app = express();

// connecting database
connectDB();

app.get('/', (req, res) => {
    res.send("Hello World....");
})

app.listen(PORT, () => {
    console.log("Serevr is running on PORT:", PORT)
});
