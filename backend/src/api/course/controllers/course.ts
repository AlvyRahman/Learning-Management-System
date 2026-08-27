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