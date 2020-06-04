'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const path = require('path');
const fs = require('fs');
const url = require('url');
const _ = require('lodash');
const mongoose = require('mongoose');
require('mongoose-long')(mongoose);
const Mongoose = mongoose.Mongoose;

const relations = require('./relations');
const buildQuery = require('./buildQuery');
const getQueryParams = require('./get-query-params');
const mountModels = require('./mount-models');
const queries = require('./queries');

const isMongooseConnection = ({ connector }) => connector === 'mongoose';

module.exports = function(strapi) {
  function initialize() {
    const { connections } = strapi.config;

    const connectionsPromises = Object.keys(connections)
      .filter(key => isMongooseConnection(connections[key]))
      .map(async connectionName => {
        const connection = connections[connectionName];
        const instance = new Mongoose();

        const uri = connection.uri || "";
        const options = connection.options || {};

        try {
          await instance.connect(uri, options);
        } catch (error) {
          const err = new Error(`Error connecting to the Mongo database. ${error.message}`);
          delete err.stack;
          throw err;
        }

        try {
          const { version } = await instance.connection.db.admin().serverInfo();
          instance.mongoDBVersion = version;
        } catch {
          instance.mongoDBVersion = null;
        }

        const initFunctionPath = path.resolve(
          strapi.config.appPath,
          'config',
          'functions',
          'mongoose.js'
        );

        if (fs.existsSync(initFunctionPath)) {
          require(initFunctionPath)(instance, connection);
        }

        const debug = ((connection.settings) || {}).debug || false;

        instance.set('debug', debug === true || debug === 'true');
        instance.set('useFindAndModify', false);

        const ctx = {
          instance,
          connection,
        };

        _.set(strapi, `connections.${connectionName}`, instance);

        return Promise.all([
          mountComponents(connectionName, ctx),
          mountApis(connectionName, ctx),
          mountAdmin(connectionName, ctx),
          mountPlugins(connectionName, ctx),
        ]);
      });

    return Promise.all(connectionsPromises);
  }

  function mountComponents(connectionName, ctx) {
    const options = {
      models: _.pickBy(strapi.components, ({ connection }) => connection === connectionName),
      target: strapi.components,
    };

    return mountModels(options, ctx);
  }

  function mountApis(connectionName, ctx) {
    const options = {
      models: _.pickBy(strapi.models, ({ connection }) => connection === connectionName),
      target: strapi.models,
    };

    return mountModels(options, ctx);
  }

  function mountAdmin(connectionName, ctx) {
    const options = {
      models: _.pickBy(strapi.admin.models, ({ connection }) => connection === connectionName),
      target: strapi.admin.models,
    };

    return mountModels(options, ctx);
  }

  function mountPlugins(connectionName, ctx) {
    return Promise.all(
      Object.keys(strapi.plugins).map(name => {
        const plugin = strapi.plugins[name];
        return mountModels(
          {
            models: _.pickBy(plugin.models, ({ connection }) => connection === connectionName),
            target: plugin.models,
          },
          ctx
        );
      })
    );
  }

  return {
    initialize,
    getQueryParams,
    buildQuery,
    queries,
    ...relations,
    get defaultTimestamps() {
      return ['createdAt', 'updatedAt'];
    },
  };
};
