'use strict';

var assert = require('assert');
var utils = require('../../../domain/utils/utils');

describe('utils::tests', function () {
  it('utils::is_prohibited_request::should return true if evaluated url is /api/v1/profile/1/verify/email@email.com and method POST', () => {
    let req = {
      method: 'POST',
      originalUrl: '/api/v1/profile/1/verify/email@email.com'
    };
    assert.equal(true, utils.is_prohibited_request(req));
  });

  it('utils::is_prohibited_request::should return true if evaluated url is /api/v1/profile/1/verify/email@email.com/trailing_path and method POST', () => {
    let req = {
      method: 'POST',
      originalUrl: '/api/v1/profile/1/verify/email@email.com/trailing_path'
    };
    assert.equal(true, utils.is_prohibited_request(req));
  });

  it('utils::is_prohibited_request::should return false if evaluated url is /api/v1/profile/1/verify/email@email.com and method GET', () => {
    let req = {
      method: 'GET',
      originalUrl: '/api/v1/profile/1/verify/email@email.com'
    };
    assert.equal(false, utils.is_prohibited_request(req));
  });

  it('utils::is_prohibited_request::should return false if evaluated url is /api/v1/profile/1/verify/email@email.com and method GET', () => {
    let req = {
      method: 'GET',
      originalUrl: '/api/v1/profile/1/verify/email@email.com'
    };
    assert.equal(false, utils.is_prohibited_request(req));
  });

  it('utils::is_prohibited_request::should return false if evaluated url is /api/v1/profile/1/network/ucla/spiritos/5/event and method POST', () => {
    let req = {
      method: 'POST',
      originalUrl: '/api/v1/profile/1/network/ucla/spiritos/5/event'
    };
    assert.equal(false, utils.is_prohibited_request(req));
  });

  it('utils::decorate_url_with_username::should not modify url if profile is not present', () => {
    let req = {
      method: 'POST',
      originalUrl: '/api/v1/event'
    };

    let decorated_req = utils.decorate_url_with_username(req, '123');
    assert.equal('/api/v1/event', decorated_req.originalUrl);
  });
});
