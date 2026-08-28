/**
 * course controller
 *
 * create auto-assigns the requesting instructor as course owner;
 * find/findOne enrich the instructor relation (REST cannot populate plugin
 * users) and hide the enrollee list from students and non-owner instructors.
 */

import { factories } from '@strapi/strapi';
import enrichUserRelation from '../../../utils/enrich-user-relation';

function stripEnrollments(payload: any, ownerId: number | null | undefined) {
  const entries = Array.isArray(payload) ? payload : payload ? [payload] : [];
  for (const entry of entries) {
    if (entry.instructor?.id !== ownerId) {
      delete entry.enrollments;
    }
  }
}

function stripLockedContent(payload: any, accessibleIds: Set<number>, allowAll: boolean) {
  const entries = Array.isArray(payload) ? payload : payload ? [payload] : [];
  for (const entry of entries) {
    if (!allowAll && !accessibleIds.has(entry.id)) {
      delete entry.lessons;
      delete entry.quizzes;
    }
  }
}

const NEVER_OWNER = -1;

export default factories.createCoreController('api::course.course', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    const userRecord = user
      ? await strapi.db
          .query('plugin::users-permissions.user')
          .findOne({ where: { id: user.id }, populate: ['role'] })
      : null;
    const roleType = userRecord?.role?.type;

    const result = await super.find(ctx);
    await enrichUserRelation(strapi, 'api::course.course', 'instructor', result.data);

    if (!user || roleType === 'student' || roleType === 'instructor') {
      stripEnrollments(result.data, roleType === 'instructor' ? user.id : NEVER_OWNER);
    }

    let accessible = new Set<number>(); let allowAll = false;
    if (roleType === 'instructor') {
      const courses = await strapi.db
        .query('api::course.course')
        .findMany({ where: { instructor: { id: user.id } } });
      accessible = new Set((courses || []).map((c: any) => c.id));
    } else if (roleType === 'student') {
      const enrollments = await strapi.db
        .query('api::enrollment.enrollment')
        .findMany({ where: { student: user.id }, populate: { course: true }, limit: 500 });
      accessible = new Set((enrollments || []).map((e: any) => e.course?.id).filter(Boolean));
    } else if (user) {
      allowAll = true;
    }
    stripLockedContent(result.data, accessible, allowAll);

    return result;
  },

  async findOne(ctx) {
    const user = ctx.state.user;
    const userRecord = user
      ? await strapi.db
          .query('plugin::users-permissions.user')
          .findOne({ where: { id: user.id }, populate: ['role'] })
      : null;
    const roleType = userRecord?.role?.type;

    const result = await super.findOne(ctx);
    await enrichUserRelation(strapi, 'api::course.course', 'instructor', result?.data);

    if (!user || roleType === 'student' || roleType === 'instructor') {
      stripEnrollments(result?.data, roleType === 'instructor' ? user.id : NEVER_OWNER);
    }

    let accessible = new Set<number>(); let allowAll = false;
    if (roleType === 'instructor') {
      const courses = await strapi.db
        .query('api::course.course')
        .findMany({ where: { instructor: { id: user.id } } });
      accessible = new Set((courses || []).map((c: any) => c.id));
    } else if (roleType === 'student') {
      const enrollments = await strapi.db
        .query('api::enrollment.enrollment')
        .findMany({ where: { student: user.id }, populate: { course: true }, limit: 500 });
      accessible = new Set((enrollments || []).map((e: any) => e.course?.id).filter(Boolean));
    } else if (user) {
      allowAll = true;
    }
    stripLockedContent(result?.data, accessible, allowAll);

    return result;
  },

  async create(ctx) {
    const user = ctx.state.user;

    const data = { ...(ctx.request.body?.data || {}) };

    if (user) {
      const requestingUser = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { id: user.id }, populate: ['role'] });
      const roleType = requestingUser?.role?.type;

      if (roleType === 'instructor' && !data.instructor) {
        data.instructor = user.id;
      }
    }

    const course = await strapi.entityService.create('api::course.course', {
      data,
    });

    return { data: course };
  },
}));