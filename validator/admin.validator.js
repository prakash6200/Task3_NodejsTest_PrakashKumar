const Joi = require("joi");

module.exports.userList = async (request, response, next) => {
    const rules = Joi.object({
        page: Joi.number().required(),
        limit: Joi.number().required(),
    });
    
    const { error } = rules.validate(request.query);
    if (error) {
        return response
            .status(422)
            .json({ status: false, message: error.message, data: null });
    } else {
        return next();
    }
};

module.exports.userById = async (request, response, next) => {
    const rules = Joi.object({
        id: Joi.string().required(),
    });
    
    const { error } = rules.validate(request.params);
    if (error) {
        return response
            .status(422)
            .json({ status: false, message: error.message, data: null });
    } else {
        return next();
    }
};