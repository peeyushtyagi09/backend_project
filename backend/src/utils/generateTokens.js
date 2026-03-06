import jwt from "jsonwebtoken";

// const variables
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role
        }, 
        JWT_ACCESS_SECRET, 
        { expiresIn: "15m" }
    );
};

export const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            id: user._id
        }, 
        JWT_REFRESH_SECRET, 
        { expiresIn: "7d" }
    )
}