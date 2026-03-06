const Joi = require("joi");


const registerSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .trim()
        .lowercase()
        .required()
        .messages({
            "string.base": "Email must be a string",
            "string.email": "Email must be a valid email address",
            "any.required": "Email is required"
        }),
    password: Joi.string()
        .min(8)
        .required()
        .trim()
        .messages({
            "string.base": "Password must be a string",
            "string.min": "Password must be at least 8 characters long",
            "any.required": "Password is required"
        }), 
});

const loginSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .trim()
        .lowercase()
        .required()
        .messages({
            "string.base": "Email must be a string",
            "string.email": "Email must be a valid email address",
            "any.required": "Email is required"
        }),
    password: Joi.string()
        .required()
        .trim()
        .messages({
            "string.base": "Password must be a string",
            "any.required": "Password is required"
        }),
});

const verifyEmailSchema = Joi.object({
    token: Joi.string()
        .required()
        .messages({
            "string.base": "Verification token must be a string",
            "any.required": "Verification token is required"
        })
});

const resetPasswordSchema = Joi.object({
    token: Joi.string()
        .required()
        .messages({
            "string.base": "Reset password token must be a string",
            "any.required": "Reset password token is required"
        }),
    password: Joi.string()
        .min(8)
        .required()
        .trim()
        .messages({
            "string.base": "Password must be a string",
            "string.min": "Password must be at least 8 characters long",
            "any.required": "Password is required"
        }),
});

module.exports = {
    registerSchema,
    loginSchema,
    verifyEmailSchema,
    resetPasswordSchema,
};