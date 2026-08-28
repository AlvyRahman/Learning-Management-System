/**
 * quiz-submission controller
 *
 * Single purpose: receive a student's quiz answers, grade them against the
 * stored answer key (correctIndex), persist a quiz_attempt, and return the
 * score. correctIndex never leaves the server — the answer key is only read
 * here, never serialized to the REST response.
 */

export default {
  async submit(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.badRequest('Authentication required');
    }

    const requestingUser = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: user.id }, populate: ['role'] });
    if (requestingUser?.role?.type !== 'student') {
      return ctx.forbidden('Only students can take quizzes');
    }

    const { quiz: quizDocumentId, answers } = ctx.request.body || {};

    if (!quizDocumentId || !Array.isArray(answers)) {
      return ctx.badRequest('quiz and answers[] are required');
    }

    const quiz = await strapi.db.query('api::quiz.quiz').findOne({
      where: { documentId: quizDocumentId },
      populate: { questions: true, course: true },
    });

    if (!quiz) {
      return ctx.notFound('Quiz not found');
    }

    const myEnrollments = await strapi.db
      .query('api::enrollment.enrollment')
      .findMany({ where: { student: user.id }, populate: { course: true }, limit: 500 });
    const enrolled =
      (myEnrollments || []).some((e: any) => e.course?.id === quiz.course?.id);

    if (!enrolled) {
      return ctx.forbidden('You must be enrolled in this course to take the quiz');
    }

    const questions = quiz.questions || [];
    if (questions.length === 0) {
      return ctx.badRequest('Quiz has no questions');
    }
    if (answers.length !== questions.length) {
      return ctx.badRequest('answers.length must match question count');
    }

    const questionsByIndex = questions.map((q: any) => ({
      documentId: q.documentId,
      correctIndex: q.correctIndex,
    }));

    let correct = 0;
    const graded = answers.map((answer: unknown, index: number) => {
      const question = questionsByIndex[index];
      const isCorrect =
        question &&
        typeof answer === 'number' &&
        answer === question.correctIndex;
      if (isCorrect) correct++;
      return {
        question: question ? question.documentId : null,
        chosen: typeof answer === 'number' ? answer : null,
        correct: !!isCorrect,
      };
    });

    const score =
      questions.length === 0 ? 0 : Math.round((correct / questions.length) * 100);

    try {
      const attempt = await strapi.entityService.create('api::quiz-attempt.quiz-attempt', {
        data: {
          student: user.id,
          quiz: quiz.id,
          score,
          answers: graded,
          submittedAt: new Date().toISOString(),
        },
      });

      return ctx.send({
        data: {
          id: attempt.id,
          documentId: attempt.documentId,
          score,
          correct,
          total: questions.length,
          answers: graded,
        },
      });
    } catch (err) {
      strapi.log.error(err);
      return ctx.internalServerError('Failed to save quiz attempt');
    }
  },

  async quizQuestions(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { quizId } = ctx.params;

    const quiz = await strapi.db.query('api::quiz.quiz').findOne({
      where: { documentId: quizId },
      populate: { course: true },
    });
    if (!quiz) {
      return ctx.notFound('Quiz not found');
    }

    const requestingUser = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: user.id }, populate: ['role'] });
    const roleType = requestingUser?.role?.type || 'authenticated';

    if (roleType === 'student') {
      const myEnrollments = await strapi.db
        .query('api::enrollment.enrollment')
        .findMany({ where: { student: user.id }, populate: { course: true }, limit: 500 });
      const courseId = quiz.course?.id;
      const enrolled = (myEnrollments || []).some((e: any) => e.course?.id === courseId);
      if (!enrolled) {
        return ctx.forbidden('You must be enrolled in this course to take the quiz');
      }
    } else if (roleType === 'instructor') {
      const courseId = quiz.course?.id;
      const courses = await strapi.db
        .query('api::course.course')
        .findMany({ where: { instructor: { id: user.id } } });
      const ownsCourse = (courses || []).some((c: any) => c.id === courseId);
      if (!ownsCourse) {
        return ctx.forbidden('You can only access quizzes of your own courses');
      }
    }

    const questions = await strapi.db.query('api::question.question').findMany({
      where: { quiz: quiz.id },
      orderBy: [{ id: 'asc' }],
    });

    const safe = (questions || []).map((q: any) => ({
      id: q.id,
      documentId: q.documentId,
      text: q.text,
      options: q.options,
    }));

    return ctx.send({
      data: {
        quiz: { id: quiz.id, documentId: quiz.documentId, title: quiz.title },
        questions: safe,
      },
    });
  },
};