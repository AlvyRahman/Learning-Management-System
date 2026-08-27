/**
 * sanitizeUserFields
 *
 * Reduces a populated plugin user relation to { id, username } only so raw
 * db-backed responses never expose sensitive user columns (email, password
 * hash, tokens).
 */

export default function sanitizeUserFields(payload: any, field: string) {
  const list = Array.isArray(payload) ? payload : payload ? [payload] : [];
  for (const entry of list) {
    const rel = entry?.[field];
    if (!rel) continue;
    const items = Array.isArray(rel) ? rel : [rel];
    const safe = items
      .filter((u: any) => u && u.id)
      .map((u: any) => ({ id: u.id, username: u.username || null }));
    entry[field] = Array.isArray(rel) ? safe : safe[0] || null;
  }
  return payload;
}