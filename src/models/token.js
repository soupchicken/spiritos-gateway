'use strict';
const crypto = require('crypto');

const token = (user) => {
  return {
    username: user.username,
    value: crypto.randomBytes(256).toString('base64')
  };
};

module.exports = token;
