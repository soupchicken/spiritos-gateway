'use strict';

const PropertiesReader = require('properties-reader');
const properties = PropertiesReader(process.env.CONFIG_FILE);
let api_url = properties.get('gateway.api.url');

const mail_link = (key, identifier, email, expiration_date) => {
  var self = {key, identifier, email, expiration_date};

  self.verification_url = () => {
    return `${api_url}/api/v2/auth/verify/${self.identifier}/${self.key}`;
  };

  self.recover_url = () => {
    return `${api_url}/api/v2/auth/recover/${self.identifier}/${self.key}`;
  };

  return self;
};

module.exports = mail_link;
