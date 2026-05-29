import type { OutputCategory } from '../types/import';

const categoriesKey = 'excel-sanitizer:output-categories';

const defaultCategories: OutputCategory[] = [
  { id: 'code', name: 'Codigo', order: 0, exportable: true },
  { id: 'name', name: 'Nombre', order: 1, exportable: true },
  { id: 'price', name: 'Precio', order: 2, exportable: true },
  { id: 'comments', name: 'Comentarios', order: 3, exportable: true },
];

export function loadLegacyCategories(): OutputCategory[] {
  try {
    const raw = localStorage.getItem(categoriesKey);
    const parsed = raw ? (JSON.parse(raw) as OutputCategory[]) : null;
    return parsed?.length ? sortCategories(normalizeCategories(parsed)) : defaultCategories;
  } catch {
    return defaultCategories;
  }
}

function sortCategories(categories: OutputCategory[]) {
  return [...categories].sort((a, b) => a.order - b.order);
}

function normalizeCategories(categories: Partial<OutputCategory>[]): OutputCategory[] {
  return categories.map((category, index) => ({
    id: category.id ?? crypto.randomUUID(),
    name: category.name ?? 'Nueva columna',
    order: category.order ?? index,
    exportable: category.exportable ?? true,
  }));
}
