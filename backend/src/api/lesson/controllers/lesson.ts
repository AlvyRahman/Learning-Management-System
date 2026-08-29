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
  if (roleType === 'admin' || roleType === 'content_manager' || roleType === 'instructor') {
    return [-1];
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

async function orderTaken(courseId: number, order: number, excludeId?: number): Promise<boolean> {
  const where: any = { course: courseId, order };
  if (excludeId) where.id = { $ne: excludeId };
  const existing = await strapi.db.query(uid).findOne({ where });
  return Boolean(existing);
}

async function userFromRequest(ctx: any): Promise<any> {
  let user = ctx.state.user;
  if (user) return user;
  const header = ctx.request?.headers?.authorization || '';
  const token = String(header).replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const payload = await strapi
      .plugin('users-permissions')
      .service('jwt')
      .verify(token);
    if (!payload?.id) return null;
    user = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: payload.id }, populate: ['role'] });
    if (user) ctx.state.user = user;
    return user;
  } catch {
    return null;
  }
}

function numericOrder(data: any): number | null {
  if (data.order === undefined || data.order === null) return null;
  const order = Number(data.order);
  return Number.isNaN(order) ? null : order;
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

    if (courseId && (data.order === undefined || data.order === null)) {
      const existing = await strapi.db.query(uid).findMany({
        where: { course: courseId },
        select: ['order'],
        limit: 1000,
      });
      const maxOrder = (existing || []).reduce(
        (max, l: any) => Math.max(max, typeof l.order === 'number' ? l.order : 0),
        0
      );
      data.order = maxOrder + 1;
    }

    const order = numericOrder(data);
    if (courseId && order !== null) {
      if (await orderTaken(courseId, order)) {
        return ctx.badRequest(`A lesson with order ${order} already exists in this course`);
      }
    }

    const entry = await strapi.entityService.create(uid, {
      data: {
        ...data,
        course: courseId,
      },
    });

    return { data: entry };
  },

  async update(ctx) {
    const order = numericOrder(ctx.request.body?.data || {});
    if (order !== null) {
      const entry = await strapi.documents(uid).findOne({
        documentId: ctx.params.id,
        populate: { course: { fields: ['id'] } },
      });
      const courseId = seenCourseId(entry as any);
      if (courseId) {
        const selfId = (entry as any)?.id;
        if (await orderTaken(courseId, order, selfId)) {
          return ctx.badRequest(
            `A lesson with order ${order} already exists in this course`
          );
        }
      }
    }

    return super.update(ctx);
  },

  async reorder(ctx) {
    const user = await userFromRequest(ctx);
    if (!user) return ctx.forbidden('You must be logged in to reorder lessons');

    const body = ctx.request.body?.data || ctx.request.body || {};
    const courseDocumentId = body.course;
    const lessonIds = body.lessons;

    if (!courseDocumentId || !Array.isArray(lessonIds) || lessonIds.length === 0) {
      return ctx.badRequest('course and lessons[] are required');
    }

    const roleType = await userRole(ctx);
    if (
      roleType !== 'admin' &&
      roleType !== 'content_manager' &&
      roleType !== 'instructor'
    ) {
      return ctx.forbidden('Only staff can reorder lessons');
    }

    const course = await strapi.db.query('api::course.course').findOne({
      where: { documentId: courseDocumentId },
      populate: ['instructor'],
    });
    if (!course) return ctx.notFound('Course not found');

    if (roleType === 'instructor' && course.instructor?.id !== user.id) {
      return ctx.forbidden('You can only reorder lessons in your own courses');
    }

    const lessons = await strapi.db.query(uid).findMany({
      where: { course: course.id },
      limit: 1000,
    });
    const idByDocumentId = new Map((lessons || []).map((l: any) => [l.documentId, l.id]));
    const seen = new Set<string>();
    for (const id of lessonIds) {
      if (typeof id !== 'string' || !idByDocumentId.has(id) || seen.has(id)) {
        return ctx.badRequest('lessons[] must list each lesson of the course exactly once');
      }
      seen.add(id);
    }
    if (seen.size !== (lessons || []).length) {
      return ctx.badRequest('lessons[] must list every lesson of the course');
    }

    let position = 1;
    for (const id of lessonIds) {
      await strapi.db.query(uid).update({
        where: { id: idByDocumentId.get(id) },
        data: { order: position },
      });
      position += 1;
    }

    return { data: lessonIds };
  },
}));