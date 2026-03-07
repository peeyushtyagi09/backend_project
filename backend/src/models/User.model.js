const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const SaltValue = process.env.SaltValue ? Number(process.env.SaltValue) : 10;

const UserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
                "Please provide a valid email address",
            ],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters long"],
            select: true,
            trim: true,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        verificationToken: {
            type: String,
            select: false,
        },
        verificationTokenExpires: {
            type: Date,
            select: false,
        },
        resetPasswordToken: {
            type: String,
            select: false,
        },
        resetPasswordExpires: {
            type: Date,
            select: false,
        },
        refreshTokens: [
            {
                token: String, 
                createdAt: {
                    type: Date, 
                    default: Date.now
                }
            }
        ],
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },
    },
    {
        timestamps: true,
    }
);

UserSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }
    const salt = await bcrypt.genSalt(SaltValue);
    this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (enteredPassword) { 
    if (!this.password) {
        throw new Error("Password hash not found on user.");
    }
    if (!enteredPassword) {
        throw new Error("No password entered.");
    }
    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);