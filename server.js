require('dotenv').config()
const fs = require('fs');
const pg = require('pg');
const fetch = require('node-fetch');
const Koa = require('koa');
const KoaRouter = require('koa-router');
const koaBody = require('koa-body');
const { graphqlKoa, graphiqlKoa } = require('apollo-server-koa');
const koaMorgan = require('koa-morgan');/*

==========================================================================================================
  GATEWAY
========================================================================================================*/

const gateway = new Koa();
const gatewayRouter = new KoaRouter();
gateway.context.dbPool = new pg.Pool({
  host:process.env.PGHOST_GATEWAY,
  user:process.env.PGUSER_GATEWAY,
  database:process.env.PGDATABASE_GATEWAY,
  password:process.env.PGPASSWORD_GATEWAY,
  port:process.env.PGPORT_GATEWAY,
  max:process.env.PGPOOLSIZE_GATEWAY,
  idleTimeoutMillis:process.env.PGCONNECT_TIMEOUT_GATEWAY,
});
gateway.use( koaBody() );
// gateway.use( koaMorgan('combined') );

gateway.use(( ctx, next ) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  return next();
})

// Fetch new pool client on request
gateway.use( async ( ctx, next ) => {
  ctx.db = await ctx.dbPool.connect();
  return next();
})
// Close pool client after use
gateway.use( async ( ctx, next ) => {
  await next();
  if ( ctx.db )
    ctx.db.release();
})

// Error handler
gateway.use( async ( ctx, next ) => {
  try {
    await next();
  } catch ( err ){
    ctx.status = err.status || 500;
    ctx.body = { status: ctx.status, message: err.message };
    ctx.app.emit('gateway-error', err, ctx);
  }
})



// Check Authorization
// Inject Profile ID for use in API CORE
gateway.use( async ( ctx, next ) => {
  const { db, request } = ctx;
  // ctx.state.profile = { id:'default', email:'no-reply@spiritos.com', is_verified:true };
  if ( request.header.authorization && request.header.authorization.split(' ')[1] ){
    ctx.state.accessToken = request.header.authorization.split(' ')[1];
    try {
      const url = `${process.env.OAUTH_URL}/introspectToken?client_id=${process.env.OAUTH_CLIENT_ID}&client_secret=${process.env.OAUTH_SECRET_KEY}`
      const res = await fetch(url, {
        method:'POST',
        body:JSON.stringify({ token:ctx.state.accessToken }),
        headers: { 'Content-Type': 'application/json' }
      })
      const token = await res.json();
      if ( token.active ){
        const profile = await db.query(`
          SELECT * FROM profile
          WHERE email=$1`,
          [ token.username ])
        ctx.state.profile = profile.rows[0]
        if ( profile.rows[0] ){
          const url = `${process.env.API_URL}/profile/${profile.rows[0].id}`
          try {
            const res = await fetch(url);
            ctx.state.profile = await res.json();
          } catch ( error ){
            ctx.throw( error );
          }
        } else {
          ctx.throw(404, 'User does not exist');
        }
      }
    } catch ( error ){
      ctx.throw( error );
    }
  } else {
    const url = `${process.env.API_URL}/profile/default`
    try {
      const res = await fetch(url);
      ctx.state.profile = await res.json();
      // return next();
    } catch ( error ){
      ctx.throw( error );
    }
  }
  console.log( ctx.state.profile );
  return next();
})

const schema = require('./graphql')
gatewayRouter.post('/graphql', graphqlKoa(( ctx, next ) => ({
  schema, context:{ db:ctx.db, ...ctx.state }
})));
gatewayRouter.get('/graphql', graphqlKoa(( ctx, next ) => ({
  schema, context:{ db:ctx.db, ...ctx.state }
})));
gatewayRouter.get('/graphiql', graphiqlKoa({ endpointURL: '/graphql' }))

gatewayRouter.post('/checkUsernameAvailability', async ( ctx, next ) => {
  const { db, request } = ctx;
  const { username } = request.body;
  const res = await db.query(`SELECT * FROM profile WHERE id=$1`, [ username ]);
  if (!res.rows[0])
    ctx.status = 200;
})

const validate = require('./shared/validate');
gatewayRouter.post('/signup', async ( ctx, next ) => {
  const { request } = ctx;
  const { isValid, errors } = await validate.forms.signUp(
      request.body, validate,
      {
        username: `${process.env.GATEWAY_URL}/checkUsernameAvailability`,
        email: `${process.env.OAUTH_URL}/checkEmailAvailability?client_id=${process.env.OAUTH_CLIENT_ID}`
      }
    );
  console.log( isValid, errors );
  if ( isValid ){
    const { username, email, password1, password2 } = request.body;

  }

})

gatewayRouter.post('/login', async ( ctx, next ) => {
  const { db, request } = ctx;
  const { username, password } = request.body;
  try {
    const url = `
      ${process.env.OAUTH_URL}/auth` +
        `?grant_type=password` +
        `&username=${username}` +
        `&password=${password}` +
        `&scope=read%20write` +
        `&client_id=${process.env.OAUTH_CLIENT_ID}` +
        `&client_secret=${process.env.OAUTH_SECRET_KEY}`;
    const postCredentials = await fetch( url )
    const json = await postCredentials.json();
    if ( !json.access_token ) ctx.throw( json.status, json.message )
    const { access_token, refresh_token, expires_in } = json;
    try {
      const profile = await db.query(`SELECT * FROM profile WHERE email=$1`, [ username ]);
      await db.query(
        `INSERT INTO token
        ( access_token, refresh_token, service, expires_at ) VALUES ( $1, $2, $3, now() + interval '1 second' * $4)`,
        [ access_token, refresh_token, 'SPIRITOS', expires_in ]);
      await db.query(
        `INSERT INTO profile_token
        ( profile_id, access_token ) VALUES ( $1, $2 )`,
        [ profile.rows[0].id, access_token ]);
        ctx.status = 200;
        ctx.body = { access_token, profile:profile.rows[0] }
    } catch ( error ){
      ctx.throw( error.status, error.message );
    }
  } catch ( error ){
    ctx.throw( error.status, error.message );
  }
  return next();
})

// gateway.use( async ( ctx, next ) => {
  // await next();
// })

gateway.on('gateway-error', ( err, ctx ) => {
  console.log( 'GATEWAY_ERROR', ctx.body, ctx.status );
});

gatewayRouter.get('/health', ( ctx, next ) => ctx.status = 200 )
gateway
  .use( gatewayRouter.routes() )
  .use( gatewayRouter.allowedMethods() )
  .listen( process.env.GATEWAY_PORT )

/*
==========================================================================================================
  OAuth Server
========================================================================================================*/

const oauth = new Koa();
const oauthRouter = new KoaRouter();

oauth.context.dbPool = new pg.Pool({
  host:process.env.PGHOST_OAUTH,
  user:process.env.PGUSER_OAUTH,
  database:process.env.PGDATABASE_OAUTH,
  password:process.env.PGPASSWORD_OAUTH,
  port:process.env.PGPORT_OAUTH,
  max:process.env.PGPOOLSIZE_OAUTH,
  idleTimeoutMillis:process.env.PGCONNECT_TIMEOUT_OAUTH,
});
oauth.use( koaBody() );

// oauth.use( koaMorgan('tiny') );
oauth.use(( ctx, next ) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type');
  return next();
})

// Fetch pool client for each request
oauth.use( async ( ctx, next ) => {
  ctx.db = await ctx.dbPool.connect();
  return next();
})

// release client after use
oauth.use( async ( ctx, next ) => {
  await next();
  if ( ctx.db )
    ctx.db.release();
})


// Error handler
oauth.use( async ( ctx, next ) => {
  try {
    await next();
  } catch ( err ){
    ctx.status = err.status || 500;
    ctx.body = { status: ctx.status, message: err.message };
    ctx.app.emit('oauth-error', err, ctx);
  }
})

// Get Client information
// Reject any requests that do not include client_id and secret_key
oauth.use( async ( ctx, next ) => {
  const { db, request } = ctx;
  const { client_id, client_secret } = request.query;
  try {
    const result = await db.query(
    `SELECT * FROM client
    WHERE id=$1`,
    [ client_id ]);
    if ( !result.rows[ 0 ] )
      ctx.throw(404, 'Client does not exist');
    ctx.client = {
      id:result.rows[ 0 ].id,
      secretKeyProvided: client_secret === result.rows[ 0 ].secret_key
    }
  } catch ( error ) {
    ctx.throw(error.status, error.message);
  }
  return next();
});

oauthRouter.post('/checkEmailAvailability', async ( ctx, next ) => {
  const { db, request } = ctx;
  const { email } = request.body;
  try {
    const res = await db.query(`
    SELECT * FROM spiritos_user
    WHERE username=$1`,
    [email]);
    if (!res.rows[0])
      ctx.status = 200;
  } catch ( error ){
    ctx.throw( error.status, error.message );
  }
})

oauthRouter.post('/introspectToken', async ( ctx, next ) => {
  const { db, client, request } = ctx;
  const { token } = request.body;
  if ( client.secretKeyProvided ) {
    try {
      const res = await db.query(
        `SELECT spiritos_user.username, token.expires_at, token.scope FROM spiritos_user, token
        WHERE username IN (
          SELECT username FROM user_token
          WHERE token_id IN (
            SELECT token_id FROM client_token
            WHERE client_id=$1 AND token_id IN (
              SELECT id FROM token
              WHERE access_token = $2 AND expires_at > to_timestamp($3)
      )))`, [client.id, token, +new Date() / 1000]);
      const user = res.rows[0];
      if (user) {
        ctx.body = {
          active: true,
          username: user.username,
          scope: user.scope,
          exp: Math.floor(+new Date(user.expires_at) / 1000)
        };
      } else {
        ctx.body = {active: false};
      }
    } catch ( error ) {
      ctx.throw( error.status, error.message );
    }
  }
  return next();
})

const bcrypt = require('bcryptjs');
oauthRouter.post('/user', async ( ctx, next ) => {
  const { db, client, request } = ctx;
  if ( client.id === 'SPIRITOS' && client.secretKeyProvided ){
    const { username, password } = request.body;
    if ( username && password ){
      const salt = bcrypt.genSaltSync( 10 );
      const hash = bcrypt.hashSync( password, salt );
      try {
        await db.query(
        `INSERT INTO spiritos_user
        ( username, password, salt ) VALUES ( $1, $2, $3 )`,
        [ username, hash, salt ]);
        ctx.status = 201;
        ctx.body = { username }
      } catch ( error ) {
        if ( error.code === '23505' )
          ctx.throw(409, 'Account already exists' );
      }
    } else {
      ctx.throw(409, 'Failed to create an account' );
    }
  } else {
    ctx.throw(401, 'Client is not authorized to create an SpiritOS User' );
  }
});

const secureRandom = require('secure-random');
const genToken = () => (
  Array.from( secureRandom.randomBuffer(32), byte => {
    return ('0' + ( byte & 0xFF ).toString(16)).slice(-2);
  }).join('')
);
const generateTokens = () => ({
  token_type:'bearer',
  access_token: genToken(),
  refresh_token: genToken()
});

oauthRouter.post('/logout', async ( ctx, next ) => {
  const { db, request } = ctx;
  const { username, access_token } = request.body;
  try {
    await db.query(`
      DELETE FROM token WHERE
      access_token=$1 AND id IN (
        SELECT token_id FROM user_token WHERE
        username=$2 )`,
      [ access_token, username ])
    ctx.status = 200;
    ctx.body = { status:200, message:'success' }
  } catch ( error ){
    ctx.throw( error.status, error.message );
  }
})

oauthRouter.get('/auth', async ( ctx, next ) => {
  const { db, client, request } = ctx;
  const grant_type = request.query.grant_type;
  if ( !grant_type )
    ctx.throw(422, 'Please include a grant_type');

  switch ( grant_type ){
    case 'authorization_code':
      break;
    case 'password':
      if ( client.id === 'SPIRITOS' && client.secretKeyProvided ){
        const { username, password, scope } = request.query;
        try {
          const res = await db.query(
          `SELECT * FROM spiritos_user
          WHERE username=$1`,
          [ username ]);
          if ( !res.rows[0] ) {
            ctx.throw(404, 'User does not exist');
          }
          const user = res.rows[0];
          const passwordMatches = bcrypt.hashSync( password, user.salt ) === user.password;
          if ( passwordMatches ){
            const { access_token, refresh_token, token_type } = await generateTokens();
            try {
              const accessTokens = await db.query(
              `INSERT INTO token
              ( access_token, refresh_token, scope, expires_at ) VALUES ( $1, $2, $3, to_timestamp($4) ) RETURNING ID, EXPIRES_AT`,
              [ access_token, refresh_token, scope, Math.floor(+new Date() + 86400000)/1000 ]);
              const tokenId = accessTokens.rows[0].id;
              const expires_at = accessTokens.rows[0].expires_at;
              await db.query(
              'INSERT INTO user_token ( username, token_id ) VALUES ( $1, $2 )',
              [ username, tokenId ]);
              await db.query(
              'INSERT INTO client_token ( client_id, token_id ) VALUES ( $1, $2 )',
              [ client.id, tokenId ]);
              ctx.set('Cache-Control', 'no-store');
              ctx.set('Pragma', 'no-cache');
              ctx.body = { access_token, refresh_token, token_type, expires_in: 86400, expires_at };
            } catch ( error ){
              ctx.throw( error );
            }
          } else {
            ctx.throw(400, 'Password is incorrect');
          }
        } catch ( error ){
          ctx.throw( error );
        }
      } else {
        ctx.throw(401, 'Client is not authorized to authenticate with grant_type=password');
      }
      break;
  }
  return next();
});


oauth.on('oauth-error', ( err, ctx ) => {
  console.log('OAUTH_ERROR', ctx.body, ctx.status );
});

oauth
  .use( oauthRouter.routes() )
  .use( oauthRouter.allowedMethods() )
  .listen( process.env.OAUTH_PORT )
