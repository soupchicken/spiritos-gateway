'use strict';

const spiritos_error = require('../SpiritOSError');
const express = require('express');
const router = express.Router();
const request = require('request');
const token_service = require('../services/token_service')();
const pipe_get_request = require('../utils/utils').pipe_get_request;
const core_url = require('../utils/utils').core_url;
const is_prohibited_request = require('../utils/utils').is_prohibited_request;
const is_public_request = require('../utils/utils').is_public_request;
const decorate_url_with_username = require('../utils/utils').decorate_url_with_username;


router.use('/', (req, res) => {

  if(is_prohibited_request(req)){
    let error = new spiritos_error('Blacklisted operation', 403);
    return res.status(error.code).send(error.toJSON());
  }

  req = decorate_url_with_username(req, req.user);

  if(is_public_request(req)){
    return pipe_get_request(core_url(req), req, res);
  }

  if(!req.user){
    let error = new spiritos_error('You are not authorized to execute the requested operation', 403);
    return res.status(error.code).send(error.toJSON());
  }
  switch(req.method){
    case 'GET':
      pipe_get_request(core_url(req), req, res);
      break;

    case 'POST':
      request.post({uri: core_url(req), json: req.body}).pipe(res);
      break;

    case 'PUT':
      request.put({uri: core_url(req), json: req.body}).pipe(res);
      break;

    case 'DELETE':
      request.delete({uri: core_url(req), json: req.body}).pipe(res);
      break;
  }

});

module.exports = router;
