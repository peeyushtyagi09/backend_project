require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { connectDB } = require("./src/database/db");

// Routers
const userRoutes = require("./src/routes/user.routes");
const reconciliationRoutes = require("./src/routes/reconciliationRoutes");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser());

// Connect to database
connectDB().then(() => {
    console.log("Connected to the database");
}).catch(err => {
    console.error("Error connecting to the database:", err);
    process.exit(1);
});

// API routes
app.use("/api/auth", userRoutes);
app.use("/api/reconciliation", reconciliationRoutes);

app.get("/", (req, res) => {
    res.send("Hello World...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on PORT: ${PORT}`);
});
