const fetch = require('node-fetch');
const login = async ( obj, args, context ) => {
  const { db } = context;
  const { username, password } = args;
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
    if ( !json.access_token )
      throw new Error( json.message )
    const { access_token, refresh_token, expires_in } = json;
    try {
      const profileQuery = await db.query(`SELECT * FROM profile WHERE email=$1`, [ username ]);
      await db.query(
        `INSERT INTO token
        ( access_token, refresh_token, service, expires_at ) VALUES ( $1, $2, $3, now() + interval '1 second' * $4)`,
        [ access_token, refresh_token, 'SPIRITOS', expires_in ]);
      await db.query(
        `INSERT INTO profile_token
        ( profile_id, access_token ) VALUES ( $1, $2 )`,
        [ profileQuery.rows[0].id, access_token ]);

        const url = `${process.env.API_URL}/profile/${profileQuery.rows[0].id}`
        const res = await fetch(url);
        const profile = await res.json();
        console.log( profile, "THIS IS IT???" );
        return { token:access_token, profile };
    } catch ( error ){
      throw new Error( error.message )
    }
  } catch ( error ){
    throw new Error( error.message )
  }
}

module.exports = login;
