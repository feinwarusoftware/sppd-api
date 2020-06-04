"use strict";

const { sanitizeEntity } = require("strapi-utils");

const { orderTable, deleteProps, deletePropsRet, deleteStrapiPropsRet } = require("../../../lib/utils");

const DEFAULT_LIMIT = 12;
const DEFAULT_PAGE = 0;
const DEFAULT_ORDER = "asc";

// this isnt a pure fn, i dont give a shit ok
const mapLegacyCardProps = entity => {
  // transforms
  if (entity.aliases != null) {
    entity.aliases = entity.aliases.split("\n");
  } else {
    entity.aliases = [];
  }
  entity.image_url = entity.image.url;
  // entity.image overwritten after here!
  entity.image = entity.image.name;
  // no optional chaning :cry:
  if (entity.character_tags != null) {
    entity.character_tags = entity.character_tags.split("\n");
  }
  entity.powers = entity.powers.map(power => deleteStrapiProps(power));
  // tech tree
  entity.tech_tree = {
    slots: entity.upgrades.map(upgrade => deleteStrapiPropsRet(upgrade.slot)),
    levels: entity.levels.map(level => level.slots.map(slot => deleteStrapiPropsRet(slot))),
  };
  entity.created_at = entity.createdAt;
  entity.updated_at = entity.updatedAt;
  deleteProps(entity, ["id", "__v", "createdAt", "updatedAt", "upgrades", "levels"]);

  return entity;
};

const mapLegacyCardQuery = query => {
  // name regex search
  if (query.name != null) {
    query.name_contains = query.name;
    Reflect.deleteProperty(query, "name");
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
  if (query.image != null) {
    query["image.name"] = query.image;
    Reflect.deleteProperty(query, "image");
  }
  if (query.created_at != null) {
    query.createdAt = query.created_at;
    Reflect.deleteProperty(query, "created_at");
  }
  if (query.updated_at != null) {
    query.updatedAt = query.updated_at;
    Reflect.deleteProperty(query, "updated_at");
  }
  if (query._sort != null) {
    const [sort, order] = query._sort.split(":");

    if (sort === "image") {
      query._sort = `image.name:${order}`;
    }
    if (sort === "created_at") {
      query._sort = `createdAt:${order}`;
    }
    if (sort === "updated_at") {
      query._sort = `updatedAt:${order}`;
    }
  }

  return query;
};

// yes were missing a lot of error handing, idc
module.exports = {
  find: async ctx => {
    const { query } = ctx;

    mapLegacyCardQuery(query);

    const [cards, count, total] = await Promise.all([
      strapi.services.card
        .find(query)
        .then(entities => entities
          .map(entity => deletePropsRet(mapLegacyCardProps(sanitizeEntity(entity, { model: strapi.models.card })), ["tech_tree"]))),
      strapi.services.card
        .count(query),
      strapi.services.card
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
        cards,
      },
    };
  },

  count: async ctx => {
    const { query } = ctx;

    const count = await strapi.services.card.count(query);

    return {
      count,
    };
  },

  findOne: async ctx => {
    const { id } = ctx.params;

    const card = await strapi.services.card
      .findOne({ id })
      .then(entity => mapLegacyCardProps(sanitizeEntity(entity, { model: strapi.models.card })));

    return {
      code: 200,
      success: true,
      error: null,
      data: card,
    };
  },

  image: async ctx => {
    const { image } = ctx.params;

    const card = await strapi.services.card
      .findOne({ "image.name": image })
      .then(entity => mapLegacyCardProps(sanitizeEntity(entity, { model: strapi.models.card })));

    return {
      code: 200,
      success: true,
      error: null,
      data: card,
    };
  },

  list: async () => {
    const cards = await strapi
      .query("card").model
      .find({}, "_id name aliases image updatedAt")
      .then(entities => entities
      .map(entity => sanitizeEntity(entity, { model: strapi.models.card }))
      .map(entity => {
        // transforms
        entity.aliases = entity.aliases.split("\n");
        entity.image_url = entity.image.url;
        // entity.image overwritten after here!
        entity.image = entity.image.name;
        entity.updated_at = entity.updatedAt;
        deleteProps(entity, ["id", "updatedAt", "powers", "upgrades", "levels", ""]);

        return entity;
      }));

    return {
      code: 200,
      success: true,
      error: null,
      data: cards,
    };
  },
};
