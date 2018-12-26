'use strict';

const mail_link = require('../models/mail_link');
const uuidv4 = require('uuid/v4');
const spiritos_error = require('../SpiritOSError');
const validate_mail_link = require('../utils/validations/mail_link_validations');

/**
 * Factory responsible of creating mail_link objects
 * @param obj the primite object used to construct a mail_link object
 */
const mail_link_factory = (obj) => {
  if (!validate_mail_link(obj).is_valid)
    throw new spiritos_error(validate_mail_link(obj).reason, 422);

  obj = _decorate_with_key(obj);
  obj = _decorate_with_expiration_date(obj);

  return mail_link(obj.key, obj.identifier, obj.email, obj.expiration_date);
};

/**
 * Decorates the provided primitive object with a key
 * @param obj the object to be decorated
 * @returns {*} the decorated object
 * @private
 */
const _decorate_with_key = (obj) => {
  obj.key = new Buffer(uuidv4()).toString('base64');

  return obj;
};

/**
 * Decorates the provided primitive object with an expiration date
 * @param obj the object to be decorated
 * @returns {*} the decorated object
 * @private
 */
const _decorate_with_expiration_date = (obj) => {
  let now = new Date();
  obj.expiration_date =  now.setDate(now.getDate() + 1);

  return obj;
};

module.exports = mail_link_factory;
