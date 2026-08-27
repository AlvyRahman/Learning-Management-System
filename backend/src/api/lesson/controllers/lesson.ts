/**
 * lesson controller
 */

import { factories } from '@strapi/strapi';

const uid = 'api::lesson.lesson';

export default factories.createCoreController(uid, ({ strapi }) => ({
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