import type {
  ColumnAnalysis,
  IgnoreRule,
  InputColumn,
  InputNormalizationRule,
  InputRow,
  OutputColumn,
  ProcessedRow,
  RawRow,
  RecipePart,
  StepOperand,
  StepSource,
  TransformStep,
  VirtualInputColumn,
} from '../../types/import';
import { applyInputIgnoreRulesToInputRows } from './applyIgnoreRules';
import { applyFormatDateStep } from './dateOperations';
import { evaluateTransformCondition } from './evaluateCondition';
import { applyInputNormalizationRules, getInputNormalizationStartRowIndex } from './inputNormalization';
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

export function buildInputRows(rows: RawRow[], inputColumns: InputColumn[], startRowIndex = 0, virtualInputColumns: VirtualInputColumn[] = []): InputRow[] {
  const activeColumns = inputColumns.filter((column) => column.active);
  const activeVirtualColumns = virtualInputColumns.filter((column) => column.active);

  return rows.slice(startRowIndex).map((row, offset) => ({
    rowNumber: startRowIndex + offset + 1,
    values: Object.fromEntries(
      [
        ...activeColumns.map((column) => [column.id, toText(row[column.columnIndex])] as const),
        ...activeVirtualColumns.map((column) => [column.id, toText(getRawRowVirtualValue(row, column.id))] as const),
      ],
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
  headerRowIndex = null,
  startRowIndex,
  outputColumns,
  virtualInputColumns = [],
  inputNormalizationRules = [],
  inputIgnoreRules = [],
}: {
  rawRows: RawRow[];
  columnAnalysis: ColumnAnalysis[];
  headerRowIndex?: number | null;
  startRowIndex: number;
  outputColumns: OutputColumn[];
  virtualInputColumns?: VirtualInputColumn[];
  inputNormalizationRules?: InputNormalizationRule[];
  inputIgnoreRules?: IgnoreRule[];
}) {
  const inputColumns = buildInputColumnsFromAnalysis(columnAnalysis);
  const normalizationStartRowIndex = getInputNormalizationStartRowIndex(headerRowIndex);
  const normalizedRawRows = [
    ...rawRows.slice(0, normalizationStartRowIndex).map(cloneRawRowWithProperties),
    ...copyVirtualRawRowValues(
      applyInputNormalizationRules(rawRows.slice(normalizationStartRowIndex), inputNormalizationRules, inputColumns),
      rawRows.slice(normalizationStartRowIndex),
    ),
  ];
  const inputRows = buildInputRows(normalizedRawRows, inputColumns, startRowIndex, virtualInputColumns);
  const { includedInputRows, ignoredInputRows } = applyInputIgnoreRulesToInputRows({
    inputRows,
    inputIgnoreRules,
    inputColumns,
  });
  const processedRows = buildProcessedRows(includedInputRows, outputColumns).filter(hasAnyOutputValue);

  return {
    inputColumns,
    outputColumns,
    normalizedRawRows,
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

function getRawRowVirtualValue(row: RawRow, columnId: string) {
  return (row as unknown as Record<string, unknown>)[columnId];
}

function cloneRawRowWithProperties(row: RawRow): RawRow {
  return Object.assign([...row], getRawRowObjectProperties(row));
}

function copyVirtualRawRowValues(rows: RawRow[], sourceRows: RawRow[]): RawRow[] {
  return rows.map((row, rowIndex) => Object.assign([...row], getRawRowObjectProperties(sourceRows[rowIndex] ?? [])));
}

function getRawRowObjectProperties(row: RawRow) {
  return Object.fromEntries(
    Object.entries(row as unknown as Record<string, unknown>).filter(([key]) => !isArrayIndexKey(key)),
  );
}

function isArrayIndexKey(key: string) {
  return String(Number(key)) === key && Number.isInteger(Number(key)) && Number(key) >= 0;
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
    const result = resolveCombinedValue(row, column.recipe.parts, column.recipe.separator, outputValues, column.id);
    value = result.value;
    const finalResult = applyTransformSteps(value, getRecipeSteps(column.recipe), row.values, outputValues, column.id);
    return {
      value: finalResult.value,
      warnings: [...result.warnings, ...finalResult.warnings],
    };
  }

  return applyTransformSteps(value, getRecipeSteps(column.recipe), row.values, outputValues, column.id);
}

function getRecipeSteps(recipe: OutputColumn['recipe']) {
  return recipe.type === 'empty' ? [] : recipe.steps ?? [];
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
    const result = applyTransformSteps(baseValue, part.steps ?? [], row.values, outputValues, currentOutputColumnId);
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
  inputValues: Record<string, string>,
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

      const nextResult = applyTransformStep(currentResult.value, step, {
        inputValues,
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
    return applyExtractNumberStep(value);
  }

  if (step.type === 'toNumber') {
    return applyToNumberStep(value);
  }

  if (step.type === 'toText') {
    return { value: String(value), warnings: [] };
  }

  if (step.type === 'formatDate') {
    return { value: applyFormatDateStep(value, step), warnings: [] };
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
      context.inputValues,
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

  if (operation === 'divide' && right.value === 0) {
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

function applyExtractNumberStep(value: string) {
  const parsedValue = extractNumericValue(value);
  if (parsedValue === null) {
    return {
      value,
      warnings: ['No se pudo extraer número del texto'],
    };
  }

  return { value: formatNumericResult(parsedValue, 'none'), warnings: [] };
}

function applyToNumberStep(value: string) {
  const parsedValue = parseNumericValue(value);
  if (parsedValue === null) {
    return {
      value,
      warnings: ['No se pudo convertir a número: valor inválido'],
    };
  }

  return { value: formatNumericResult(parsedValue, 'none'), warnings: [] };
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
