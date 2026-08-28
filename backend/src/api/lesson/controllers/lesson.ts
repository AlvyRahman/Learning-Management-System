/**
 * lesson controller
 */

import { factories } from '@strapi/strapi';

const uid = 'api::lesson.lesson';

async function userRole(ctx: any): Promise<string | null> {
  const user = ctx.state.user;
  if (!user) return null;
  const record = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { id: user.id }, populate: ['role'] });
  return record?.role?.type || null;
}

async function accessibleCourseIds(userId: number, roleType: string | null): Promise<number[]> {
  if (roleType === 'admin' || roleType === 'content_manager') return [-1];
  if (roleType === 'instructor') {
    const courses = await strapi.db
      .query('api::course.course')
      .findMany({ where: { instructor: { id: userId } } });
    return (courses || []).map((c: any) => c.id);
  }
  if (roleType === 'student') {
    const enrollments = await strapi.db
      .query('api::enrollment.enrollment')
      .findMany({ where: { student: userId }, populate: { course: true }, limit: 500 });
    return [...new Set((enrollments || []).map((e: any) => e.course?.id).filter(Boolean))];
  }
  return [];
}

function seenCourseId(lesson: any): number | undefined {
  return lesson?.course?.id;
}

export default factories.createCoreController(uid, ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.forbidden('You must be logged in to view lessons');
    const roleType = await userRole(ctx);
    const courseIds = await accessibleCourseIds(user.id, roleType);
    if (courseIds.length === 0) {
      return { data: [], meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 0 } } };
    }
    const courseFilter = courseIds.includes(-1)
      ? {}
      : { course: { id: { $in: courseIds } } };
    ctx.query.filters = { $and: [ctx.query.filters || {}, courseFilter] };

    return super.find(ctx);
  },

  async findOne(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.forbidden('You must be logged in to view lessons');
    const roleType = await userRole(ctx);
    const courseIds = await accessibleCourseIds(user.id, roleType);
    if (!courseIds.includes(-1)) {
      const existing = ctx.query.populate;
      const pop =
        existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {};
      ctx.query.populate = { ...pop, course: true };
    }

    const result = await super.findOne(ctx);
    const lesson = result?.data;
    if (lesson && !courseIds.includes(-1)) {
      const courseId = seenCourseId(lesson as any);
      if (!courseId || !courseIds.includes(courseId)) {
        return ctx.forbidden('You can only view lessons of your enrolled or owned courses');
      }
    }
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