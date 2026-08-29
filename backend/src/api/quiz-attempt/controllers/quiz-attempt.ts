/**
 * quiz-attempt controller
 */

import { factories } from '@strapi/strapi';
import scopedFind from '../../../utils/scoped-find';
import sanitizeUserFields from '../../../utils/sanitize-user-fields';

export default factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  async create(ctx) {
    return ctx.forbidden(
      'Quiz attempts are created only by submitting answers via POST /quiz-attempts/submit'
    );
  },

  async find(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const userRecord = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: user.id }, populate: ['role'] });
    const roleType = userRecord?.role?.type;

    const scopes: Record<string, unknown>[] = [];
    if (roleType === 'student') {
      scopes.push({ student: { id: user.id } });
    } else if (roleType === 'instructor') {
      const courses = await strapi.db.query('api::course.course').findMany({
        where: { instructor: { id: user.id } },
      });
      const courseIds = courses.map((c: any) => c.id);
      const quizzes = courseIds.length
        ? await strapi.db.query('api::quiz.quiz').findMany({
            where: { course: { id: { $in: courseIds } } },
          })
        : [];
      const quizIds = quizzes.map((q: any) => q.id);
      scopes.push({ quiz: { id: { $in: quizIds } } });
    }

    const result = await scopedFind(strapi, 'api::quiz-attempt.quiz-attempt', ctx, scopes, {
      populate: { student: true, quiz: true },
    });
    sanitizeUserFields(result.data, 'student');
    return { data: result.data, meta: result.meta };
  },

  async findOne(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const userRecord = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: user.id }, populate: ['role'] });
    const roleType = userRecord?.role?.type;
    const { id } = ctx.params;

    const attempt = await strapi.db.query('api::quiz-attempt.quiz-attempt').findOne({
      where: { documentId: id },
      populate: ['student', 'quiz'],
    });

    if (!attempt) return ctx.notFound('Quiz attempt not found');

    if (roleType === 'student') {
      if (attempt.student?.id !== user.id) {
        return ctx.forbidden('You can only view your own quiz attempts');
      }
    } else if (roleType === 'instructor') {
      const quizId = typeof attempt.quiz === 'object' ? attempt.quiz?.id : attempt.quiz;
      const quiz = await strapi.db.query('api::quiz.quiz').findOne({
        where: { id: quizId },
        populate: { course: { populate: ['instructor'] } },
      });
      if (quiz?.course?.instructor?.id !== user.id) {
        return ctx.forbidden('You can only view attempts for your own quizzes');
      }
    }

    return super.findOne(ctx);
  },
}));