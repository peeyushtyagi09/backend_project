const express = require("express");
const { 
    register, 
    login, 
    verifyEmail, 
    forgotPassword, 
    resetPassword, 
    refreshToken, 
    logout
} = require("../controllers/user.controller");
const router = express.Router();

// Auth routes
router.post("/register", register);
router.post("/login", login);

// Email verification
router.get("/verify-email", verifyEmail);

// Password reset
router.post("/forgot-password", forgotPassword); 
router.post("/reset-password", resetPassword);

router.post("/refresh", refreshToken);

router.post("/logout", logout);

module.exports = router;