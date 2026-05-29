import type { NormalizationSettings, NormalizedRow, RawRow } from '../../types/import';
import { applyTransformations } from './applyTransformations';
import { toText } from './normalizeText';

export function buildOutputRows(rows: RawRow[], settings: NormalizationSettings): NormalizedRow[] {
  return rows
    .slice(settings.startRowIndex)
    .map((row, offset) => buildRow(row, settings, settings.startRowIndex + offset + 1))
    .filter((row): row is NormalizedRow => Boolean(row))
    .map((row) => applyTransformations(row, settings.transformationRules));
}

function buildRow(row: RawRow, settings: NormalizationSettings, rowNumber: number): NormalizedRow | null {
  if (row.every((cell) => toText(cell) === '')) {
    return null;
  }

  const values = settings.categories.reduce<Record<string, string>>((acc, category) => {
    acc[category.id] = '';
    return acc;
  }, {});

  const activeColumns = new Set(settings.activeColumnIndexes ?? []);

  Object.entries(settings.columnMapping).forEach(([columnIndex, categoryId]) => {
    const numericColumnIndex = Number(columnIndex);
    if (!categoryId || categoryId === 'ignore') {
      return;
    }

    if (settings.activeColumnIndexes && !activeColumns.has(numericColumnIndex)) {
      return;
    }

    values[categoryId] = toText(row[numericColumnIndex]);
  });

  if (Object.values(values).every((value) => value.trim() === '')) {
    return null;
  }

  return { rowNumber, values, status: 'included' };
}

export function rowsToAoA(rows: NormalizedRow[], categories: NormalizationSettings['categories']) {
  const ordered = getExportableCategories(categories);
  return [
    ordered.map((category) => category.name),
    ...rows.map((row) => ordered.map((category) => row.values[category.id] ?? '')),
  ];
}

export function getExportableCategories(categories: NormalizationSettings['categories']) {
  return [...categories].filter((category) => category.exportable).sort((a, b) => a.order - b.order);
}
