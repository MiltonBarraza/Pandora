import type { InputColumn, OutputColumn } from '../../types/import';

type CreateOutputColumnsOptions = {
  idFactory?: () => string;
};

export type CreateOutputColumnsFromActiveResult = {
  columns: OutputColumn[];
  activeCount: number;
  createdCount: number;
  skippedExistingCount: number;
  removedObsoleteCount: number;
};

export function createOutputColumnsFromActiveInputColumns(
  inputColumns: InputColumn[],
  outputColumns: OutputColumn[],
  options: CreateOutputColumnsOptions = {},
): CreateOutputColumnsFromActiveResult {
  const activeInputColumns = inputColumns.filter((column) => column.active);
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const manualColumns = outputColumns.filter((column) => !getGeneratedInputColumnId(column, outputColumns));
  const existingGeneratedColumns = outputColumns.filter((column) => getGeneratedInputColumnId(column, outputColumns));
  const activeInputIds = new Set(activeInputColumns.map((column) => column.id));
  const removedObsoleteCount = outputColumns.filter((column) => {
    const generatedInputColumnId = getGeneratedInputColumnId(column, outputColumns);
    return generatedInputColumnId && !activeInputIds.has(generatedInputColumnId);
  }).length;
  const reusableColumnsByInputId = new Map(
    activeInputColumns
      .map((inputColumn) => [
        inputColumn.id,
        existingGeneratedColumns.find((column) =>
          getGeneratedInputColumnId(column, outputColumns) === inputColumn.id
          && isGeneratedColumnUnmodified(column, inputColumn),
        ),
      ] as const)
      .filter((entry): entry is [string, OutputColumn] => Boolean(entry[1])),
  );
  let createdCount = 0;
  const generatedColumns = activeInputColumns.map((inputColumn, index) => {
    const reusableColumn = reusableColumnsByInputId.get(inputColumn.id);
    if (reusableColumn) {
      return { ...reusableColumn, order: manualColumns.length + index };
    }

    createdCount += 1;
    return createGeneratedOutputColumn(inputColumn, manualColumns.length + index, idFactory());
  });
  const columns = reorder([...manualColumns, ...generatedColumns]);

  return {
    columns,
    activeCount: activeInputColumns.length,
    createdCount,
    skippedExistingCount: reusableColumnsByInputId.size,
    removedObsoleteCount,
  };
}

export function resolveGeneratedColumnsRegeneration(
  inputColumns: InputColumn[],
  outputColumns: OutputColumn[],
  confirmed: boolean,
  options: CreateOutputColumnsOptions = {},
): CreateOutputColumnsFromActiveResult {
  if (!confirmed) {
    return {
      columns: outputColumns,
      activeCount: inputColumns.filter((column) => column.active).length,
      createdCount: 0,
      skippedExistingCount: 0,
      removedObsoleteCount: 0,
    };
  }

  return createOutputColumnsFromActiveInputColumns(inputColumns, outputColumns, options);
}

export function hasGeneratedOutputColumnManualChanges(inputColumns: InputColumn[], outputColumns: OutputColumn[]) {
  const generatedColumns = outputColumns.filter((column) => getGeneratedInputColumnId(column, outputColumns));

  if (generatedColumns.length === 0) {
    return false;
  }

  return generatedColumns.some((column) => {
    const generatedInputColumnId = getGeneratedInputColumnId(column, outputColumns);
    if (!generatedInputColumnId) {
      return false;
    }

    const inputColumn = inputColumns.find((item) => item.id === generatedInputColumnId);
    if (!inputColumn) {
      return false;
    }

    return !isGeneratedColumnUnmodified(column, inputColumn);
  });
}

export function getGeneratedInputColumnId(column: OutputColumn, allColumns: OutputColumn[] = [column]) {
  if (column.generatedFromInputColumnId) {
    return column.generatedFromInputColumnId;
  }

  const hasExplicitGeneratedColumns = allColumns.some((item) => item.generatedFromInputColumnId);
  return !hasExplicitGeneratedColumns && column.recipe.type === 'direct' ? column.recipe.inputColumnId : undefined;
}

function createGeneratedOutputColumn(inputColumn: InputColumn, order: number, id: string): OutputColumn {
  return {
    id,
    label: getOutputColumnLabel(inputColumn),
    order,
    enabled: true,
    generatedFromInputColumnId: inputColumn.id,
    recipe: { type: 'direct' as const, inputColumnId: inputColumn.id },
  };
}

function isGeneratedColumnUnmodified(column: OutputColumn, inputColumn: InputColumn) {
  return (
    column.label === getOutputColumnLabel(inputColumn) &&
    column.enabled === true &&
    column.recipe.type === 'direct' &&
    column.recipe.inputColumnId === inputColumn.id
  );
}

function getOutputColumnLabel(inputColumn: InputColumn) {
  const alias = inputColumn.alias?.trim();
  const header = inputColumn.header?.trim();

  if (alias) {
    return alias;
  }

  if (header) {
    return header;
  }

  return `Nueva columna ${inputColumn.columnLetter}`;
}

function reorder(columns: OutputColumn[]) {
  return columns.map((column, order) => ({ ...column, order }));
}
