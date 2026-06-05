import type {
  ConcatPart,
  ConditionOperator,
  OutputColumn,
  OutputRecipe,
  RecipePart,
  StepOperand,
  StepSource,
  TransformCondition,
  TransformStep,
  TransformStepMode,
  TransformStepType,
} from '../types/import';

const outputColumnsKey = 'excel-sanitizer:v2-output-columns';

const defaultOutputColumns: OutputColumn[] = [
  { id: 'output-code', label: 'Codigo', order: 0, enabled: true, recipe: { type: 'empty' } },
  { id: 'output-name', label: 'Nombre', order: 1, enabled: true, recipe: { type: 'empty' } },
  { id: 'output-price', label: 'Precio', order: 2, enabled: true, recipe: { type: 'empty' } },
  { id: 'output-comments', label: 'Comentarios', order: 3, enabled: true, recipe: { type: 'empty' } },
];

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
    return parsed.map(normalizeOutputColumn).filter((column): column is OutputColumn => Boolean(column));
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
    source: normalizeStepSource(step.source),
    value: step.value ?? '',
    searchValue: step.searchValue ?? '',
    replaceValue: step.replaceValue ?? '',
    operation: step.operation ?? 'add',
    amount: Number(step.amount ?? 0),
    leftOperand: normalizeStepOperand(step.leftOperand),
    rightOperand: normalizeStepOperand(step.rightOperand),
    parts: normalizeConcatParts(step.parts),
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
    'concat',
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
