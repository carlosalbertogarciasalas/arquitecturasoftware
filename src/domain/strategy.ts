import type { Movement } from './model';
export interface HistoryStrategy { page(items: Movement[], cursor?: string, size?: number): {items: Movement[]; next?: string}; }
const ordered = (items: Movement[]) => [...items].sort((a,b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
export class FullHistory implements HistoryStrategy { page(items: Movement[]): ReturnType<HistoryStrategy['page']> { return { items: ordered(items) }; } }
export class CursorHistory implements HistoryStrategy {
  page(items: Movement[], cursor?: string, size = 5) {
    const all = ordered(items); const index = cursor ? all.findIndex(m => m.id === cursor) : -1;
    if (cursor && index < 0) throw new Error('Cursor inválido. Actualiza el historial.');
    const page = all.slice(index+1, index+1+Math.max(1,Math.min(size,50)));
    return {items:page, next: index+1+page.length < all.length ? page.at(-1)?.id : undefined};
  }
}
