/** A saved CMS block `sort_order` (entity ids). Empty means “no manual order”. */
export function cmsSortOrder(block: { sort_order?: unknown }): string[] | undefined {
  const raw = block.sort_order;
  if (!Array.isArray(raw)) return undefined;
  const ids = raw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  return ids.length > 0 ? ids : undefined;
}

export function compareDisplayNames(a: string, b: string): number {
  return a.localeCompare(b, 'en', { sensitivity: 'base' });
}

/**
 * Manual CMS order when the block has a saved `sort_order`.
 * Anything not in that list, and the whole list when no order is saved, is A–Z by name.
 */
export function orderByCmsOrName<T extends { id: string; name: string }>(
  items: T[],
  sortOrder?: string[] | null,
): T[] {
  const byName = (a: T, b: T) => compareDisplayNames(a.name, b.name);
  if (!sortOrder?.length) return [...items].sort(byName);
  const index = new Map(sortOrder.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const ai = index.has(a.id) ? index.get(a.id)! : Number.POSITIVE_INFINITY;
    const bi = index.has(b.id) ? index.get(b.id)! : Number.POSITIVE_INFINITY;
    if (ai !== bi) return ai - bi;
    return byName(a, b);
  });
}
