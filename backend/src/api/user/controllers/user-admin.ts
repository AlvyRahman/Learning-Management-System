export default {
  async assignRole(ctx) {
    const requestingUser = ctx.state.user;

    if (!requestingUser) {
      return ctx.unauthorized('You must be logged in');
    }

    const targetRequestingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: requestingUser.id },
      populate: ['role'],
    });

    if (!targetRequestingUser?.role || targetRequestingUser.role.type !== 'admin') {
      return ctx.forbidden('Only admins can assign roles');
    }

    const { id } = ctx.params;
    const { role: newRoleSlug } = ctx.request.body;

    if (requestingUser.id === Number(id)) {
      return ctx.forbidden('Admins cannot change their own role');
    }

    const VALID_ROLES = ['admin', 'content_manager', 'instructor', 'student'];

    if (!newRoleSlug || !VALID_ROLES.includes(newRoleSlug)) {
      return ctx.badRequest('Invalid role. Allowed: admin, content_manager, instructor, student');
    }

    const targetUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: Number(id) },
      populate: ['role'],
    });

    if (!targetUser) {
      return ctx.notFound('User not found');
    }

    const newRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: newRoleSlug },
    });

    if (!newRole) {
      return ctx.badRequest('Role not found in database');
    }

    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: Number(id) },
      data: { role: newRole.id },
    });

    return ctx.send({
      ok: true,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        previousRole: targetUser.role.type,
        newRole: newRole.type,
      },
    });
  },
};
