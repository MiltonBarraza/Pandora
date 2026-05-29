import type { ConditionOperator, OutputColumn, OutputRecipe, RecipePart, TransformCondition, TransformStep, TransformStepType } from '../types/import';

const outputColumnsKey = 'excel-sanitizer:v2-output-columns';

export function loadOutputColumns(): OutputColumn[] {
  try {
    const raw = localStorage.getItem(outputColumnsKey);
    const parsed = raw ? (JSON.parse(raw) as Partial<OutputColumn>[]) : [];
    return parsed.map(normalizeOutputColumn).filter((column): column is OutputColumn => Boolean(column));
  } catch {
    return [];
  }
}

export function hasSavedOutputColumnsConfig() {
  return localStorage.getItem(outputColumnsKey) !== null;
}

export function saveOutputColumns(outputColumns: OutputColumn[]) {
  localStorage.setItem(outputColumnsKey, JSON.stringify(outputColumns));
}

function normalizeOutputColumn(column: Partial<OutputColumn>): OutputColumn | null {
  if (!column.id || !column.label) {
    return null;
  }

  return {
    id: column.id,
    label: column.label,
    order: column.order ?? 0,
    enabled: column.enabled ?? true,
    legacyCategoryId: column.legacyCategoryId,
    recipe: normalizeRecipe(column.recipe),
  };
}

function normalizeRecipe(recipe?: Partial<OutputRecipe>): OutputRecipe {
  if (recipe?.type === 'direct') {
    return {
      type: 'direct',
      inputColumnId: recipe.inputColumnId ?? '',
      steps: normalizeSteps(recipe.steps),
    };
  }

  if (recipe?.type === 'fixedText') {
    return {
      type: 'fixedText',
      value: recipe.value ?? '',
      steps: normalizeSteps(recipe.steps),
    };
  }

  if (recipe?.type === 'combine') {
    return {
      type: 'combine',
      parts: normalizeParts(recipe.parts),
      separator: recipe.separator ?? '',
      steps: normalizeSteps(recipe.steps),
    };
  }

  return { type: 'empty' };
}

function normalizeParts(parts?: Partial<RecipePart>[]): RecipePart[] {
  return (parts ?? [])
    .map(normalizePart)
    .filter((part): part is RecipePart => Boolean(part));
}

function normalizePart(part: Partial<RecipePart>): RecipePart | null {
  if (part.type === 'input') {
    return {
      id: part.id ?? crypto.randomUUID(),
      type: 'input',
      inputColumnId: part.inputColumnId ?? '',
    };
  }

  if (part.type === 'text') {
    return {
      id: part.id ?? crypto.randomUUID(),
      type: 'text',
      value: part.value ?? '',
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
    'trim',
    'uppercase',
    'lowercase',
    'addPrefix',
    'addSuffix',
    'removeText',
    'replaceText',
    'numericOperation',
  ].includes(type ?? '')
    ? type as TransformStepType
    : null;
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
