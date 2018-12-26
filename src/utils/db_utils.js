'use strict';

const read_conf = require('properties-reader');
const properties = read_conf(process.env.CONFIG_FILE);
const spiritos_error = require('../SpiritOSError');
const pg = require('pg');

const postgres_db_configuration = {
  host: properties.get('gateway.api.db.postgres.host'),
  user: properties.get('gateway.api.db.postgres.user'),
  database: properties.get('gateway.api.db.postgres.database'),
  password: properties.get('gateway.api.db.postgres.password'),
  port: properties.get('gateway.api.db.postgres.port'),
  max: properties.get('gateway.api.db.postgres.pool_size'),
  idleTimeoutMillis: properties.get('gateway.api.db.postgres.timeout')
};


const db = new pg.Pool(postgres_db_configuration);

db.on('error', (err, client) => {
  console.error('idle client error', err.message, err.stack)
});

/**
 * Executes the given query in the database
 * @param query the query to be executed
 * @param cb callback function
 */
const run = (query, params, cb) => {
  db.connect((error, client, free_pool_client) => {
    if(error)
      return cb(new spiritos_error('Error fetching client from pool', 500));

    client.query(query, params, (error, result) => {
      free_pool_client();

      return cb(map_error(error), result);
    });
  });
};

/**
 * Maps the POSTGRES SQL error codes and wrap them in a nice spiritos_error to bubble it up to service
 * @param error the POSTGRES error
 * @returns {*} an spiritos_error with a descriptive message, or null
 */
const map_error = (error) => {
  if(error) {
    switch(error.code){
      case '23505': return new spiritos_error('Entity already exists', 422);
      default : return new spiritos_error('Error executing query', 500);
    }
  } else {
    return null;
  }
};

module.exports = {
  run : run,
  map_error : map_error
};
