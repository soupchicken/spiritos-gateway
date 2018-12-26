'use strict';

const read_conf = require('properties-reader');
const properties = read_conf(process.env.CONFIG_FILE);
const spiritos_error = require('../SpiritOSError');
const core_api_url = properties.get('core.api.url');
const request = require('request');

/**
 * Given an HTTP request object, extracts the username from it if available, of fault back to 'default' username
 * @param req the HTTP request to be analysed
 * @returns {*} req.user.username if available, otherwise 'guest'
 */
const get_user_from_req = (req) => {
  if(req.user && req.user.username)
    return req.user.username;

  return 'guest';
};

/**
 * Transforms an originally gateway call, to a core one
 * @param req the HTTP request
 * @returns {*} the target core URL (it would be just swapping ports)
 */
const core_url = (req) => {
  return core_api_url + req.originalUrl;
};

const core_verification_url = (username, email) => {
  return `${core_api_url}/api/v2/profile/${username}/verify/${email}`;
};

/**
 * Checks whether or not the given combination of method and url is a prohibited route.
 * Prohibited routes are those who not even the logged in users should have access to.
 * In example, A non verified user must not be able to execute a profile verification in core,
 * since it could edit its verification status and/or email.
 * Also, an user must not be able to edit its own profile directly from core, so that route must
 * be blacklisted as well.
 * @param req URL to be analysed
 * @returns {boolean} TRUE if its a prohibited route, otherwise FALSE
 */
const is_prohibited_request = (req) => {
  return !!(is_core_verification_url(req.method, req.originalUrl)
  || !!(is_core_profile_modification_url(req.method, req.originalUrl)));
};

/**
 * List of public request that does not require authentication.
 * @param req the HTTP request
 * @returns {boolean} TRUE if the request url corresponds to a public one, otherwise FALSE
 */
const is_public_request = (req) => {

  if(req.method != 'GET'){
    return false;
    } else {
      return true;
  }
  // const originalUrl = req.originalUrl.split('?')[0];
	//
  // return !!(
  //   originalUrl === '/api/v2/profile/guest' ||
  //   originalUrl === '/api/v1/profile/guest/' ||
  // );

  // return !!( originalUrl === '/api/v1/profile/guest'
  // || originalUrl === '/api/v1/profile/guest/network/public/browse/event'
  // || originalUrl === '/api/v1/profile/guest/network/public/event/tag'
  // || originalUrl === '/api/v1/profile/guest/network/public/browse/spiritos'
  // || originalUrl === '/api/v1/profile/guest/network/public/spiritos/tag'
  // || originalUrl === '/api/v1/spiritos/tag'
  // || originalUrl === '/api/v1/event/tag'
  // || originalUrl === '/api/v1/event'
  // || originalUrl === '/api/v1/profile/guest/event'
  // || originalUrl === '/api/v1/spiritos'
  // || originalUrl === '/api/v1/profile/guest/spiritos'
  // || originalUrl === '/api/v1/bucket'
  // || originalUrl === '/api/v1/profile/guest/bucket'
  // || originalUrl === '/api/v1/tag'
  // || originalUrl === '/api/v1/profile/guest/tag'
  // || originalUrl === '/api/v1/search'
  // || originalUrl === '/api/v1/profile/guest/search'
  // || originalUrl === '/api/v1/network'
  // || originalUrl === '/api/v1/profile/guest/network');
};

/**
 * Escapes input string
 * @param value value to be escaped
 * @returns {*} return escaped value
 */
const escape_input = (value) => {
  let _esc = (v) => {
    return "$$"+v+"$$";
  };

  if ((value === null || value === undefined)
    || (typeof value != 'string' && value.constructor.name != 'Array' && value.constructor.name != 'Object'))
    return value;

  if(value.constructor.name === 'Array'){
    value.forEach((val, idx) => {
      value[idx] = escape_input(val);
    });
  }
  if(value.constructor.name === 'Object'){
    Object.keys(value).forEach((val) => {
      if((value[val] === null || value[val] === undefined)
        || (typeof value != 'string' && value.constructor.name != 'Array' && value.constructor.name != 'Object'))
        return;
      if(value[val].constructor.name === 'Array' || value[val].constructor.name === 'Object') {
        value[val] = escape_input(value[val]);
      } else {
        value[val] = _esc(value[val]);
      }
    });
  }
  if(typeof value === 'string')
    return  _esc(value);

  return value;
};

/**
 * Checks if the provided combination of HTTP method and URL is a verification operation in core
 * @param method HTTP method
 * @param url URL to be analysed
 * @returns {boolean} TRUE if its a verify profile route, otherwise FALSE
 */
const is_core_verification_url = (method, url) => {
  if(!url) return false;
  if(method != 'POST') return false;

  return !!url.match(/^\/api\/v1\/profile\/[^]+\/verify\/[^]+/);
};

/**
 * Checks if the provided combination of HTTP method and URL is a profile modification operation
 * @param method HTTP method
 * @param url URL to be analysed
 * @returns {boolean} TRUE if its a profile modification route, otherwise FALSE
 */
const is_core_profile_modification_url = (method, url) => {
  if(!url) return false;
  if(method == 'GET') return false;

  return !!url.match(/^\/api\/v1\/profile/) && (url.split('/').length === 4 || url.split('/').length === 5);
};

/**
 * Given a req object that contains an originalUrl profile path parameter, adds the username to it
 * @param req HTTP request object
 * @param username the username used to decorate url
 * @returns {string} decorated url with username
 */
const decorate_url_with_username = ( req, user ) => {
  let username = 'guest';
  if ( user ) username = user.username;
  let tokenized_url = req.originalUrl.split('/');
  if(tokenized_url[3].toLowerCase() === 'profile'){
    tokenized_url[3] = `${tokenized_url[3]}/${username}`;
    tokenized_url.splice(4, 1);
  }

  req.originalUrl = tokenized_url.join('/');

  return req;
};

const pipe_get_request = (url, req, res) => {
  let error;
  req.pipe(request(url)).on('error', e => {
    error = new spiritos_error("SpiritOS Core Failed: " + e, 500);
    res.status(error.code).send(error.toJSON());
  }).pipe(res).on('error', e => {
    error = new spiritos_error("SpiritOS Core Failed: " + e, 500);
    res.status(error.code).send(error.toJSON());
  });
};

module.exports = {
  get_user_from_req : get_user_from_req,
  pipe_get_request : pipe_get_request,
  escape_input: escape_input,
  core_url : core_url,
  core_verification_url : core_verification_url,
  is_core_verification_url : is_core_verification_url,
  is_prohibited_request : is_prohibited_request,
  is_public_request : is_public_request,
  decorate_url_with_username : decorate_url_with_username
};
