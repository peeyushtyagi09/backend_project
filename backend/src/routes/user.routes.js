import express from "express";
import {
    register,
    login,
    verifyEmail,
    forgotPassword,
    resetPassword
} from "../controllers/user.controller.js";

const router = express.Router();

// Auth routes
router.post("/register", register);
router.post("/login", login);

// Email verification
router.get("/verify-email", verifyEmail);

// Password reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;