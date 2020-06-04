"use strict";

const { sanitizeEntity } = require("strapi-utils");

const { orderTable, deleteProps } = require("../../../lib/utils");

const DEFAULT_LIMIT = 12;
const DEFAULT_PAGE = 0;
const DEFAULT_ORDER = "asc";

// this isnt a pure fn, i dont give a shit ok
const mapLegacyUpdateProps = entity => {
  // transforms
  entity.date = entity.createdAt;
  deleteProps(entity, ["id", "__v", "createdAt", "updatedAt"]);

  return entity;
};

const mapLegacyUpdateQuery = query => {
  // title regex search
  if (query.title != null) {
    query.title_contains = query.title;
    Reflect.deleteProperty(query, "title");
  }

  // sort, order (1 = asc, -1 = desc)
  if (query.sort != null) {
    query._sort = `${query.sort}:${orderTable[query.order] || DEFAULT_ORDER}`;
    deleteProps(query, ["sort", "order"]);
  }

  // limit, page
  query._limit = query.limit || DEFAULT_LIMIT;
  Reflect.deleteProperty(query, "limit");

  query._start = (query.page || DEFAULT_PAGE) * query._limit;
  Reflect.deleteProperty(query, "page");

  // field changes
  if (query.date != null) {
    query.createdAt = query.date;
    Reflect.deleteProperty(query, "date");
  }
  if (query._sort != null) {
    const [sort, order] = query._sort.split(":");

    if (sort === "date") {
      query._sort = `createdAt:${order}`;
    }
  }

  return query;
};

// yes were missing a lot of error handing, idc
module.exports = {
  find: async ctx => {
    const { query } = ctx;

    mapLegacyUpdateQuery(query);

    const [updates, count, total] = await Promise.all([
      strapi.services.update
        .find(query)
        .then(entities => entities
          .map(entity => mapLegacyUpdateProps(sanitizeEntity(entity, { model: strapi.models.update })))),
      strapi.services.update
        .count(query),
      strapi.services.update
        .count({}),
    ]);

    return {
      code: 200,
      success: true,
      error: null,
      data: {
        // total required for legacy reasons, should use /count in the future
        total,
        matched: count,
        updates,
      },
    };
  },

  count: async ctx => {
    const { query } = ctx;

    const count = await strapi.services.update.count(query);

    return {
      count,
    };
  },

  findOne: async ctx => {
    const { id } = ctx.params;

    const update = await strapi.services.update
      .findOne({ id })
      .then(entity => mapLegacyUpdateProps(sanitizeEntity(entity, { model: strapi.models.update })));

    // im guessing that this is the same route signature, the
    // old one doesnt even work so lel
    return {
      code: 200,
      success: true,
      error: null,
      data: update,
    };
  },
};
