const fetch = require('node-fetch');
const profile = async ( obj, args, context ) => {
  console.log( context.profile );
  return context.profile
  // const url = `${process.env.API_URL}/profile/${context.profile.id}`
  // try {
    // const res = await fetch(url);
    // const profile = res.json();
    // return profile
  // } catch ( error ){
    // throw new Error( error );
  // }
};

module.exports = profile;
