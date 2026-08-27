import { factories } from '@strapi/strapi';
import scopedFind from '../../../utils/scoped-find';
import sanitizeUserFields from '../../../utils/sanitize-user-fields';

const getRole = async (strapi: any, userId: number) => {
  const u = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { id: userId }, populate: ['role'] });
  return u?.role?.type || 'authenticated';
};

export default factories.createCoreController('api::progress.progress', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const lessonDocId = ctx.request.body?.data?.lesson;
    if (!lessonDocId) return ctx.badRequest('lesson is required');

    const lesson = await strapi.db.query('api::lesson.lesson').findOne({
      where: { documentId: lessonDocId },
      populate: { course: true },
    });
    if (!lesson) return ctx.badRequest('Lesson not found');

    const courseId = lesson.course?.id;

    const userRecord = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: user.id }, populate: ['role'] });
    const roleType = userRecord?.role?.type;

    if (roleType === 'student') {
      const myEnrollments = await strapi.db
        .query('api::enrollment.enrollment')
        .findMany({ where: { student: user.id }, populate: { course: true }, limit: 500 });
      const enrolled = (myEnrollments || []).some(
        (e: any) => e.course?.id === courseId
      );
      if (!enrolled) {
        return ctx.forbidden('You must be enrolled in this course to track progress');
      }
    }

    const myProgress = await strapi.db.query('api::progress.progress').findMany({
      where: { student: user.id },
      populate: { lesson: true },
      limit: 500,
    });
    const existing = (myProgress || []).some((p: any) => p.lesson?.id === lesson.id);
    if (existing) {
      return ctx.badRequest('Progress record already exists for this lesson');
    }

    const progress = await strapi.entityService.create('api::progress.progress', {
      data: {
        student: user.id,
        lesson: lesson.id,
        completed: ctx.request.body?.data?.completed ?? true,
      },
    });

    return { data: progress };
  },

  async find(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const roleType = await getRole(strapi, user.id);

    const scopes: Record<string, unknown>[] = [];
    if (roleType === 'student') {
      scopes.push({ student: { id: user.id } });
    } else if (roleType === 'instructor') {
      const courses = await strapi.db.query('api::course.course').findMany({
        where: { instructor: { id: user.id } },
      });
      const courseIds = courses.map((c: any) => c.id);
      const lessons = courseIds.length
        ? await strapi.db.query('api::lesson.lesson').findMany({
            where: { course: { id: { $in: courseIds } } },
          })
        : [];
      const lessonIds = lessons.map((l: any) => l.id);
      scopes.push({ lesson: { id: { $in: lessonIds } } });
    }

    const result = await scopedFind(strapi, 'api::progress.progress', ctx, scopes, {
      populate: { student: true, lesson: true },
    });
    sanitizeUserFields(result.data, 'student');
    return { data: result.data, meta: result.meta };
  },

  async findOne(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const roleType = await getRole(strapi, user.id);
    const { id } = ctx.params;

    if (roleType === 'student' || roleType === 'instructor') {
      const progress = await strapi.db.query('api::progress.progress').findOne({
        where: { documentId: id },
        populate: ['student', 'lesson'],
      });

      if (!progress) return ctx.notFound('Progress record not found');

      if (roleType === 'student' && progress.student?.id !== user.id) {
        return ctx.forbidden('You can only view your own progress');
      }
      if (roleType === 'instructor') {
        const lessonId = typeof progress.lesson === 'object'
          ? progress.lesson?.id
          : progress.lesson;
        const lesson = await strapi.db.query('api::lesson.lesson').findOne({
          where: { id: lessonId },
          populate: { course: { populate: ['instructor'] } },
        });
        if (lesson?.course?.instructor?.id !== user.id) {
          return ctx.forbidden('You can only view progress in your own courses');
        }
      }
    }

    return super.findOne(ctx);
  },

  async delete(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const roleType = await getRole(strapi, user.id);

    if (roleType === 'student') {
      const { id } = ctx.params;
      const progress = await strapi.db.query('api::progress.progress').findOne({
        where: { documentId: id },
        populate: ['student'],
      });
      if (!progress) return ctx.notFound('Progress record not found');
      if (progress.student?.id !== user.id) {
        return ctx.forbidden('You can only delete your own progress records');
      }
    }

    return super.delete(ctx);
  },
}));