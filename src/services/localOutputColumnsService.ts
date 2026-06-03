import type { ConditionOperator, OutputColumn, OutputRecipe, RecipePart, TransformCondition, TransformStep, TransformStepMode, TransformStepType } from '../types/import';

const outputColumnsKey = 'excel-sanitizer:v2-output-columns';

const defaultOutputColumns: OutputColumn[] = [
  { id: 'output-code', label: 'Codigo', order: 0, enabled: true, recipe: { type: 'empty' } },
  { id: 'output-name', label: 'Nombre', order: 1, enabled: true, recipe: { type: 'empty' } },
  { id: 'output-price', label: 'Precio', order: 2, enabled: true, recipe: { type: 'empty' } },
  { id: 'output-comments', label: 'Comentarios', order: 3, enabled: true, recipe: { type: 'empty' } },
];

export function loadOutputColumns(): OutputColumn[] {
  try {
    const raw = localStorage.getItem(outputColumnsKey);
    if (raw === null) {
      return defaultOutputColumns;
    }

    const parsed = JSON.parse(raw) as Partial<OutputColumn>[];
    return parsed.map(normalizeOutputColumn).filter((column): column is OutputColumn => Boolean(column));
  } catch {
    return defaultOutputColumns;
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
    recipe: normalizeRecipe(column.recipe),
  };
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

  return { type: 'empty' };
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
    value: step.value ?? '',
    searchValue: step.searchValue ?? '',
    replaceValue: step.replaceValue ?? '',
    operation: step.operation ?? 'add',
    amount: Number(step.amount ?? 0),
    rounding: normalizeRounding(step.rounding),
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
    'extractNumber',
    'toNumber',
    'toText',
    'numericOperation',
  ].includes(type ?? '')
    ? type as TransformStepType
    : null;
}

function normalizeStepMode(mode?: string): TransformStepMode | undefined {
  return mode === 'text' || mode === 'number' || mode === 'conversion' ? mode : undefined;
}

function inferStepModeFromType(type: TransformStepType): TransformStepMode {
  if (type === 'numericOperation') {
    return 'number';
  }

  if (type === 'extractNumber' || type === 'toNumber' || type === 'toText') {
    return 'conversion';
  }

  return 'text';
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
