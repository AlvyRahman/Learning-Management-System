/**
 * scopedFind helper
 *
 * Runs a find for content types whose relation attributes (student, course,
 * instructor) are rejected by the REST content-api validator when used as
 * filter keys. Bypasses the REST layer for these lookups while preserving
 * user-supplied filters, sort, and pagination.
 *
 * Scopes must be shallow (single relation hop) — deep nested relation
 * filters (e.g. lesson.course.instructor) can produce invalid SQL in the
 * Query Engine, so controllers resolve those with explicit id lists first.
 */

const paginationMeta = (total: number, page: number, pageSize: number) => ({
  pagination: {
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize) || 1,
    total,
  },
});

const toOrderBy = (sort: unknown) => {
  if (!sort) return undefined;
  const entries = Array.isArray(sort)
    ? sort
    : typeof sort === 'string'
      ? sort.split(',')
      : [];
  return entries.map((entry) => {
    if (typeof entry !== 'string') return entry as Record<string, string>;
    const idx = entry.indexOf(':');
    if (idx === -1) return { [entry]: 'asc' };
    return { [entry.slice(0, idx)]: entry.slice(idx + 1) || 'asc' };
  });
};

export default async (
  strapi: any,
  uid: string,
  ctx: any,
  scopes: Record<string, unknown>[],
  options: { populate?: any } = {}
): Promise<{ data: any[]; meta: Record<string, any> }> => {
  const parsedFilters = ctx.query?.filters || {};
  const constraints = scopes.length ? [scopes[0], parsedFilters] : [parsedFilters];

  const where =
    scopes.length && Object.keys(parsedFilters || {}).length
      ? { $and: constraints }
      : scopes.length
        ? scopes[0]
        : parsedFilters;

  const pagination = ctx.query?.pagination || {};
  const hasPagePagination = pagination.page != null || pagination.pageSize != null;
  const page = Number(pagination.page || 1);
  const pageSize =
    Number(pagination.pageSize || (ctx.query?.pagination?.limit ?? 25)) || 25;
  const offset = Number(ctx.query?.pagination?.start ?? 0);
  const limit =
    Number(ctx.query?.pagination?.limit ?? pageSize) || 25;

  const total = await strapi.db.query(uid).count({ where });

  const rows = await strapi.db.query(uid).findMany({
    where,
    orderBy: toOrderBy(ctx.query?.sort),
    offset: hasPagePagination ? (page - 1) * limit + offset : offset,
    limit,
    ...(options.populate ? { populate: options.populate } : {}),
  });

  return {
    data: rows,
    meta: hasPagePagination
      ? paginationMeta(total, page, limit)
      : { pagination: { start: offset, limit, total } },
  };
};