import type {
  ColumnAnalysis,
  ColumnMapping,
  InputColumn,
  InputRow,
  OutputCategory,
  OutputColumn,
  ProcessedRow,
  RawRow,
  RecipePart,
  TransformStep,
} from '../../types/import';
import { evaluateTransformCondition } from './evaluateCondition';
import { applyNumericOperation, formatNumericResult, parseNumericValue } from './numericOperations';
import { normalizeWhitespace, toText } from './normalizeText';

export function buildInputColumnsFromAnalysis(columnAnalysis: ColumnAnalysis[]): InputColumn[] {
  return columnAnalysis.map((column) => ({
    id: getInputColumnId(column.columnIndex),
    columnIndex: column.columnIndex,
    columnLetter: column.columnLetter,
    label: column.header || column.columnLetter,
    header: column.header,
    active: !column.ignored,
    sampleValues: column.sampleValues,
    nonEmptyCount: column.nonEmptyCount,
    ignoredReason: column.ignoredReason,
  }));
}

export function buildInputRows(rows: RawRow[], inputColumns: InputColumn[], startRowIndex = 0): InputRow[] {
  const activeColumns = inputColumns.filter((column) => column.active);

  return rows.slice(startRowIndex).map((row, offset) => ({
    rowNumber: startRowIndex + offset + 1,
    values: Object.fromEntries(
      activeColumns.map((column) => [column.id, toText(row[column.columnIndex])]),
    ),
  }));
}

export function buildProcessedRows(inputRows: InputRow[], outputColumns: OutputColumn[]): ProcessedRow[] {
  return inputRows.map((row) => {
    const outputValues: Record<string, string> = {};
    const warnings: string[] = [];

    [...outputColumns].sort((a, b) => a.order - b.order).forEach((column) => {
      const result = resolveOutputValue(row, column, outputValues);
      outputValues[column.id] = result.value;
      warnings.push(...result.warnings);
    });

    return {
      rowNumber: row.rowNumber,
      inputValues: row.values,
      outputValues,
      status: 'included',
      warnings: warnings.length ? warnings : undefined,
    };
  });
}

export function buildProcessedRowsPipeline({
  rawRows,
  columnAnalysis,
  startRowIndex,
  outputColumns,
}: {
  rawRows: RawRow[];
  columnAnalysis: ColumnAnalysis[];
  startRowIndex: number;
  outputColumns: OutputColumn[];
}) {
  const inputColumns = buildInputColumnsFromAnalysis(columnAnalysis);
  const inputRows = buildInputRows(rawRows, inputColumns, startRowIndex);
  const processedRows = buildProcessedRows(inputRows, outputColumns).filter(hasAnyOutputValue);

  return {
    inputColumns,
    outputColumns,
    inputRows,
    processedRows,
  };
}

export function migrateLegacyConfigToOutputColumns({
  categories,
  columnMapping,
  inputColumns,
}: {
  categories: OutputCategory[];
  columnMapping: ColumnMapping;
  inputColumns: InputColumn[];
}): OutputColumn[] {
  const inputByColumnIndex = new Map(inputColumns.map((column) => [column.columnIndex, column]));
  const mappedInputByCategoryId = new Map<string, InputColumn>();

  Object.entries(columnMapping).forEach(([columnIndex, categoryId]) => {
    if (!categoryId || categoryId === 'ignore' || mappedInputByCategoryId.has(categoryId)) {
      return;
    }

    const inputColumn = inputByColumnIndex.get(Number(columnIndex));
    if (inputColumn?.active) {
      mappedInputByCategoryId.set(categoryId, inputColumn);
    }
  });

  return [...categories]
    .sort((a, b) => a.order - b.order)
    .map((category) => {
      const mappedInputColumn = mappedInputByCategoryId.get(category.id);

      return {
        id: `output-${category.id}`,
        label: category.name,
        order: category.order,
        enabled: category.exportable,
        legacyCategoryId: category.id,
        recipe: mappedInputColumn
          ? { type: 'direct', inputColumnId: mappedInputColumn.id }
          : { type: 'empty' },
      };
    });
}

export function rowsToAoAFromProcessedRows(processedRows: ProcessedRow[], outputColumns: OutputColumn[]) {
  const enabledColumns = getEnabledOutputColumns(outputColumns);
  return [
    enabledColumns.map((column) => column.label),
    ...processedRows.map((row) => enabledColumns.map((column) => row.outputValues[column.id] ?? '')),
  ];
}

export function getEnabledOutputColumns(outputColumns: OutputColumn[]) {
  return [...outputColumns].filter((column) => column.enabled).sort((a, b) => a.order - b.order);
}

export function getInputColumnId(columnIndex: number) {
  return `input-${columnIndex}`;
}

function hasAnyOutputValue(row: ProcessedRow) {
  return Object.values(row.outputValues).some((value) => value.trim() !== '');
}

function resolveOutputValue(row: InputRow, column: OutputColumn, outputValues: Record<string, string>) {
  let value = '';

  if (column.recipe.type === 'direct') {
    value = row.values[column.recipe.inputColumnId] ?? '';
  } else if (column.recipe.type === 'fixedText') {
    value = column.recipe.value;
  } else if (column.recipe.type === 'combine') {
    value = resolveCombinedValue(row, column.recipe.parts, column.recipe.separator);
  }

  return applyTransformSteps(value, getRecipeSteps(column.recipe), row.values, outputValues, column.id);
}

function getRecipeSteps(recipe: OutputColumn['recipe']) {
  return recipe.type === 'empty' ? [] : recipe.steps ?? [];
}

function resolveCombinedValue(row: InputRow, parts: RecipePart[], separator?: string) {
  const values = parts.map((part) => {
    if (part.type === 'input') {
      return row.values[part.inputColumnId] ?? '';
    }

    return part.value;
  });

  if (typeof separator === 'string' && separator !== '') {
    return values.filter((value) => value.trim() !== '').join(separator);
  }

  return values.join('');
}

function applyTransformSteps(
  value: string,
  steps: TransformStep[],
  inputValues: Record<string, string>,
  outputValues: Record<string, string>,
  currentOutputColumnId: string,
) {
  return steps.reduce(
    (currentResult, step) => {
      const nextOutputValues = {
        ...outputValues,
        [currentOutputColumnId]: currentResult.value,
      };
      const conditionResult = evaluateTransformCondition({
        inputValues,
        outputValues: nextOutputValues,
        condition: step.condition,
      });

      if (!conditionResult.matches) {
        return {
          value: currentResult.value,
          warnings: conditionResult.warning
            ? [...currentResult.warnings, conditionResult.warning]
            : currentResult.warnings,
        };
      }

      const nextResult = applyTransformStep(currentResult.value, step);
      return {
        value: nextResult.value,
        warnings: [...currentResult.warnings, ...nextResult.warnings],
      };
    },
    { value, warnings: [] as string[] },
  );
}

function applyTransformStep(value: string, step: TransformStep) {
  if (shouldSkipEmptyValue(value, step)) {
    return { value, warnings: [] };
  }

  if (step.type === 'trim') {
    return { value: normalizeWhitespace(value), warnings: [] };
  }

  if (step.type === 'uppercase') {
    return { value: value.toUpperCase(), warnings: [] };
  }

  if (step.type === 'lowercase') {
    return { value: value.toLowerCase(), warnings: [] };
  }

  if (step.type === 'addPrefix') {
    return { value: `${step.value ?? ''}${value}`, warnings: [] };
  }

  if (step.type === 'addSuffix') {
    return { value: `${value}${step.value ?? ''}`, warnings: [] };
  }

  if (step.type === 'removeText') {
    const textToRemove = step.value ?? '';
    return { value: textToRemove ? value.split(textToRemove).join('') : value, warnings: [] };
  }

  if (step.type === 'numericOperation') {
    return applyNumericTransformStep(value, step);
  }

  const searchValue = step.searchValue ?? '';
  return { value: searchValue ? value.split(searchValue).join(step.replaceValue ?? '') : value, warnings: [] };
}

function applyNumericTransformStep(value: string, step: TransformStep) {
  const operation = step.operation ?? 'add';
  const amount = Number(step.amount ?? 0);
  const valueToParse = value.trim() === '' && step.applyToEmptyValues ? '0' : value;
  const parsedValue = parseNumericValue(valueToParse);

  if (parsedValue === null || !Number.isFinite(amount)) {
    return {
      value,
      warnings: ['No se pudo aplicar operacion numerica: valor invalido'],
    };
  }

  if (operation === 'divide' && amount === 0) {
    return {
      value,
      warnings: ['No se puede dividir por cero'],
    };
  }

  const result = applyNumericOperation(parsedValue, operation, amount);
  return {
    value: formatNumericResult(result, step.rounding ?? 2),
    warnings: [],
  };
}

function shouldSkipEmptyValue(value: string, step: TransformStep) {
  return (
    value.trim() === '' &&
    !step.applyToEmptyValues &&
    ['addPrefix', 'addSuffix', 'removeText', 'replaceText', 'numericOperation'].includes(step.type)
  );
}
