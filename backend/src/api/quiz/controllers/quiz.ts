/**
 * quiz controller
 *
 * find/findOne strip correctIndex from populated questions so answer keys are
 * never exposed to students through the REST API.
 */

import { factories } from '@strapi/strapi';

const uid = 'api::quiz.quiz';

function stripAnswerKeys(payload: any) {
  const entries = Array.isArray(payload) ? payload : payload ? [payload] : [];
  for (const entry of entries) {
    if (Array.isArray(entry?.questions)) {
      for (const q of entry.questions) {
        delete q.correctIndex;
      }
    }
  }
  return payload;
}

export default factories.createCoreController(uid, ({ strapi }) => ({
  async find(ctx) {
    const result = await super.find(ctx);
    stripAnswerKeys(result.data);
    return result;
  },

  async findOne(ctx) {
    const result = await super.findOne(ctx);
    stripAnswerKeys(result?.data);
    return result;
  },

  async create(ctx) {
    const data = { ...(ctx.request.body?.data || {}) };

    let courseId: number | undefined;
    if (data.course) {
      const course = await strapi.db.query('api::course.course').findOne({
        where: { documentId: data.course },
      });
      if (!course) return ctx.badRequest('Course not found');
      courseId = course.id;
    }

    const entry = await strapi.entityService.create(uid, {
      data: {
        ...data,
        course: courseId,
      },
    });

    return { data: entry };
  },
}));