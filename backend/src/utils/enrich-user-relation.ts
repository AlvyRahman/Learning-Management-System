/**
 * enrichUserRelation
 *
 * The content-api sanitizer refuses to populate relations that target
 * plugin::users-permissions.user (instructor / author return null via REST).
 * This helper re-resolves those relations at the DB layer and attaches a
 * minimal { id, username } object to each entry in the response payload.
 */

export default async (strapi: any, uid: string, field: string, payload: any) => {
  const list = Array.isArray(payload) ? payload : payload ? [payload] : [];
  if (!list.length) return payload;

  const ids = list.map((e: any) => e.id).filter(Boolean);
  if (!ids.length) return payload;

  const rows = await strapi.db.query(uid).findMany({
    where: { id: { $in: ids } },
    populate: { [field]: true },
  });

  const relationById = Object.fromEntries(
    rows.map((r: any) => {
      const rel = r[field];
      return [
        r.id,
        Array.isArray(rel) ? rel : rel ? [rel] : [],
      ];
    })
  );

  const users = rows.flatMap((r: any) => {
    const rel = r[field];
    if (!rel) return [];
    return Array.isArray(rel) ? rel : [rel];
  });

  const userMap = Object.fromEntries(
    users
      .filter((u: any) => u && u.id)
      .map((u: any) => [u.id, { id: u.id, username: u.username || null }])
  );

  for (const entry of list) {
    const rels = relationById[entry.id] || [];
    entry[field] =
      rels.length === 1 ? userMap[rels[0].id] || null : rels.map((u: any) => userMap[u.id]).filter(Boolean);
  }

  return payload;
};