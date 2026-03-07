const User = require("../models/User.model");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { sendEmail } = require("../utils/sendEmail");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateTokens");

const { registerSchema, loginSchema } = require("../validation/User.validation");

const Frontend_url = process.env.Frontend_url || "http://localhost:3000";

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

// Helper: hash a token string with sha256
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

const register = async (req, res) => {
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

        // raw token for link, hash for db
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenHash = hashToken(verificationToken);

        const user = await User.create({
            email: email.toLowerCase().trim(),
            password,
            verificationToken: verificationTokenHash,
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
        res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
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

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // raw reset token for user, hash for db
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenHash = hashToken(resetToken);

        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpires = Date.now() + 900000;

        await user.save();

        const resetUrl = `${Frontend_url}/reset-password?token=${resetToken}`;

        await sendEmail(
            email,
            "Reset Password",
            `<a href="${resetUrl}">Reset Password</a><br>If you didn't request a reset, you can ignore this email.`
        );

        res.json({ message: "Password reset email sent" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

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
        res.status(500).json({ message: error.message });
    }
};

const refreshToken = (req, res) => {
    const token = req.cookies.refreshToken;
    if(!token) {
        return res.status(401).json({ message: "No refresh token "});
    }

    try {
        const decoded = jwt.verify(
            token, 
            JWT_REFRESH_SECRET
        );

        const accessToken = jwt.sign(
            { id: decoded.id }, 
            JWT_ACCESS_SECRET, 
            { expiresIn: "15m" }
        );
        res.json({ accessToken });
    }catch (error) {
        return res.status(401).json({
            message: "Invalid refresh token"
        });
    }
};

const logout = (req, res) => {
    res.clearCookie("refreshToken", {
        httpOnly: true, 
        secure: true, 
        sameSite: "Strict"
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