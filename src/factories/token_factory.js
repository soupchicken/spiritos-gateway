'use strict';

const spiritos_error = require('../SpiritOSError');
const token = require('./user');
const validate_token = require('../utils/validations/token_validations');

/**
 * Factory responsible of creating token objects
 * @param obj the primite object used to construct a token object
 */
const token_factory = (obj) => {
  if (!validate_token(obj).is_valid)
    throw new spiritos_error(validate_token(obj).reason, 422);

  return token(obj);
};

module.exports = token_factory;
