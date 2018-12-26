module.exports = `
  type Mutation {
    login(username:String!, password:String!): AuthResponse
    logout: AuthResponse
  }
`;
