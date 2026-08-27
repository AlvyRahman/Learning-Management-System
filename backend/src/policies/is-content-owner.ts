/**
 * is-content-owner policy
 *
 * Enforces the "Instructor = own only" permission matrix rows for course,
 * lesson, quiz, and question create/update/delete.
 *
 * - Admin / Content Manager: always allowed.
 * - Instructor: allowed only when the target content belongs to one of their
 *   courses (course.instructor.id === user.id).
 * - Everyone else: denied.
 *
 * Note: custom policies in Strapi v5 receive a request context that exposes
 * the matched route pattern (_matchedRoute) and the HTTP method rather than
 * a route.info object, so the content type + action are derived from those.
 */

const pluralToUid: Record<string, string> = {
  courses: 'course',
  lessons: 'lesson',
  quizzes: 'quiz',
  questions: 'question',
};

const resolveAction = (method: string | undefined, hasId: boolean) => {
  switch (method) {
    case 'post':
      return 'create';
    case 'put':
    case 'patch':
      return hasId ? 'update' : 'create';
    case 'delete':
      return 'delete';
    default:
      return 'find';
  }
};

export default async (policyContext: any, _config: any, { strapi }: any) => {
  const user = policyContext.state?.user;
  if (!user) return false;

  const requestingUser = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({
      where: { id: user.id },
      populate: ['role'],
    });

  const roleType = requestingUser?.role?.type;

  if (roleType === 'admin' || roleType === 'content_manager') {
    return true;
  }
  if (roleType !== 'instructor') {
    return false;
  }

  const matched = policyContext._matchedRoute || '';
  const segments = matched.split('/'); // ['', 'api', 'courses', ':id']
  const plural = segments[2];
  const hasId = segments.includes(':id');
  const target = pluralToUid[plural];

  if (!target) {
    return false;
  }

  const httpMethod = policyContext.request?.method?.toLowerCase();
  const action = resolveAction(httpMethod, hasId);

  if (action === 'create' && target === 'course') {
    return true;
  }

  const bodyCourseOrQuiz =
    action === 'create'
      ? policyContext.request?.body?.data?.[target === 'question' ? 'quiz' : 'course']
      : null;

  const isOwned = async () => {
    if (target === 'course') {
      const course = await strapi.db.query('api::course.course').findOne({
        where: { documentId: policyContext.params?.id },
        populate: ['instructor'],
      });
      return course?.instructor?.id === user.id;
    }

    if (target === 'lesson') {
      if (action === 'create') {
        const course = await strapi.db.query('api::course.course').findOne({
          where: { documentId: bodyCourseOrQuiz },
          populate: ['instructor'],
        });
        return course?.instructor?.id === user.id;
      }
      const lesson = await strapi.db.query('api::lesson.lesson').findOne({
        where: { documentId: policyContext.params?.id },
        populate: { course: { populate: ['instructor'] } },
      });
      return lesson?.course?.instructor?.id === user.id;
    }

    if (target === 'quiz') {
      if (action === 'create') {
        const course = await strapi.db.query('api::course.course').findOne({
          where: { documentId: bodyCourseOrQuiz },
          populate: ['instructor'],
        });
        return course?.instructor?.id === user.id;
      }
      const quiz = await strapi.db.query('api::quiz.quiz').findOne({
        where: { documentId: policyContext.params?.id },
        populate: { course: { populate: ['instructor'] } },
      });
      return quiz?.course?.instructor?.id === user.id;
    }

    if (target === 'question') {
      if (action === 'create') {
        const quiz = await strapi.db.query('api::quiz.quiz').findOne({
          where: { documentId: bodyCourseOrQuiz },
          populate: { course: { populate: ['instructor'] } },
        });
        return quiz?.course?.instructor?.id === user.id;
      }
      const question = await strapi.db.query('api::question.question').findOne({
        where: { documentId: policyContext.params?.id },
        populate: { quiz: { populate: { course: { populate: ['instructor'] } } } },
      });
      return question?.quiz?.course?.instructor?.id === user.id;
    }

    return false;
  };

  return isOwned();
};