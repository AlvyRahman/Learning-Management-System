import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const courseDocId = ctx.request.body?.data?.course;
    if (!courseDocId) return ctx.badRequest('course is required');

    const course = await strapi.db.query('api::course.course').findOne({
      where: { documentId: courseDocId },
    });
    if (!course) return ctx.badRequest('Course not found');

    const existing = await strapi.db.query('api::enrollment.enrollment').findOne({
      where: {
        student: user.id,
        course: course.id,
      },
    });

    if (existing) {
      return ctx.badRequest('Already enrolled in this course');
    }

    const enrollment = await strapi.entityService.create('api::enrollment.enrollment', {
      data: {
        student: user.id,
        course: course.id,
      },
    });

    return { data: enrollment };
  },
}));
