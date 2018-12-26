'use strict';

const spiritos_error = require('../SpiritOSError');
const mail_link_factory = require('../factories/mail_link_factory');
const mail = require('../utils/mail');
const run = require('../utils/db_utils').run;

const mail_service = () => {
  let self = {};

  /**
   * Given an id, verifies if the mail link is valid
   * @param identifier the identifier (username or email) to be verified
   * @param key key to be validated
   * @param cb callback function
   * @returns Mail Link representation if valid, error if provided key is invalid and/or Mail Link is expired
   */
  self.verify = (identifier, key, cb) => {

    const findQuery = `SELECT * FROM MAIL_LINK WHERE KEY=$1`
    const deleteQuery = `DELETE FROM MAIL_LINK WHERE KEY=$1`;
    const params = [key];
    run( findQuery, params, (error, result) => {
      if (error)
        return cb(new spiritos_error(error.message, 500), null);

      let mail_link = result.rows[0];

      if (!mail_link)
        return cb(new spiritos_error("Mail Link does not exist", 422), null);

      if(mail_link.key != key)
        return cb(new spiritos_error("Mail Link does not match existing one", 422), null);

      mail_link = mail_link_factory(mail_link);
      let now = new Date();
      let expiration_date = new Date(mail_link.expiration_date);

      if (expiration_date < now)
        return cb(new spiritos_error('Mail Link expired', 422), null);


      run( deleteQuery, params, (error) => {
        if (error)
          return cb(new spiritos_error(error.message, 500), null);

        return cb(null, mail_link);
      });
    });
  };

  /**
   * Given an user representation, creates a resource
   * @param user the user representation
   * @param type type of mail link (verify or recover)
   * @param cb callback function
   */
  self.create = (user, type, cb) => {
    let mail_link = mail_link_factory({identifier: user.username, email: user.email});
    mail(mail_link, type, (error) => {
      if(error)
        return cb(new spiritos_error(`Error sending email to ${user.email}. Details: ${error.message}`, 500), null);

      const query = `INSERT INTO MAIL_LINK (KEY, IDENTIFIER, EMAIL, EXPIRATION_DATE) VALUES ($1, $2, $3, $4)`;
      const params = [mail_link.key, mail_link.identifier, mail_link.email, mail_link.expiration_date];
      run( query, params, (error, result) => {
        if (error)
          return cb(new spiritos_error(error.message, 500), null);

        return cb(null, mail_link);
      });
    });
  };

  return self;
};

module.exports = mail_service;
