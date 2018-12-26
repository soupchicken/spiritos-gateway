'use strict';

const user_service = require('../services/user_service')();
const token_service = require('../services/token_service')();
const mail_link_service = require('../services/mail_link_service')();

const auth_service = () => {
  let self = {};

  /**
   * Given a user representation, attempts to create a new SpiritOS User.
   * If the username or the email are used by an already existing user, it fails
   * @param user the user representation used to create the resource
   * @param cb callback function
   */
  self.signup = (user, cb) => {
    user_service.create_user(user, (error, user) => {
      if (error)
        return cb(error);

      user_service.create_profile(user, (error, profile) => {
        if (error)
          return cb(error);

        delete user.password;

        token_service.issue_token(user, (error, token) => {
          if (error)
            return cb(error);

          mail_link_service.create(user, 'VERIFY', (error) => {
            if (error)
              return cb(error);

            return cb(null, {user: user, profile: profile, token: token});
          });
        });
      });
    });
  };

  /**
   * Destroys given token to properly log out user
   * @param token token to be destroyed
   * @param cb callback function
   */
  self.logout = (token, cb) => {
    token_service.destroy_token(token, (error) => {
      return cb(error);
    });
  };

  self.login = (user, cb) => {


    user_service.auth_user(user, (error, user) => {
      if (error)
        return cb(error);


      user_service.get_profile(user, (error, profile) => {
        if (error)
          return cb(error);

        console.log( profile, 'THIS IS PROFILE');

        token_service.issue_token(user, (error, token) => {
          if (error)
            return cb(error);

          return cb(null, { profile: profile, token: token});
        });
      });
    });
  };

  return self;
};

module.exports = auth_service;
