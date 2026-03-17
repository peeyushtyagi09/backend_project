const User = require("../models/User.model");
const Tenant = require("../models/Tenant.model");

const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { sendEmail } = require("../utils/sendEmail");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateTokens");

const { registerSchema, loginSchema } = require("../validation/User.validation");

const Frontend_url = process.env.Frontend_url || "http://localhost:3000";

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

function hashToken(token) {
    if (typeof token !== "string") throw new Error("Token must be a string");
    return crypto.createHash("sha256").update(token).digest("hex");
}

const register = async (req, res) => {
    try {
        const { error } = registerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { name, email, password, companyName, description, planType } = req.body;

        const userEmail = email.toLowerCase().trim();

        // Check if user exists
        const existingUser = await User.findOne({ email: userEmail });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // 1. Create Tenant (required for user.tenantId)
        let tenant;
        try {
            tenant = await Tenant.create({
                companyName,
                description,
                planType
            });
        } catch (tenantError) {
            console.error("Tenant creation error:", tenantError);
            return res.status(500).json({ message: "Error creating tenant" });
        }

        if (!tenant || !tenant._id) {
            return res.status(500).json({ message: "Could not create tenant" });
        }

        // 2. Create verification Token
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenHash = hashToken(verificationToken);

        // 3. Create the User with tenantId
        let user;
        try {
            user = await User.create({
                name,
                email: userEmail,
                password,
                tenantId: tenant._id,
                verificationToken: verificationTokenHash,
                verificationTokenExpires: Date.now() + 60 * 60 * 1000 // 1 hour
            });

            // Optional: Set the ownerUser field of the tenant to the user's _id
            tenant.ownerUser = user._id;
            await tenant.save();
        } catch (userError) {
            console.error("User creation error:", userError);
            // Clean up: Remove tenant if user creation fails.
            try {
                await Tenant.findByIdAndDelete(tenant._id);
            } catch (cleanupErr) {
                // ignore
            }
            return res.status(500).json({ message: "Error creating user" });
        }

        const verifyUrl = `${Frontend_url}/api/auth/verify-email?token=${verificationToken}`;
        await sendEmail(
            userEmail,
            "Verify your account",
            `<a href="${verifyUrl}">Verify Email</a>`
        );

        res.status(201).json({
            message: "User registered. Check your email for verification."
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Verify user email via token link.
 */
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== "string") {
            return res.status(400).json({ message: "Token is required" });
        }

        const tokenHash = hashToken(token);

        const user = await User.findOne({
            verificationToken: tokenHash,
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
        console.error("Verify email error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Login endpoint, issues JWT tokens.
 */
const login = async (req, res) => {
    try {
        const { error } = loginSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        if (!user.isVerified) {
            return res.status(400).json({ message: "Please verify your email before logging in." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Issue tokens
        const accessToken = generateAccessToken(user);
        const refreshTokenValue = generateRefreshToken(user);

        user.refreshTokens = (user.refreshTokens || []).filter(
            t => !!t.token
        );

        user.refreshTokens.push({ token: refreshTokenValue });
        await user.save();

        res.cookie("refreshToken", refreshTokenValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
        });

        res.json({ accessToken });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Send forgot password email if user exists.
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const userEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: userEmail });

        // Always respond as if an email was sent, to avoid revealing user existence
        if (!user) {
            return res.json({ message: "Password reset email sent" });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenHash = hashToken(resetToken);

        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

        await user.save();

        const resetUrl = `${Frontend_url}/reset-password?token=${resetToken}`;
        await sendEmail(
            userEmail,
            "Reset Password",
            `<a href="${resetUrl}">Reset Password</a><br>If you didn't request a reset, you can ignore this email.`
        );

        res.json({ message: "Password reset email sent" });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Reset the user's password via valid token.
 */
const resetPassword = async (req, res) => {
    try {
        const { token } = req.query;
        const { password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: "Token and new password are required." });
        }

        const tokenHash = hashToken(token);

        const user = await User.findOne({
            resetPasswordToken: tokenHash,
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
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) {
        return res.status(401).json({ message: "No refresh token" });
    }

    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        const tokenIndex = (user.refreshTokens || []).findIndex(
            (t) => t.token === token
        );

        if (tokenIndex === -1) {
            return res.status(401).json({
                message: "Refresh token not recognized"
            });
        }

        user.refreshTokens.splice(tokenIndex, 1);

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        user.refreshTokens.push({ token: newRefreshToken });

        await user.save();

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
        });

        res.json({
            accessToken: newAccessToken
        });

    } catch (error) {
        console.error("Refresh token error:", error);
        return res.status(401).json({
            message: "Invalid refresh token"
        });
    }
};

/**
 * Log the user out by removing their refresh token cookie and token in DB.
 */
const logout = async (req, res) => {
    const token = req.cookies.refreshToken;

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
            const user = await User.findById(decoded.id).select("+refreshTokens");
            if (user) {
                user.refreshTokens = (user.refreshTokens || []).filter(
                    t => t.token !== token
                );
                await user.save();
            }
        } catch (error) {
            // Silently fail on invalid token
        }
    }

    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });

    res.json({
        message: "Logged out successfully"
    });
};

module.exports = {
    register,
    verifyEmail,
    login,
    forgotPassword,
    resetPassword,
    refreshToken,
    logout,
};