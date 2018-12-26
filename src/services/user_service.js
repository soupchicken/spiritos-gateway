'use strict';

const PropertiesReader = require('properties-reader');
const properties = PropertiesReader(process.env.CONFIG_FILE);
const spiritos_error = require('../SpiritOSError');
const user_factory = require('../factories/user_factory');
const bcrypt = require('bcrypt-nodejs');
const request = require('request');
const core_profile_api_url = properties.get('core.profile.api.url');
const run = require('../utils/db_utils').run;
const escape_input = require('../utils/utils').escape_input;
const mail_link_service = require('../services/mail_link_service')();

const user_service = () => {
  var self = {};

  self.create_user = (new_user, cb) => {
    if ( new_user.password === new_user.passwordConfirm ){
      new_user = user_factory(new_user);
      const query = `SELECT * FROM CREATE_USER($1, $2, $3)`;
      const params = [new_user.email, new_user.username, new_user.password];
      run( query, params, (error, response) => {
        if (error)
          return cb(new spiritos_error(error.message, 500), null);

        const user = response.rows[0];

        return cb(null, user);
      });
    } else {
      return cb(new spiritos_error('Passwords do not match',422), null)
    }
  };

  self.create_profile = (user, cb) => {

    request.post({url: core_profile_api_url, json: {id: user.username}}, (error, response, profile) => {
      if (error)
        cb(new spiritos_error(error.message, error.code), null);

      cb(null, profile);
    });
  };

  self.is_email_available = (email, cb) => {
    const query = `SELECT * FROM CHECK_EMAIL_AVAILABILITY($1)`;
    const params = [email];

    console.log(query, 'HELLO MAN');

    run( query, params, (error, result) => {
      if (error)
        return cb(new spiritos_error(error.message, 500), null);

      let user = result.rows[0];

      if ( user )
        return cb(new spiritos_error('Email is already in use', 422), false);

      return cb(null, true);
    });
  };

  self.is_username_available = (username, cb) => {
    const query = `SELECT * FROM CHECK_USERNAME_AVAILABILITY($1)`;
    const params = [username];
    run( query, params, (error, result) => {
      if (error)
        return cb(new spiritos_error(error.message, 500), null);

      const user = result.rows[0];

      if ( user )
        return cb(new spiritos_error('Username is unavailable', 409), false);

      return cb(null, true);
    });
  };

  self.find = (id, cb) => {
    const query = `SELECT * FROM FIND_USER($1)`;
    const params = [id];
    run( query, params, (error, result) => {
      if (error)
        return cb(new spiritos_error(error.message, 500), null);

      let user = result.rows[0];

      if (!user)
        return cb(new spiritos_error('No user exists with that id', 404), false);

      return cb(null, user_factory(user));
    });
  };

  self.auth_user = (provided_user, cb) => {
    const query = `SELECT * FROM FIND_USER($1)`;
    const params = [provided_user.identifier];
    run( query, params, (error, result) => {
      if (error)
        return cb(new spiritos_error(error.message, 500), null);

      let user = result.rows[0];

      if (!user)
        return cb(new spiritos_error('User does not exist', 404), null);

      if (!bcrypt.compareSync(provided_user.password, user.password))
        return cb(new spiritos_error('Password is incorrect', 422), null);

      return cb(null, user_factory(user));
    });
  };

  self.get_profile = (user, cb) => {
    request.get(core_profile_api_url + '/' + user.username, (error, response, profile) => {
      if (error)
        cb(new spiritos_error(error.message, error.code), null);

      cb(null, JSON.parse(profile));
    });
  };

  self.confirm_user = (identifier, cb) => {
    const query = `UPDATE SPIRITOS_USER SET EMAIL_CONFIRMED=TRUE WHERE LOWER(USERNAME)=$1 OR EMAIL=$1`
    const params = [identifier.toLowerCase()];
    run( query, params, (error, result) => {
      if (error)
        return cb(new spiritos_error(error.message, 500), null);

      return cb();
    });
  };

  self.get = (identifier, cb) => {

    const query = `SELECT * FROM FIND_USER($1)`;
    const params = [identifier];
    run( query, params, (error, result) => {
      if (error)
        return cb(new spiritos_error(error.message, 500), null);

      let user = result.rows[0];

      if (!user)
        return cb(new spiritos_error('User does not exist', 404), null);

      return cb(null, user);
    });
  };

  self.change_password = (identifier, provided_password, new_password, new_password_confirm, cb) => {
    self.get(identifier, (error, user) => {
      if (error)
        return cb(error);

      if (!bcrypt.compareSync(provided_password, user.password))
        return cb(new spiritos_error('Password is incorrect', 422), null);

      if (new_password !== new_password_confirm)
        return cb(new spiritos_error('Passwords do not match', 422), null);

      user.password = new_password;

      try {
        user = user_factory(user);
      } catch (error) {
        return cb(error);
      }

      const query = `UPDATE SPIRITOS_USER SET PASSWORD=$1 WHERE LOWER(USERNAME)=$2 OR EMAIL=$2`
      const params = [user.password, identifier.toLowerCase()];
      run( query, params, (error, result) => {
        if (error)
          return cb(new spiritos_error(error.message, 500), null);

        return cb();
      });
    });
  };


  self.update_password = (identifier, new_password, cb) => {
    self.get(identifier, (error, user) => {
      if (error)
        return cb(error);

      user.password = new_password;

      try {
        user = user_factory(user);
      } catch (error) {
        return cb(error);
      }

      const query = `UPDATE SPIRITOS_USER SET PASSWORD=$1 WHERE LOWER(USERNAME)=$2 OR EMAIL=$2`;
      const params = [query, params];
      run( query, params, (error) => {
        if (error)
          return cb(new spiritos_error(error.message, 500), null);

        return cb();
      });
    });
  };

  self.send_recover = (identifier, cb) => {
    self.get(identifier, (error, user) => {
      if (error)
        return cb(error);

      mail_link_service.create(user, 'RECOVERY', (error) => {
        if (error)
          return cb(error);

        return cb();
      });
    });
  };

  return self;
};

module.exports = user_service;
