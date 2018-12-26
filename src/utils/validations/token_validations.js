'use strict';

const validate_user = require('./user_validations');

/**
 * Given an object, determines if its a valid token object
 * @param token the object to be validated
 * @returns {*} TRUE if the object is a valid primitive object to create a mail_link object, otherwise FALSE
 */
const validate = (token) => {
  if(!token)
    return {is_valid: false, reason: 'Token cannot be null or empty object'};

  if(!validate_user(token.user).is_valid)
    return {is_valid: false, reason: 'Token User not valid: ' + validate_user(token.user).reason};

  return {is_valid: true };
};

module.exports = validate;
