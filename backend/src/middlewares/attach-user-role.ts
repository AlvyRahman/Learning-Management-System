export default (config: any, { strapi }: { strapi: any }) => {
  const attach = async (obj: any) => {
    const holder = obj && obj.user ? obj.user : obj;
    if (!holder || typeof holder !== 'object') return;
    if (!holder.id || holder.role) return;

    let role: any = null;
    try {
      role = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { id: holder.id }, populate: ['role'] });
    } catch (e) {
      strapi.log.warn('[attach-user-role] failed to load role: ' + e);
      return;
    }

    if (role && role.role) {
      holder.role = {
        id: role.role.id,
        name: role.role.name,
        description: role.role.description,
        type: role.role.type,
      };
    }
  };

  return async (ctx: any, next: any) => {
    await next();
    if (ctx.method !== 'GET' && ctx.method !== 'POST') return;
    if (!ctx.body || typeof ctx.body !== 'object') return;

    const url = ctx.request.url || '';
    if (url === '/api/auth/local' || url === '/api/auth/local/register' || url === '/api/auth/local/forgot-password' || url === '/api/auth/local/reset-password') {
      await attach(ctx.body);
    } else if (ctx.method === 'GET' && (url === '/api/users/me' || url.includes('/api/users/me?'))) {
      await attach(ctx.body);
    }
  };
};