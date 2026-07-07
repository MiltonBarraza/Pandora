import type {
  ColumnAnalysis,
  IgnoreRule,
  InputColumn,
  InputRow,
  OutputColumn,
  ProcessedRow,
  RangeValueRecipe,
  RawRow,
  RecipePart,
  SheetRowMetadata,
  StepOperand,
  StepSource,
  TransformStep,
} from '../../types/import';
import { applyInputIgnoreRulesToInputRows } from './applyIgnoreRules';
import { applyFormatDateStep } from './dateOperations';
import { evaluateTextCondition, evaluateTransformCondition } from './evaluateCondition';
import { applyNumericOperation, extractNumericValue, formatNumericResult, parseNumericValue } from './numericOperations';
import { normalizeWhitespace, toText } from './normalizeText';

export function buildInputColumnsFromAnalysis(columnAnalysis: ColumnAnalysis[]): InputColumn[] {
  return columnAnalysis.map((column) => ({
    id: getInputColumnId(column.columnIndex),
    columnIndex: column.columnIndex,
    columnLetter: column.columnLetter,
    label: column.header || column.columnLetter,
    header: column.header,
    alias: column.alias,
    active: !column.ignored,
    sampleValues: column.sampleValues,
    nonEmptyCount: column.nonEmptyCount,
    ignoredReason: column.ignoredReason,
  }));
}

export function buildInputRows(
  rows: RawRow[],
  inputColumns: InputColumn[],
  startRowIndex = 0,
  rowMetadata: SheetRowMetadata[] = [],
): InputRow[] {
  const activeColumns = inputColumns.filter((column) => column.active);
  const rowMetadataByInternalIndex = new Map(rowMetadata.map((metadata) => [metadata.internalRowIndex, metadata]));

  return rows.slice(startRowIndex).map((row, offset) => ({
    rowNumber: rowMetadataByInternalIndex.get(startRowIndex + offset)?.excelRowNumber ?? startRowIndex + offset + 1,
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
  inputIgnoreRules = [],
  rowMetadata = [],
}: {
  rawRows: RawRow[];
  columnAnalysis: ColumnAnalysis[];
  startRowIndex: number;
  outputColumns: OutputColumn[];
  inputIgnoreRules?: IgnoreRule[];
  rowMetadata?: SheetRowMetadata[];
}) {
  const inputColumns = buildInputColumnsFromAnalysis(columnAnalysis);
  const inputRows = buildInputRows(rawRows, inputColumns, startRowIndex, rowMetadata);
  const { includedInputRows, ignoredInputRows } = applyInputIgnoreRulesToInputRows({
    inputRows,
    inputIgnoreRules,
    inputColumns,
  });
  // Manual ranges emit blank cells outside their bounds; that blank is data shape, not an implicit row filter.
  const preserveRowsForManualRanges = hasEnabledManualRangeEvaluation(outputColumns);
  const processedRows = buildProcessedRows(includedInputRows, outputColumns)
    .filter((row) => shouldKeepProcessedRow(row, preserveRowsForManualRanges));

  return {
    inputColumns,
    outputColumns,
    inputRows,
    includedInputRows,
    ignoredInputRows,
    processedRows,
  };
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

function shouldKeepProcessedRow(row: ProcessedRow, preserveRowsForManualRanges: boolean) {
  return hasAnyOutputValue(row) || preserveRowsForManualRanges;
}

function hasAnyOutputValue(row: ProcessedRow) {
  return Object.values(row.outputValues).some((value) => value.trim() !== '');
}

function hasEnabledManualRangeEvaluation(outputColumns: OutputColumn[]) {
  return getEnabledOutputColumns(outputColumns).some((column) => recipeEvaluatesManualRanges(column.recipe));
}

function recipeEvaluatesManualRanges(recipe: OutputColumn['recipe']) {
  if (recipe.type === 'manualRange') {
    return true;
  }

  return getRecipeSteps(recipe).some(stepEvaluatesManualRanges)
    || (recipe.type === 'combine' && recipe.parts.some((part) => (part.steps ?? []).some(stepEvaluatesManualRanges)));
}

function stepEvaluatesManualRanges(step: TransformStep): boolean {
  if (step.type === 'manualRange') {
    return true;
  }

  return (step.parts ?? []).some((part) => (part.steps ?? []).some(stepEvaluatesManualRanges));
}

function resolveOutputValue(row: InputRow, column: OutputColumn, outputValues: Record<string, string>) {
  let value = '';

  if (column.recipe.type === 'direct') {
    value = row.values[column.recipe.inputColumnId] ?? '';
  } else if (column.recipe.type === 'fixedText') {
    value = column.recipe.value;
  } else if (column.recipe.type === 'combine') {
    const result = resolveCombinedValue(row, column.recipe.parts, column.recipe.separator, outputValues, column.id);
    value = result.value;
    const finalResult = applyTransformSteps(value, getRecipeSteps(column.recipe), row, outputValues, column.id);
    return {
      value: finalResult.value,
      warnings: [...result.warnings, ...finalResult.warnings],
    };
  } else if (column.recipe.type === 'manualRange') {
    return {
      value: resolveManualRangeValue(row, column.recipe),
      warnings: [],
    };
  }

  return applyTransformSteps(value, getRecipeSteps(column.recipe), row, outputValues, column.id);
}

function getRecipeSteps(recipe: OutputColumn['recipe']) {
  return 'steps' in recipe ? recipe.steps ?? [] : [];
}

function resolveManualRangeValue(row: InputRow, recipe: Pick<Extract<OutputColumn['recipe'], { type: 'manualRange' }>, 'ranges' | 'condition'>) {
  if (!matchesManualRangeCondition(row, recipe)) {
    return '';
  }

  const range = recipe.ranges.find((range) => row.rowNumber >= range.startRowNumber && row.rowNumber <= range.endRowNumber);
  if (!range) {
    return '';
  }

  if (range.valueRecipe) {
    return resolveRangeValueRecipe(row, range.valueRecipe);
  }

  return resolveLegacyManualRangeValue(range);
}

function resolveLegacyManualRangeValue(range: Extract<OutputColumn['recipe'], { type: 'manualRange' }>['ranges'][number]) {
  if (range.valueSource?.type === 'fixedText') {
    return range.valueSource.value;
  }

  if (range.valueSource?.type === 'rangeText') {
    return range.valueSource.selectedText ?? '';
  }

  return range.value ?? '';
}

function resolveRangeValueRecipe(row: InputRow, recipe: RangeValueRecipe) {
  const initialValue = resolveRangeValueSource(row, recipe.source);
  const safeSteps = (recipe.steps ?? []).filter((step) => step.type !== 'manualRange');
  return applyTransformSteps(initialValue, safeSteps, row, {}, '').value;
}

function resolveRangeValueSource(row: InputRow, source: RangeValueRecipe['source']) {
  if (source.type === 'input') {
    return row.values[source.inputColumnId] ?? '';
  }

  if (source.type === 'fixedText') {
    return source.value;
  }

  if (source.type === 'rangeText') {
    return source.selectedText ?? '';
  }

  return '';
}

function matchesManualRangeCondition(row: InputRow, recipe: Pick<Extract<OutputColumn['recipe'], { type: 'manualRange' }>, 'condition'>) {
  if (!recipe.condition) {
    return true;
  }

  return evaluateTextCondition(row.values[recipe.condition.inputColumnId] ?? '', recipe.condition.operator);
}

function resolveCombinedValue(
  row: InputRow,
  parts: RecipePart[],
  separator: string | undefined,
  outputValues: Record<string, string>,
  currentOutputColumnId: string,
) {
  const warnings: string[] = [];
  const values = parts.map((part) => {
    const baseValue = part.type === 'input' ? row.values[part.inputColumnId] ?? '' : part.value;
    const result = applyTransformSteps(baseValue, part.steps ?? [], row, outputValues, currentOutputColumnId);
    warnings.push(...result.warnings);
    return result.value;
  });

  const hasCustomSeparators = parts.some((part) => typeof part.separatorAfter === 'string');
  if (!hasCustomSeparators && typeof separator === 'string' && separator !== '') {
    return {
      value: values.filter((value) => value.trim() !== '').join(separator),
      warnings,
    };
  }

  const value = values.reduce((combinedValue, value, index) => {
    const nextValue = `${combinedValue}${value}`;
    if (index === values.length - 1) {
      return nextValue;
    }

    return `${nextValue}${getPartSeparator(parts[index], separator)}`;
  }, '');

  return { value, warnings };
}

function getPartSeparator(part: RecipePart, globalSeparator?: string) {
  if (typeof part.separatorAfter === 'string') {
    return part.separatorAfter;
  }

  return globalSeparator ?? '';
}

function applyTransformSteps(
  value: string,
  steps: TransformStep[],
  row: InputRow,
  outputValues: Record<string, string>,
  currentOutputColumnId: string,
): TransformResult {
  return steps.reduce(
    (currentResult, step, stepIndex) => {
      const nextOutputValues = {
        ...outputValues,
        [currentOutputColumnId]: currentResult.value,
      };
      const conditionResult = evaluateTransformCondition({
        inputValues: row.values,
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

      const nextResult = applyTransformStep(currentResult.value, step, {
        inputValues: row.values,
        row,
        outputValues: nextOutputValues,
        currentOutputColumnId,
        stepIndex,
      });
      return {
        value: nextResult.value,
        warnings: [...currentResult.warnings, ...nextResult.warnings],
      };
    },
    { value, warnings: [] as string[] },
  );
}

type TransformStepContext = {
  inputValues: Record<string, string>;
  row: InputRow;
  outputValues: Record<string, string>;
  currentOutputColumnId: string;
  stepIndex: number;
};

type StepValueContext = TransformStepContext & {
  currentValue: string;
};

type TransformResult = {
  value: string;
  warnings: string[];
};

function applyTransformStep(currentValue: string, step: TransformStep, context: TransformStepContext): TransformResult {
  const value = resolveStepSource(step.source, {
    ...context,
    currentValue,
  });

  if (shouldSkipEmptyValue(value, step)) {
    return { value: currentValue, warnings: [] };
  }

  if (step.type === 'trim') {
    return { value: normalizeWhitespace(value), warnings: [] };
  }

  if (step.type === 'noop') {
    return { value, warnings: [] };
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

  if (step.type === 'extractNumber') {
    return applyExtractNumberStep(value, step);
  }

  if (step.type === 'toNumber') {
    return applyToNumberStep(value, step);
  }

  if (step.type === 'toText') {
    return { value: String(value), warnings: [] };
  }

  if (step.type === 'formatDate') {
    return { value: applyFormatDateStep(value, step), warnings: [] };
  }

  if (step.type === 'manualRange') {
    return {
      value: resolveManualRangeValue(context.row, {
        ranges: step.ranges ?? [],
        condition: step.manualRangeCondition,
      }),
      warnings: [],
    };
  }

  if (step.type === 'concat') {
    return applyConcatTransformStep(step, {
      ...context,
      currentValue,
    });
  }

  if (step.type === 'numericOperation') {
    return applyNumericTransformStep(value, step, {
      ...context,
      currentValue,
    });
  }

  const searchValue = step.searchValue ?? '';
  return { value: searchValue ? value.split(searchValue).join(step.replaceValue ?? '') : value, warnings: [] };
}

function resolveStepSource(source: StepSource | undefined, context: StepValueContext) {
  if (!source || source.type === 'previousResult') {
    return context.currentValue;
  }

  if (source.type === 'input') {
    return context.inputValues[source.inputColumnId] ?? '';
  }

  if (source.type === 'rangeText') {
    return source.selectedText ?? '';
  }

  return source.value;
}

function resolveStepOperand(operand: StepOperand | undefined, context: StepValueContext) {
  const rawValue = resolveStepSource(operand, context);
  const parsedValue = parseNumericValue(rawValue);

  if (parsedValue !== null) {
    return { value: parsedValue, warnings: [] as string[] };
  }

  if (typeof operand?.numericFallback === 'number' && Number.isFinite(operand.numericFallback)) {
    return { value: operand.numericFallback, warnings: [] as string[] };
  }

  return {
    value: null,
    warnings: ['No se pudo aplicar operación numérica: operando inválido'],
  };
}

function applyConcatTransformStep(step: TransformStep, context: StepValueContext): TransformResult {
  const warnings: string[] = [];
  const parts = step.parts ?? [];

  const value = parts.reduce((combinedValue, part) => {
    const baseValue = resolveStepSource(part.source, context);
    const result = applyTransformSteps(
      baseValue,
      part.steps ?? [],
      context.row,
      context.outputValues,
      context.currentOutputColumnId,
    );
    warnings.push(...result.warnings);
    return `${combinedValue}${part.separatorBefore ?? ''}${result.value}`;
  }, '');

  return { value, warnings };
}

function applyNumericTransformStep(value: string, step: TransformStep, context: StepValueContext): TransformResult {
  const operation = step.operation ?? 'add';
  if (step.leftOperand || step.rightOperand) {
    return applyNumericOperandTransformStep(step, context);
  }

  const amount = Number(step.amount ?? 0);
  const valueToParse = value.trim() === '' && step.applyToEmptyValues ? '0' : value;
  const parsedValue = parseNumericValue(valueToParse);

  if (parsedValue === null || !Number.isFinite(amount)) {
    return {
      value,
      warnings: ['No se pudo aplicar operación numérica: valor inválido'],
    };
  }

  if ((operation === 'divide' && amount === 0) || (operation === 'removeIncludedPercentage' && amount === -100)) {
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

function applyNumericOperandTransformStep(step: TransformStep, context: StepValueContext): TransformResult {
  const operation = step.operation ?? 'add';
  const left = resolveStepOperand(step.leftOperand ?? { type: 'previousResult' }, context);
  const right = resolveStepOperand(step.rightOperand ?? { type: 'fixedText', value: String(step.amount ?? 0) }, context);

  if (left.value === null || right.value === null) {
    return {
      value: context.currentValue,
      warnings: [...left.warnings, ...right.warnings],
    };
  }

  if ((operation === 'divide' && right.value === 0) || (operation === 'removeIncludedPercentage' && right.value === -100)) {
    return {
      value: context.currentValue,
      warnings: ['No se puede dividir por cero'],
    };
  }

  const result = applyNumericOperation(left.value, operation, right.value);
  return {
    value: formatNumericResult(result, step.rounding ?? 2),
    warnings: [],
  };
}

function applyExtractNumberStep(value: string, step: TransformStep) {
  const parsedValue = extractNumericValue(value);
  if (parsedValue === null) {
    return applyConversionInvalidFallback(value, step, 'No se pudo extraer número del texto');
  }

  return { value: formatNumericResult(parsedValue, 'none'), warnings: [] };
}

function applyToNumberStep(value: string, step: TransformStep) {
  const parsedValue = parseNumericValue(value);
  if (parsedValue === null) {
    return applyConversionInvalidFallback(value, step, 'No se pudo convertir a número: valor inválido');
  }

  return { value: formatNumericResult(parsedValue, 'none'), warnings: [] };
}

function applyConversionInvalidFallback(value: string, step: TransformStep, warning: string): TransformResult {
  const fallback = step.conversionInvalidFallback ?? 'original';
  if (fallback === 'empty') {
    return { value: '', warnings: [warning] };
  }

  if (fallback === 'fixedText') {
    return { value: step.conversionInvalidFallbackText ?? '', warnings: [warning] };
  }

  return { value, warnings: [warning] };
}

function shouldSkipEmptyValue(value: string, step: TransformStep) {
  if (step.type === 'numericOperation' && (step.leftOperand || step.rightOperand)) {
    return false;
  }

  return (
    value.trim() === '' &&
    !step.applyToEmptyValues &&
    ['addPrefix', 'addSuffix', 'removeText', 'replaceText', 'extractNumber', 'toNumber', 'formatDate', 'numericOperation'].includes(step.type)
  );
}
