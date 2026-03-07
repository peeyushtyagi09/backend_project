const express = require("express");
const router = express.Router();

const { 
    register, 
    login, 
    verifyEmail, 
    forgotPassword, 
    resetPassword, 
    refreshToken, 
    logout
} = require("../controllers/user.controller");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// Email Verification
router.get("/verify-email", verifyEmail);

// Password Reset
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

// Token Refresh & Logout
router.post("/refresh", refreshToken);
router.post("/logout", logout);

module.exports = router;