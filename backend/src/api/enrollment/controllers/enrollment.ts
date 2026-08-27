import { factories } from '@strapi/strapi';
import scopedFind from '../../../utils/scoped-find';
import sanitizeUserFields from '../../../utils/sanitize-user-fields';

const getRole = async (strapi: any, userId: number) => {
  const u = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { id: userId }, populate: ['role'] });
  return u?.role?.type || 'authenticated';
};

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
      scopes.push({ course: { id: { $in: courseIds } } });
    }

    const result = await scopedFind(strapi, 'api::enrollment.enrollment', ctx, scopes, {
      populate: { student: true, course: true },
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
      const enrollment = await strapi.db.query('api::enrollment.enrollment').findOne({
        where: { documentId: id },
        populate: ['student', 'course'],
      });

      if (!enrollment) return ctx.notFound('Enrollment not found');

      if (roleType === 'student' && enrollment.student?.id !== user.id) {
        return ctx.forbidden('You can only view your own enrollments');
      }
      if (roleType === 'instructor') {
        const courseId = typeof enrollment.course === 'object'
          ? enrollment.course?.id
          : enrollment.course;
        const course = await strapi.db.query('api::course.course').findOne({
          where: { id: courseId },
          populate: ['instructor'],
        });
        if (course?.instructor?.id !== user.id) {
          return ctx.forbidden('You can only view enrollments of your own courses');
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
      const enrollment = await strapi.db.query('api::enrollment.enrollment').findOne({
        where: { documentId: id },
        populate: ['student'],
      });
      if (!enrollment) return ctx.notFound('Enrollment not found');
      if (enrollment.student?.id !== user.id) {
        return ctx.forbidden('You can only delete your own enrollments');
      }
    }

    return super.delete(ctx);
  },
}));