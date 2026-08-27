/**
 * question controller
 */

import { factories } from '@strapi/strapi';

const uid = 'api::question.question';

export default factories.createCoreController(uid, ({ strapi }) => ({
  async create(ctx) {
    const data = { ...(ctx.request.body?.data || {}) };

    let quizId: number | undefined;
    if (data.quiz) {
      const quiz = await strapi.db.query('api::quiz.quiz').findOne({
        where: { documentId: data.quiz },
      });
      if (!quiz) return ctx.badRequest('Quiz not found');
      quizId = quiz.id;
    }

    const entry = await strapi.entityService.create(uid, {
      data: {
        ...data,
        quiz: quizId,
      },
    });

    return { data: entry };
  },
}));