/**
 * blog-post controller
 *
 * Draft & Publish lifecycle. Content Manager and Admin manage posts
 * (permission matrix); every other role and anonymous visitors only ever see
 * Published posts.
 *
 * - find/findOne: non-managers are forced to status=published so Draft posts
 *   can never leak through the ?status=draft query param.
 * - create: honors `data.published` (default true). Draft = publishedAt null.
 * - update: `data.published` true publishes (draft -> published version),
 *   false unpublishes (published version removed, draft kept). This uses
 *   Strapi's documents service because a plain publishedAt:null update keeps
 *   the published version live under versioned Draft & Publish.
 * - create also auto-assigns the current user as author; find/findOne enrich
 *   the author relation (REST cannot populate plugin users).
 */

import { factories } from '@strapi/strapi';
import enrichUserRelation from '../../../utils/enrich-user-relation';

const uid = 'api::blog-post.blog-post';

async function userRole(ctx: any): Promise<string | null> {
  const user = ctx.state.user;
  if (!user?.id) return null;
  const record = await strapi
    .query('plugin::users-permissions.user')
    .findOne({ where: { id: user.id }, populate: ['role'] });
  return record?.role?.type || null;
}

function canManageBlog(role: string | null): boolean {
  return role === 'admin' || role === 'content_manager';
}

export default factories.createCoreController(uid, ({ strapi }) => {
  async function reflectPublishedState(ctx: any, result: any) {
    const manager = canManageBlog(await userRole(ctx));
    if (!manager) return;
    const docs = strapi.documents(uid);
    if (Array.isArray(result)) {
      const published = await docs.findMany({
        status: 'published',
        pagination: { limit: -1 },
        fields: ['documentId', 'publishedAt'],
      }) as any[];
      const byDoc = new Map((published || []).map((e) => [e.documentId, e.publishedAt]));
      result.forEach((entry: any) => {
        if (byDoc.has(entry.documentId)) entry.publishedAt = byDoc.get(entry.documentId);
      });
    } else if (result?.documentId) {
      const published = await docs.findOne({
        documentId: result.documentId,
        status: 'published',
        fields: ['documentId', 'publishedAt'],
      }) as any;
      if (published && published.publishedAt != null) {
        result.publishedAt = published.publishedAt;
      }
    }
  }

  return {
    async find(ctx) {
      if (!canManageBlog(await userRole(ctx))) {
        ctx.query.status = 'published';
      }
      const result = await super.find(ctx);
      await reflectPublishedState(ctx, result.data);
      await enrichUserRelation(strapi, uid, 'author', result.data);
      return result;
    },

    async findOne(ctx) {
      if (!canManageBlog(await userRole(ctx))) {
        ctx.query.status = 'published';
      }
      const result = await super.findOne(ctx);
      await reflectPublishedState(ctx, result?.data);
      await enrichUserRelation(strapi, uid, 'author', result?.data);
      return result;
    },

  async create(ctx) {
    const user = ctx.state.user;
    const data = { ...(ctx.request.body?.data || {}) };
    const publish = data.published !== false;
    delete data.published;

    if (user && !data.author) {
      data.author = user.id;
    }

    const entry = await strapi.entityService.create(uid, {
      data: {
        ...data,
        ...(publish ? { publishedAt: new Date().toISOString() } : { publishedAt: null }),
      },
    });

    return { data: entry };
  },

  async update(ctx) {
    const documentId = ctx.params.id;
    const data = { ...(ctx.request.body?.data || {}) };
    const publish = data.published !== false;
    delete data.published;

    const docs = strapi.documents(uid);
    const result = await docs.update({
      documentId,
      data,
      status: publish ? 'published' : 'draft',
    });

    if (!publish) {
      await docs.unpublish({ documentId });
    }

    return { data: result };
  },
  };
});