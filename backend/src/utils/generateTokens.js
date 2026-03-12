const jwt = require("jsonwebtoken");

// Environment variable validation
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets are not defined in environment variables.");
}

const generateAccessToken = (user) => {
    if (!user || !user._id || !user.role || !user.tenantId) {
        throw new Error("User object must have _id, role, and tenantId to generate an access token.");
    }
    return jwt.sign(
        {
            id: user._id.toString(),
            tenantId: user.tenantId.toString(),
            role: user.role
        },
        JWT_ACCESS_SECRET,
        { expiresIn: "15m" }
    );
};

const generateRefreshToken = (user) => {
    if (!user || !user._id) {
        throw new Error("User object with _id is required for generating refresh token.");
    }
    return jwt.sign(
        {
            id: user._id.toString()
        },
        JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
    );
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
};