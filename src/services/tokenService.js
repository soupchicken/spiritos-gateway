'use strict';

const spiritos_error = require('../SpiritOSError');
const run = require('../utils/db_utils').run;
const crypto = require('crypto');

const token_service = () => {
  var self = {};

  self.consume_token = (req, res, cb) => {
    let token = req.headers.token;
    if (token) {
      const query = `SELECT * FROM SPIRITOS_USER WHERE token=$1`;
      const params = [token];
      run( query, params , (error, response) => {
        if(error)
          return cb(error);

        if (response.rows[0])
          req.user = response.rows[0];

        return cb();
      })
    } else {
      return cb();
    }
  };

  self.issue_token = (user, cb) => {
    crypto.randomBytes(48, function (err, buffer) {
      let token = buffer.toString('hex');
      const query = `UPDATE SPIRITOS_USER SET token=$1 WHERE username=$2`;
      const params = [ token, user.username ];
      run( query, params, ( error, response ) => {
        if (error)
          return cb(new spiritos_error(error.message, 500), null);

        return cb(null, token);
      })
    });
  };

  self.destroy_token = (token, cb) => {

    const query = `UPDATE SPIRITOS_USER SET TOKEN=NULL WHERE TOKEN=$1 RETURNING *`;
    const params = [token];
    run( query, params, (error, response) => {
      if (error)
        return cb(new spiritos_error(error.message, 500), null);

      if (!response.rows[0])
        return cb(new spiritos_error('No active session found', 404), null);

      return cb(null);
    });
  };

  return self;
};

module.exports = token_service;
