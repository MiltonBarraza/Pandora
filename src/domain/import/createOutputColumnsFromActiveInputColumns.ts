import type { InputColumn, OutputColumn } from '../../types/import';

type CreateOutputColumnsOptions = {
  idFactory?: () => string;
};

export type CreateOutputColumnsFromActiveResult = {
  columns: OutputColumn[];
  activeCount: number;
  createdCount: number;
  skippedExistingCount: number;
};

export function createOutputColumnsFromActiveInputColumns(
  inputColumns: InputColumn[],
  outputColumns: OutputColumn[],
  options: CreateOutputColumnsOptions = {},
): CreateOutputColumnsFromActiveResult {
  const activeInputColumns = inputColumns.filter((column) => column.active);
  const directInputColumnIds = new Set(
    outputColumns.flatMap((column) => (
      column.recipe.type === 'direct' ? [column.recipe.inputColumnId] : []
    )),
  );
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const firstOrder = outputColumns.reduce((maxOrder, column) => Math.max(maxOrder, column.order), -1) + 1;
  let fallbackNameIndex = 1;
  let skippedExistingCount = 0;
  const createdColumns: OutputColumn[] = [];

  for (const inputColumn of activeInputColumns) {
    if (directInputColumnIds.has(inputColumn.id)) {
      skippedExistingCount += 1;
      continue;
    }

    directInputColumnIds.add(inputColumn.id);
    const label = getOutputColumnLabel(inputColumn, fallbackNameIndex);

    if (label.startsWith('Nueva columna ')) {
      fallbackNameIndex += 1;
    }

    createdColumns.push({
      id: idFactory(),
      label,
      order: firstOrder + createdColumns.length,
      enabled: true,
      recipe: { type: 'direct' as const, inputColumnId: inputColumn.id },
    });
  }

  return {
    columns: [...outputColumns, ...createdColumns],
    activeCount: activeInputColumns.length,
    createdCount: createdColumns.length,
    skippedExistingCount,
  };
}

function getOutputColumnLabel(inputColumn: InputColumn, fallbackNameIndex: number) {
  const alias = inputColumn.alias?.trim();
  const header = inputColumn.header?.trim();

  if (alias) {
    return alias;
  }

  if (header) {
    return header;
  }

  return `Nueva columna ${fallbackNameIndex}`;
}
