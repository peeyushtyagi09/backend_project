const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = process.env.SaltValue ? Number(process.env.SaltValue) : 10;

const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            default: "",
            maxlength: [100, "Name cannot exceed 100 characters"]
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
            match: [emailRegex, "Please provide a valid email address"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters long"],
            select: false, 
            trim: true,
        },
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tenant",
            required: true,
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
                token: {
                    type: String,
                    select: false, 
                },
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
        versionKey: false,
        toJSON: {
            transform(doc, ret) { 
                delete ret.password;
                delete ret.verificationToken;
                delete ret.verificationTokenExpires;
                delete ret.resetPasswordToken;
                delete ret.resetPasswordExpires;
                if (Array.isArray(ret.refreshTokens)) {
                    ret.refreshTokens = undefined;
                }
                return ret;
            }
        }
    }
);

// Ensure email uniqueness at the Mongoose level and provide a clearer error
UserSchema.post("save", function(error, doc, next) {
    if (error.name === "MongoServerError" && error.code === 11000 && error.keyPattern && error.keyPattern.email) {
        next(new Error("Email already exists"));
    } else {
        next(error);
    }
});

// Hash the password only if it was modified
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Compare entered password to the hashed password
UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (typeof candidatePassword !== "string" || !candidatePassword) {
        throw new Error("No password entered.");
    }
    // this.password will be undefined unless select: true is used on query
    if (!this.password) {
        throw new Error("Password hash not found on user document.");
    }
    return await bcrypt.compare(candidatePassword, this.password);
};

// Utility method to remove sensitive fields from a user object
UserSchema.methods.sanitize = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.verificationToken;
    delete obj.verificationTokenExpires;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpires;
    delete obj.refreshTokens;
    return obj;
};

module.exports = mongoose.model("User", UserSchema);