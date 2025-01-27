const Joi = require("joi");

module.exports.signUp = async (request, response, next) => {
    const rules = Joi.object({
        name: Joi.string().min(3).max(40).required(),
        userName: Joi.string().min(3).max(40).required(),
        mobile: Joi.string().required(),
        password: Joi.string().required(),
        cnfPassword: Joi.string().required(),
        referral: Joi.string(),
        platform: Joi.string().valid('WHATSAPP', 'TELEGRAM').required(),
        dob: Joi.date().required(),
    });
    
    const { error } = rules.validate(request.body);
    if (error) {
        return response
            .status(422)
            .json({ status: false, message: error.message, data: null });
    } else {
        return next();
    }
};

module.exports.login = async (request, response, next) => {
    const rules = Joi.object().keys({
        mobile: Joi.string().required(),
        otp: Joi.string(),
        password: Joi.string().required(),
    });
    const { error } = rules.validate(request.body);

    if (error) {
        return response
            .status(422)
            .json({ status: false, message: error.message, data: null });
    }
    return next();
};

module.exports.sendOtp = async (request, response, next) => {
    const rules = Joi.object().keys({
        mobile: Joi.string().required(),
    });
    const { error } = rules.validate(request.body);
    if (error) {
        return response
            .status(422)
            .json({ status: false, message: error.message, data: null });
    } else {
        return next();
    }
};

module.exports.verifyOtp = async (request, response, next) => {
    const rules = Joi.object().keys({
        mobile: Joi.string().required(),
        otp: Joi.number().required(),
    });
    const { error } = rules.validate(request.body);
    if (error) {
        return response
            .status(422)
            .json({ status: false, message: error.message, data: null });
    } else {
        return next();
    }
};
