const fetch = require('node-fetch');
const login = async ( obj, args, context ) => {
  const { db, profile, accessToken } = context;
  if ( profile.id !== 'default'){
    try {
      const url = `
        ${process.env.OAUTH_URL}/logout` +
          `?client_id=${process.env.OAUTH_CLIENT_ID}` +
          `&client_secret=${process.env.OAUTH_SECRET_KEY}`;
      const res = await fetch( url, {
        method:'POST',
        body:JSON.stringify({ username:profile.email, access_token:accessToken }),
        headers: { 'Content-Type': 'application/json' }
      })
      const json = await res.json();
      if ( json.status === 200 ){
        await db.query(`
          DELETE FROM profile_token WHERE
          access_token=$1`,
          [ accessToken ]);
        const url = `${process.env.API_URL}/profile/default`
        const res = await fetch(url);
        const payload = {
          token:null,
          profile:await res.json()
        }
        return payload;
      } else {
        throw new Error( json.message );
      }

    } catch ( error ){
      throw new Error( error.message );
    }
  } else {
    throw new Error('Default user cannot sign out')
  }
}

module.exports = login;
