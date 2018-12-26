const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');

module.exports = makeExecutableSchema({
  typeDefs, resolvers
});
