const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

/**
 * Protect routes — verifies Bearer access token and attaches
 * req.user, req.userId, req.tenantId, req.role to the request.
 */
const protect = async (req, res, next) => {
    let token;

    // Only accept access token from Authorization header (Bearer scheme)
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, token missing" });
    }

    try {
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({ message: "Not authorized, user not found" });
        }

        req.user = user;
        req.userId = user._id;
        req.tenantId = user.tenantId;
        req.role = user.role;

        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

/**
 * Authorize specific roles.
 * Usage: router.get("/admin", protect, authorize("admin"), handler)
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    };
};

module.exports = { protect, authorize };