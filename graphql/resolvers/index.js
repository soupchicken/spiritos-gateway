const Query = require('./queries');
const Mutation = require( './mutations');
const GraphQLJSON = require('graphql-type-json');


module.exports = {
  Query,
  Mutation,
  JSON: GraphQLJSON
};
