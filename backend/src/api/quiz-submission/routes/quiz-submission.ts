export default {
  routes: [
    {
      method: 'POST',
      path: '/quiz-attempts/submit',
      handler: 'quiz-submission.submit',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/quiz-submission/quiz-questions/:quizId',
      handler: 'quiz-submission.quizQuestions',
      config: {
        policies: [],
      },
    },
  ],
};