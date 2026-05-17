const Joi = require('joi');
const { messages } = require('../locales');

const schema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(50),
}).options({ stripUnknown: true });

const validateAmendmentMessagesQuery = (req, res, next) => {
  const { error, value } = schema.validate(req.query, { abortEarly: false, convert: true });
  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return res.status(422).json({
      status: 'fail',
      data: { message: messages.validation.failed, errors },
    });
  }
  req.query = value;
  next();
};

module.exports = validateAmendmentMessagesQuery;
