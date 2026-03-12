const Joi = require('joi');

const tenantValidationSchema = Joi.object({
    companyName: Joi.string().trim().required().messages({
        "string.base": `"companyName" should be a type of 'text'`,
        "string.empty": `"companyName" cannot be an empty field`,
        "any.required": `"companyName" is a required field`
    }),
    ownerUser: Joi.string().length(24).hex().required().messages({
        "string.base": `"ownerUser" should be a valid user ID`,
        "string.empty": `"ownerUser" cannot be empty`,
        "any.required": `"ownerUser" is a required field`,
        "string.length": `"ownerUser" must be a valid ObjectId`,
        "string.hex": `"ownerUser" must be a valid ObjectId`
    }),
    planType: Joi.string().valid('free', 'pro', 'enterprise').default('free').messages({
        "string.base": `"planType" should be a type of 'text'`,
        "any.only": `"planType" must be one of ['free', 'pro', 'enterprise']`
    })
});

module.exports = {
    tenantValidationSchema
};