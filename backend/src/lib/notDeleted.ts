import { isNull } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

export function notDeleted<T extends { deletedAt: PgColumn }>(table: T) {
  return isNull(table.deletedAt);
}
