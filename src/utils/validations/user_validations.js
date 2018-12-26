'use strict';

const _ = require('lodash');
const validator = require('validator');

/**
 * Given an object, determines if its a valid user
 * @param user the object to be validated
 * @returns {*} TRUE if the object is a valid primitive object to create an user object, otherwise FALSE
 */
const validate = (user) => {
  if(!user)
    return {is_valid: false, reason: 'User cannot be null or empty object'};

  if(!validator.isEmail(user.email))
    return {is_valid: false, reason: 'User email is not valid'};

  if(!user.password)
    return {is_valid: false, reason: 'User password must be supplied'};

  if(user.password && user.confirm_password){
    if(user.password != user.confirm_password){
      return {is_valid: false, reason: 'User password and confirmed password does not match'};
    }
  }

  if(!_.isString(user.username))
    return {is_valid: false, reason: 'User name is not valid'};

  return {is_valid: true };
};

module.exports = validate;
