import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::progress.progress', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const lessonDocId = ctx.request.body?.data?.lesson;
    if (!lessonDocId) return ctx.badRequest('lesson is required');

    const lesson = await strapi.db.query('api::lesson.lesson').findOne({
      where: { documentId: lessonDocId },
    });
    if (!lesson) return ctx.badRequest('Lesson not found');

    const existing = await strapi.db.query('api::progress.progress').findOne({
      where: {
        student: user.id,
        lesson: lesson.id,
      },
    });

    if (existing) {
      return ctx.badRequest('Progress record already exists for this lesson');
    }

    const progress = await strapi.entityService.create('api::progress.progress', {
      data: {
        student: user.id,
        lesson: lesson.id,
        completed: ctx.request.body?.data?.completed || false,
      },
    });

    return { data: progress };
  },
}));
