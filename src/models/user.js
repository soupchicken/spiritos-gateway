'use strict';

const user = (email, username, password, email_confirmed) => {
  return {email, username, password, email_confirmed};
};

module.exports = user;
