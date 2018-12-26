'use strict';

const _ = require('lodash');
const validator = require('validator');

/**
 * Given an object, determines if its a valid mail_link object
 * @param mail_link the object to be validated
 * @returns {*} TRUE if the object is a valid primitive object to create a mail_link object, otherwise FALSE
 */
const validate = (mail_link) => {
  if(!mail_link)
    return {is_valid: false, reason: 'Mail Link cannot be null or empty object'};

  if(!mail_link.identifier || !_.isString(mail_link.identifier))
    return {is_valid: false, reason: 'Mail Link identifier cannot be null or empty'};

  if(!validator.isEmail(mail_link.email))
    return {is_valid: false, reason: 'Mail Link email is not valid'};

  return {is_valid: true };
};

module.exports = validate;
