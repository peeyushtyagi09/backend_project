import User from "../models/User.js";
import crypto from "crypto";

import { sendEmail } from "../utils/sendEmail.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateTokens.js";

import { registerSchema, loginSchema } from "../validators/authValidator.js";

const Frontend_url = process.env.Frontend_url || "http://localhost:3000";

export const register = async (req, res) => {
    try {
        const { error } = registerSchema.validate(req.body);

        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { email, password } = req.body;
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const verificationToken = crypto.randomBytes(32).toString("hex");

        const user = await User.create({
            email: email.toLowerCase().trim(),
            password,
            verificationToken,
            verificationTokenExpires: Date.now() + 3600000
        });

        const verifyUrl = `${Frontend_url}/api/auth/verify-email?token=${verificationToken}`;

        await sendEmail(
            email,
            "Verify your account",
            `<a href="${verifyUrl}">Verify Email</a>`
        );

        res.status(201).json({
            message: "User registered. Check your email for verification."
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== "string") {
            return res.status(400).json({ message: "Token is required" });
        }

        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired verification token." });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;

        await user.save();

        res.json({ message: "Email verified successfully." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { error } = loginSchema.validate(req.body);

        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        if (!user.isVerified) {
            return res.status(400).json({ message: "Verify email first" });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            accessToken
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 900000;

        await user.save();

        const resetUrl = `${Frontend_url}/reset-password?token=${resetToken}`;

        await sendEmail(
            email,
            "Reset Password",
            `<a href="${resetUrl}">Reset Password</a>`
        );

        res.json({ message: "Password reset email sent" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token } = req.query;
        const { password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: "Token and new password are required." });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token." });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ message: "Password reset successful." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
