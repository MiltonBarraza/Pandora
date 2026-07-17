import type {
  ConcatPart,
  ConditionOperator,
  DateInputFormat,
  DateInvalidFallback,
  DateOutputFormat,
  ManualRangeCondition,
  ManualRangeValue,
  NumericFormula,
  NumericFormulaDisplayGroup,
  NumericFormulaNode,
  NumericFormulaOperator,
  OutputColumn,
  OutputRecipe,
  RangeValueRecipe,
  RecipePart,
  StepOperand,
  StepSource,
  TransformCondition,
  TransformStep,
  TransformStepMode,
  TransformStepType,
} from '../types/import';
import { isValidDateOutputFormat } from '../domain/import/dateOperations';

const outputColumnsKey = 'excel-sanitizer:v2-output-columns';

const defaultOutputColumns: OutputColumn[] = [];
const legacyDefaultOutputColumnIds = ['output-code', 'output-name', 'output-price', 'output-comments'];
const defaultDateInputFormat: DateInputFormat = 'DD/MM/YYYY';
const defaultDateOutputFormat: DateOutputFormat = 'YYYY-MM-DD';
const defaultDateInvalidFallback: DateInvalidFallback = 'original';

export function createDefaultOutputColumns(): OutputColumn[] {
  return defaultOutputColumns.map((column) => ({ ...column, recipe: { ...column.recipe } }));
}

export function loadOutputColumns(): OutputColumn[] {
  try {
    const raw = localStorage.getItem(outputColumnsKey);
    if (raw === null) {
      return createDefaultOutputColumns();
    }

    const parsed = JSON.parse(raw) as Partial<OutputColumn>[];
    const columns = parsed.map(normalizeOutputColumn).filter((column): column is OutputColumn => Boolean(column));

    if (isLegacyDefaultOutputColumns(columns)) {
      return createDefaultOutputColumns();
    }

    return columns;
  } catch {
    return createDefaultOutputColumns();
  }
}

export function saveOutputColumns(outputColumns: OutputColumn[]) {
  localStorage.setItem(outputColumnsKey, JSON.stringify(outputColumns.map((column) => ({ ...column, enabled: true }))));
}

function normalizeOutputColumn(column: Partial<OutputColumn>): OutputColumn | null {
  if (!column.id || !column.label) {
    return null;
  }

  return {
    id: column.id,
    label: column.label,
    order: column.order ?? 0,
    enabled: true,
    ...(typeof column.generatedFromInputColumnId === 'string'
      ? { generatedFromInputColumnId: column.generatedFromInputColumnId }
      : {}),
    recipe: normalizeRecipe(column.recipe),
  };
}

function isLegacyDefaultOutputColumns(columns: OutputColumn[]) {
  return columns.length === legacyDefaultOutputColumnIds.length
    && columns.every((column, index) => (
      column.id === legacyDefaultOutputColumnIds[index]
      && column.recipe.type === 'empty'
    ));
}

function normalizeRecipe(recipe?: Partial<OutputRecipe>): OutputRecipe {
  if (recipe?.type === 'direct') {
    return {
      type: 'direct',
      inputColumnId: recipe.inputColumnId ?? '',
    };
  }

  if (recipe?.type === 'fixedText') {
    return {
      type: 'fixedText',
      value: recipe.value ?? '',
    };
  }

  if (recipe?.type === 'combine') {
    const customMode = normalizeCustomValueMode(recipe.customMode);
    return {
      type: 'combine',
      parts: normalizeParts(recipe.parts),
      separator: recipe.separator ?? '',
      steps: normalizeSteps(recipe.steps),
      ...(customMode ? { customMode } : {}),
    };
  }

  if (recipe?.type === 'manualRange') {
    const condition = recipe.condition ? normalizeManualRangeCondition(recipe.condition) : undefined;
    return {
      type: 'manualRange',
      ranges: normalizeManualRanges(recipe.ranges),
      ...(condition ? { condition } : {}),
    };
  }

  return { type: 'empty' };
}

function normalizeManualRanges(ranges?: Partial<ManualRangeValue>[]): ManualRangeValue[] {
  return (ranges ?? [])
    .map(normalizeManualRange)
    .filter((range): range is ManualRangeValue => Boolean(range));
}

function normalizeManualRange(range: Partial<ManualRangeValue>): ManualRangeValue | null {
  const startRowNumber = normalizeManualRangeNumber(range.startRowNumber);
  const endRowNumber = normalizeManualRangeNumber(range.endRowNumber);
  if (!startRowNumber || !endRowNumber) {
    return null;
  }

  const valueRecipe = normalizeRangeValueRecipe(range.valueRecipe);
  const baseRange = {
    id: range.id ?? crypto.randomUUID(),
    startRowNumber,
    endRowNumber,
    ...(typeof range.suggestedFromText === 'string' ? { suggestedFromText: range.suggestedFromText } : {}),
    ...(valueRecipe ? { valueRecipe } : {}),
  };

  if (range.valueSource?.type === 'fixedText') {
    return {
      ...baseRange,
      valueSource: { type: 'fixedText', value: range.valueSource.value ?? '' },
    };
  }

  if (range.valueSource?.type === 'rangeText') {
    return {
      ...baseRange,
      valueSource: {
        type: 'rangeText',
        inputColumnId: range.valueSource.inputColumnId ?? '',
        selectedText: range.valueSource.selectedText ?? '',
      },
    };
  }

  return {
    ...baseRange,
    value: range.value ?? '',
  };
}

function normalizeRangeValueRecipe(recipe?: Partial<RangeValueRecipe>): RangeValueRecipe | undefined {
  const source = normalizeRangeValueSource(recipe?.source);
  if (!source) {
    return undefined;
  }

  return {
    source,
    ...(Array.isArray(recipe?.steps) ? { steps: normalizeSteps(recipe.steps) } : {}),
  };
}

function normalizeRangeValueSource(source?: Partial<RangeValueRecipe['source']>): RangeValueRecipe['source'] | undefined {
  if (source?.type === 'rangeText') {
    return {
      type: 'rangeText',
      inputColumnId: source.inputColumnId ?? '',
      selectedText: source.selectedText ?? '',
    };
  }

  return normalizeStepSource(source as Partial<StepSource> | undefined);
}

function normalizeManualRangeNumber(value: number | undefined) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function normalizeManualRangeCondition(condition: ManualRangeCondition): ManualRangeCondition | undefined {
  if (!condition.inputColumnId || (condition.operator !== 'isEmpty' && condition.operator !== 'isNotEmpty')) {
    return undefined;
  }

  return condition;
}

function normalizeCustomValueMode(mode: Partial<Extract<OutputRecipe, { type: 'combine' }>>['customMode']) {
  return mode === 'number' || mode === 'text' || mode === 'concat' ? mode : undefined;
}

function normalizeParts(parts?: Partial<RecipePart>[]): RecipePart[] {
  return (parts ?? [])
    .map(normalizePart)
    .filter((part): part is RecipePart => Boolean(part));
}

function normalizePart(part: Partial<RecipePart>): RecipePart | null {
  const steps = normalizeSteps(part.steps);
  const sharedFields = {
    ...(Array.isArray(part.steps) ? { steps } : {}),
    ...(typeof part.separatorAfter === 'string' ? { separatorAfter: part.separatorAfter } : {}),
  };

  if (part.type === 'input') {
    return {
      id: part.id ?? crypto.randomUUID(),
      type: 'input',
      inputColumnId: part.inputColumnId ?? '',
      ...sharedFields,
    };
  }

  if (part.type === 'text') {
    return {
      id: part.id ?? crypto.randomUUID(),
      type: 'text',
      value: part.value ?? '',
      ...sharedFields,
    };
  }

  return null;
}

function normalizeSteps(steps?: Partial<TransformStep>[]): TransformStep[] {
  return (steps ?? [])
    .map(normalizeStep)
    .filter((step): step is TransformStep => Boolean(step));
}

function normalizeStep(step: Partial<TransformStep>): TransformStep | null {
  const type = normalizeStepType(step.type);
  if (!type) {
    return null;
  }

  return {
    id: step.id ?? crypto.randomUUID(),
    mode: normalizeStepMode(step.mode) ?? inferStepModeFromType(type),
    type,
    source: normalizeStepSource(step.source),
    value: step.value ?? '',
    searchValue: step.searchValue ?? '',
    replaceValue: step.replaceValue ?? '',
    operation: step.operation ?? 'add',
    amount: Number(step.amount ?? 0),
    leftOperand: normalizeStepOperand(step.leftOperand),
    rightOperand: normalizeStepOperand(step.rightOperand),
    ...(normalizeNumericFormula(step.formula) ? { formula: normalizeNumericFormula(step.formula) } : {}),
    parts: normalizeConcatParts(step.parts),
    rounding: normalizeRounding(step.rounding),
    dateInputFormat: normalizeDateFormat(step.dateInputFormat) ?? defaultDateInputFormat,
    dateOutputFormat: normalizeDateOutputFormat(step.dateOutputFormat) ?? defaultDateOutputFormat,
    dateInvalidFallback: normalizeDateInvalidFallback(step.dateInvalidFallback) ?? defaultDateInvalidFallback,
    dateInvalidFallbackText: step.dateInvalidFallbackText ?? '',
    ...(type === 'manualRange' ? { ranges: normalizeManualRanges(step.ranges) } : {}),
    ...(type === 'manualRange' && step.manualRangeCondition ? { manualRangeCondition: normalizeManualRangeCondition(step.manualRangeCondition) } : {}),
    condition: normalizeCondition(step.condition),
    applyToEmptyValues: step.applyToEmptyValues ?? false,
  };
}

function normalizeStepType(type?: string): TransformStepType | null {
  return [
    'noop',
    'trim',
    'uppercase',
    'lowercase',
    'addPrefix',
    'addSuffix',
    'removeText',
    'replaceText',
    'concat',
    'extractNumber',
    'toNumber',
    'toText',
    'formatDate',
    'manualRange',
    'numericFormula',
    'numericOperation',
  ].includes(type ?? '')
    ? type as TransformStepType
    : null;
}

function normalizeStepMode(mode?: string): TransformStepMode | undefined {
  return mode === 'text' || mode === 'number' || mode === 'conversion' || mode === 'date' || mode === 'manualRange' ? mode : undefined;
}

function inferStepModeFromType(type: TransformStepType): TransformStepMode {
  if (type === 'manualRange') {
    return 'manualRange';
  }

  if (type === 'numericOperation' || type === 'numericFormula') {
    return 'number';
  }

  if (type === 'extractNumber' || type === 'toNumber' || type === 'toText') {
    return 'conversion';
  }

  if (type === 'formatDate') {
    return 'date';
  }

  return 'text';
}

function normalizeDateFormat(format?: string): DateInputFormat | undefined {
  return [
    'DD/MM/YYYY',
    'D/M/YYYY',
    'YYYY-MM-DD',
    'MM/DD/YYYY',
    'M/D/YYYY',
    'DD-MM-YYYY',
    'YYYY/MM/DD',
    'DD/MM/YY',
    'D/M/YY',
    'MM/DD/YY',
    'M/D/YY',
  ].includes(format ?? '')
    ? format as DateInputFormat
    : undefined;
}

function normalizeDateOutputFormat(format?: string): DateOutputFormat | undefined {
  return format && isValidDateOutputFormat(format) ? format as DateOutputFormat : undefined;
}

function normalizeDateInvalidFallback(fallback?: string): DateInvalidFallback | undefined {
  return fallback === 'empty' || fallback === 'original' || fallback === 'fixedText' ? fallback : undefined;
}

function normalizeStepSource(source?: Partial<StepSource>): StepSource | undefined {
  if (source?.type === 'previousResult') {
    return { type: 'previousResult' };
  }

  if (source?.type === 'input') {
    return {
      type: 'input',
      inputColumnId: source.inputColumnId ?? '',
    };
  }

  if (source?.type === 'fixedText') {
    return {
      type: 'fixedText',
      value: source.value ?? '',
    };
  }

  if (source?.type === 'rangeText') {
    return {
      type: 'rangeText',
      inputColumnId: source.inputColumnId ?? '',
      selectedText: source.selectedText ?? '',
    };
  }

  return undefined;
}

function normalizeStepOperand(operand?: Partial<StepOperand>): StepOperand | undefined {
  const source = normalizeStepSource(operand);
  if (!source) {
    return undefined;
  }

  return {
    ...source,
    ...(typeof operand?.numericFallback === 'number' && Number.isFinite(operand.numericFallback)
      ? { numericFallback: operand.numericFallback }
      : {}),
  };
}

function normalizeNumericFormula(formula?: Partial<NumericFormula>): NumericFormula | undefined {
  if (formula?.version !== 1) {
    return undefined;
  }

  const expression = normalizeNumericFormulaNode(formula.expression);
  if (!expression) {
    return undefined;
  }

  const displayGroups = normalizeNumericFormulaDisplayGroups(formula.displayGroups, countNumericFormulaOperands(expression));
  return {
    version: 1,
    expression,
    ...(displayGroups.length > 0 ? { displayGroups } : {}),
  };
}

function normalizeNumericFormulaNode(node?: Partial<NumericFormulaNode>): NumericFormulaNode | undefined {
  if (node?.kind === 'operand') {
    const operand = normalizeStepOperand(node.operand);
    return operand ? { kind: 'operand', operand } : undefined;
  }

  if (node?.kind === 'binary') {
    const operator = normalizeNumericFormulaOperator(node.operator);
    const left = normalizeNumericFormulaNode(node.left);
    const right = normalizeNumericFormulaNode(node.right);
    return operator && left && right ? { kind: 'binary', operator, left, right } : undefined;
  }

  return undefined;
}

function normalizeNumericFormulaOperator(operator?: string): NumericFormulaOperator | undefined {
  return operator === 'add' || operator === 'subtract' || operator === 'multiply' || operator === 'divide'
    ? operator
    : undefined;
}

function normalizeNumericFormulaDisplayGroups(
  displayGroups: Partial<NumericFormula>['displayGroups'],
  valueCount: number,
): NumericFormulaDisplayGroup[] {
  if (!Array.isArray(displayGroups)) {
    return [];
  }

  return displayGroups
    .map((group) => ({
      startValueIndex: Number(group?.startValueIndex),
      endValueIndex: Number(group?.endValueIndex),
    }))
    .filter((group) => (
      Number.isInteger(group.startValueIndex)
      && Number.isInteger(group.endValueIndex)
      && group.startValueIndex >= 0
      && group.endValueIndex > group.startValueIndex
      && group.endValueIndex < valueCount
    ))
    .slice(0, 1);
}

function countNumericFormulaOperands(node: NumericFormulaNode): number {
  if (node.kind === 'operand') {
    return 1;
  }

  return countNumericFormulaOperands(node.left) + countNumericFormulaOperands(node.right);
}

function normalizeConcatParts(parts?: Partial<ConcatPart>[]): ConcatPart[] | undefined {
  if (!Array.isArray(parts)) {
    return undefined;
  }

  return parts
    .map(normalizeConcatPart)
    .filter((part): part is ConcatPart => Boolean(part));
}

function normalizeConcatPart(part: Partial<ConcatPart>): ConcatPart | null {
  const source = normalizeStepSource(part.source);
  if (!source) {
    return null;
  }

  return {
    id: part.id ?? crypto.randomUUID(),
    source,
    ...(typeof part.separatorBefore === 'string' ? { separatorBefore: part.separatorBefore } : {}),
    ...(Array.isArray(part.steps) ? { steps: normalizeSteps(part.steps) } : {}),
  };
}

function normalizeRounding(rounding: Partial<TransformStep>['rounding']) {
  return rounding === 'none' || rounding === 0 || rounding === 2 || rounding === 4 ? rounding : 2;
}

function normalizeCondition(condition?: Partial<TransformCondition>): TransformCondition | undefined {
  if (!condition?.columnId) {
    return undefined;
  }

  return {
    target: condition.target === 'output' ? 'output' : 'input',
    columnId: condition.columnId,
    operator: normalizeConditionOperator(condition.operator),
    value: condition.value ?? '',
    valueType: condition.valueType === 'number' ? 'number' : 'text',
  };
}

function normalizeConditionOperator(operator?: string): ConditionOperator {
  return [
    'contains',
    'notContains',
    'equals',
    'notEquals',
    'startsWith',
    'endsWith',
    'isEmpty',
    'isNotEmpty',
    'greaterThan',
    'greaterThanOrEqual',
    'lessThan',
    'lessThanOrEqual',
    'numericEquals',
    'numericNotEquals',
  ].includes(operator ?? '')
    ? operator as ConditionOperator
    : 'contains';
}
