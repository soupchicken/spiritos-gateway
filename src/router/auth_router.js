'use strict';

const express = require('express');
const router = express.Router();
const auth_service = require('../services/auth_service')();
const user_service = require('../services/user_service')();
const mail_link_service = require('../services/mail_link_service')();
const request = require('request');
const core_verification_url = require('../utils/utils').core_verification_url;

const spiritos_error = require('../SpiritOSError');
const mail = require('../utils/mail');

router.post('/signup', (req, res) => {
  auth_service.signup(req.body, (error, response) => {
    if(error)
      return res.status(error.code).send(error.toJSON());

    res.setHeader('token', response.token);
    return res.status(201).send(response.profile);
  });
});


router.post('/login', (req, res) => {
  let user = req.body;
  auth_service.login(user, (error, response) => {
    if(error)
      return res.status(error.code).send(error.toJSON());

    res.setHeader('token', response.token);
    return res.status(200).send(response.profile);
  });
});

router.post('/logout', (req, res) => {
  let token = req.headers.token;
  auth_service.logout(token, (error) => {
    if(error)
      return res.status(error.code).send(error.toJSON());

    return res.status(204).send();
  });
});

router.get('/verify/:identifier/:key', (req, res) => {
  let identifier = req.params.identifier;
  let key = req.params.key;
  mail_link_service.verify(identifier, key, (error) => {
    if(error)
      return res.status(error.code).send(error.toJSON());

    user_service.confirm_user(identifier, (error) => {
      if(error)
        return res.status(error.code).send(error.toJSON());

      user_service.get(identifier, (error, user) => {
        if(error)
          return res.status(error.code).send(error.toJSON());

        request.post({uri: core_verification_url(user.username, user.email), json: req.body}, (error, http_response, body) => {
          if(error){
            if ( error.code === 422 ) {
              res.redirect('https://www.spiritos.com/?alreadyAuthenticated=true')
            } else {
              return res.status(error.code).send(error.toJSON());
            }
          } else {
            res.redirect('https://www.spiritos.com/?authenticated=true')
          }
        });
      });
    });
  });
});

router.get('/get_current_user', ( req, res ) => {

  let user = req.user || { username:'guest', email:'no-reply@spiritos.com', email_verified:true };
  user_service.get_profile( user, ( error, profile ) => {
    if (error)
      return res.status(error.code).send(error.toJSON());

    delete user.password;
    return res.status(200).send(profile);

  });
});


router.put('/change_password', ( req, res ) => {
  const {
    currentPassword,
    newPassword,
    newPasswordConfirm
  } = req.body;
  const { username } = req.user;
  user_service.change_password( username, currentPassword, newPassword, newPasswordConfirm, ( error ) => {
    if( error )
      return res.status( error.code ).send( error.toJSON() );

    return res.status( 204 ).send();
  })
});

router.post('/recover/:identifier', (req, res) => {
  let identifier = req.params.identifier;
  user_service.send_recover(identifier, (error) => {
    if(error)
      return res.status(error.code).send(error.toJSON());

    return res.status(204).send();
  });
});

router.post('/recover/:identifier/:key', (req, res) => {
  let identifier = req.params.identifier;
  let key = req.params.key;
  let new_password = req.body.new_password;
  mail_link_service.verify(identifier, key, (error) => {
    if(error)
      return res.status(error.code).send(error.toJSON());

    user_service.update_password(identifier, new_password, (error) => {
      if(error)
        return res.status(error.code).send(error.toJSON());

      return res.status(204).send();
    })
  });
});

router.post('/user/is_email_available/:email', (req, res)=> {
  let email = req.params.email;
  user_service.is_email_available(email, (error, response) => {
    if(error)
      return res.status(error.code).send(error.toJSON());

    return res.status(200).send(response);
  });
});

router.post('/user/is_username_available/:username', (req, res)=> {
  let username = req.params.username;
  user_service.is_username_available(username, (error, response) => {
    if(error)
      return res.status(error.code).send(error.toJSON());

    return res.status(200).send(response);
  });
});

module.exports = router;
