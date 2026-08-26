export default {
  routes: [
    {
      method: 'PUT',
      path: '/users/:id/role',
      handler: 'user-admin.assignRole',
      config: {
        policies: [],
      },
    },
  ],
};
