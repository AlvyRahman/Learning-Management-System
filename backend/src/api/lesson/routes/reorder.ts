/**
 * lesson custom routes
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/lessons/reorder',
      handler: 'lesson.reorder',
      config: {
        auth: false,
      },
    },
  ],
};