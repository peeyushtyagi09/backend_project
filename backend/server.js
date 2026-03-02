const express = require("express");

// files
const { PORT } = require("./example.env.js");


const app = express();


app.get('/', (req, res) => {
    res.send("Hello World....");
})

app.listen(PORT, () => {
    console.log("Serevr is running on PORT:", PORT)
});
