export interface DecodedCursor {
  createdAt: string;
  id: number;
}

export interface CursorPaginationQuery {
  cursor?: string;
  limit?: number;
}

export interface CursorPaginationMeta {
  limit: number;
  nextCursor: string | null;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

export function normalizeLimit(limit?: number): number {
  if (!limit || Number.isNaN(Number(limit))) return DEFAULT_LIMIT;
  const parsed = Number(limit);
  if (parsed < 1) return DEFAULT_LIMIT;
  if (parsed > MAX_LIMIT) return MAX_LIMIT;
  return parsed;
}

export function encodeCursor(cursor: DecodedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

export function decodeCursor(cursor?: string): DecodedCursor | null {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as DecodedCursor;

    if (!parsed.createdAt || !parsed.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getNextCursor<T extends { id: number; createdAt: Date }>(
  items: T[],
  limit: number,
): string | null {
  if (items.length < limit) return null;

  const lastItem = items[items.length - 1];
  return encodeCursor({
    createdAt: lastItem.createdAt.toISOString(),
    id: lastItem.id,
  });
}
