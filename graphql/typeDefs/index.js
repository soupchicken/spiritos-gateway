const Schema = `
  schema {
    query: Query
    mutation: Mutation
  }`
const Query = require('./queries');
const Mutation = require('./mutations');
const Types = require('./types');
module.exports = [
  Schema,
  Query,
  Mutation,
  ...Types
]
