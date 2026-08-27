/**
 * blog-post controller
 *
 * create auto-assigns the current user as author; find/findOne enrich the
 * author relation (REST cannot populate plugin users).
 */

import { factories } from '@strapi/strapi';
import enrichUserRelation from '../../../utils/enrich-user-relation';

const uid = 'api::blog-post.blog-post';

export default factories.createCoreController(uid, ({ strapi }) => ({
  async find(ctx) {
    const result = await super.find(ctx);
    await enrichUserRelation(strapi, uid, 'author', result.data);
    return result;
  },

  async findOne(ctx) {
    const result = await super.findOne(ctx);
    await enrichUserRelation(strapi, uid, 'author', result?.data);
    return result;
  },

  async create(ctx) {
    const user = ctx.state.user;
    const data = { ...(ctx.request.body?.data || {}) };

    if (user && !data.author) {
      data.author = user.id;
    }

    const entry = await strapi.entityService.create(uid, {
      data,
    });

    return { data: entry };
  },
}));