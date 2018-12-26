'use strict';

const user = require('../models/user');
const bcrypt = require('bcrypt-nodejs');
const salt = bcrypt.genSaltSync(10);
const spiritos_error = require('../SpiritOSError');
const validate_user = require('../utils/validations/user_validations');

/**
 * Factory responsible of creating user objects
 * @param obj the primite object used to construct an user object
 */
const user_factory = (obj) => {
  if (!validate_user(obj).is_valid)
    throw new spiritos_error(validate_user(obj).reason, 422);

  obj = _decorate_with_password(obj);
  obj = _decorate_with_email_confirmed(obj);

  return user(obj.email, obj.username, obj.password, obj.email_confirmed);
};

/**
 * Decorates the provided primitive object with a hashed password
 * @param obj the object to be decorated
 * @returns {*} the decorated object
 * @private
 */
const _decorate_with_password = (obj) => {
  obj.password = bcrypt.hashSync(obj.password, salt);

  return obj;
};

/**
 * Decorates the provided primitive object with a a default value for email_confirmed field
 * @param obj the object to be decorated
 * @returns {*} the decorated object
 * @private
 */
const _decorate_with_email_confirmed = (obj) => {
  if(obj.email_confirmed)
    return obj;

  obj.email_confirmed = false;

  return obj;
};

module.exports = user_factory;
