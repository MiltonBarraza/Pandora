import type {
  ConcatPart,
  ExportedImportSettings,
  OutputColumn,
  OutputRecipe,
  RecipePart,
  SettingsColumnReference,
  SettingsReferencesSummary,
  StepOperand,
  StepSource,
  TransformCondition,
  TransformStep,
} from '../../types/import';

type ReferenceCollectorContext = {
  outputColumnId?: string;
  references: SettingsColumnReference[];
};

export function collectSettingsReferences(settings: Pick<ExportedImportSettings, 'config'>): SettingsReferencesSummary {
  const references: SettingsColumnReference[] = [];
  const context = { references };

  settings.config.outputColumns.forEach((outputColumn, outputColumnIndex) => {
    const outputColumnPath = `config.outputColumns[${outputColumnIndex}]`;
    references.push({
      columnId: outputColumn.id,
      target: 'output',
      kind: 'outputColumn',
      path: outputColumnPath,
      outputColumnId: outputColumn.id,
    });

    collectOutputRecipeReferences(outputColumn, outputColumn.recipe, `${outputColumnPath}.recipe`, {
      ...context,
      outputColumnId: outputColumn.id,
    });
  });

  settings.config.inputIgnoreRules.forEach((rule, ruleIndex) => {
    if (!rule.columnId) {
      return;
    }

    references.push({
      columnId: rule.columnId,
      target: 'input',
      kind: 'inputIgnoreRule',
      path: `config.inputIgnoreRules[${ruleIndex}]`,
      ruleId: rule.id,
    });
  });

  settings.config.outputIgnoreRules.forEach((rule, ruleIndex) => {
    if (!rule.columnId) {
      return;
    }

    references.push({
      columnId: rule.columnId,
      target: 'output',
      kind: 'outputIgnoreRule',
      path: `config.outputIgnoreRules[${ruleIndex}]`,
      ruleId: rule.id,
    });
  });

  return buildReferencesSummary(references);
}

export function collectInputColumnReferences(settings: Pick<ExportedImportSettings, 'config'>) {
  return collectSettingsReferences(settings).references.filter((reference) => reference.target === 'input');
}

export function collectOutputColumnReferences(settings: Pick<ExportedImportSettings, 'config'>) {
  return collectSettingsReferences(settings).references.filter((reference) => reference.target === 'output');
}

export function groupReferencesByColumnId(references: SettingsColumnReference[]) {
  return references.reduce<Record<string, SettingsColumnReference[]>>((grouped, reference) => {
    grouped[reference.columnId] = [...(grouped[reference.columnId] ?? []), reference];
    return grouped;
  }, {});
}

function collectOutputRecipeReferences(
  outputColumn: OutputColumn,
  recipe: OutputRecipe,
  path: string,
  context: ReferenceCollectorContext,
) {
  if (recipe.type === 'direct') {
    addInputReference(context, recipe.inputColumnId, {
      kind: 'directRecipe',
      path: `${path}.inputColumnId`,
      outputColumnId: outputColumn.id,
    });
  }

  if ('steps' in recipe) {
    collectTransformSteps(recipe.steps ?? [], `${path}.steps`, context);
  }

  if (recipe.type !== 'combine') {
    return;
  }

  recipe.parts.forEach((part, partIndex) => {
    collectRecipePartReferences(part, `${path}.parts[${partIndex}]`, context);
  });
}

function collectRecipePartReferences(part: RecipePart, path: string, context: ReferenceCollectorContext) {
  if (part.type === 'input') {
    addInputReference(context, part.inputColumnId, {
      kind: 'recipePart',
      path: `${path}.inputColumnId`,
      partId: part.id,
      outputColumnId: context.outputColumnId,
    });
  }

  collectTransformSteps(part.steps ?? [], `${path}.steps`, context);
}

function collectTransformSteps(steps: TransformStep[], path: string, context: ReferenceCollectorContext) {
  steps.forEach((step, stepIndex) => {
    collectTransformStepReferences(step, `${path}[${stepIndex}]`, context);
  });
}

function collectTransformStepReferences(step: TransformStep, path: string, context: ReferenceCollectorContext) {
  collectStepSourceReference(step.source, {
    ...context,
    kind: 'transformStepSource',
    path: `${path}.source`,
    stepId: step.id,
  });

  collectStepOperandReference(step.leftOperand, {
    ...context,
    kind: 'transformStepOperand',
    path: `${path}.leftOperand`,
    stepId: step.id,
  });
  collectStepOperandReference(step.rightOperand, {
    ...context,
    kind: 'transformStepOperand',
    path: `${path}.rightOperand`,
    stepId: step.id,
  });

  collectConditionReference(step.condition, {
    ...context,
    path: `${path}.condition`,
    stepId: step.id,
  });

  step.parts?.forEach((part, partIndex) => {
    collectConcatPartReferences(part, `${path}.parts[${partIndex}]`, {
      ...context,
      stepId: step.id,
    });
  });
}

function collectConcatPartReferences(part: ConcatPart, path: string, context: ReferenceCollectorContext & { stepId?: string }) {
  collectStepSourceReference(part.source, {
    ...context,
    kind: 'concatPartSource',
    path: `${path}.source`,
    partId: part.id,
  });

  part.steps?.forEach((step, stepIndex) => {
    collectTransformStepReferences(step, `${path}.steps[${stepIndex}]`, context);
  });
}

function collectStepSourceReference(
  source: StepSource | undefined,
  options: ReferenceCollectorContext & {
    kind: SettingsColumnReference['kind'];
    path: string;
    stepId?: string;
    partId?: string;
  },
) {
  if (source?.type !== 'input') {
    return;
  }

  addInputReference(options, source.inputColumnId, {
    kind: options.kind,
    path: options.path,
    outputColumnId: options.outputColumnId,
    stepId: options.stepId,
    partId: options.partId,
  });
}

function collectStepOperandReference(
  operand: StepOperand | undefined,
  options: ReferenceCollectorContext & {
    kind: SettingsColumnReference['kind'];
    path: string;
    stepId?: string;
  },
) {
  if (operand?.type !== 'input') {
    return;
  }

  addInputReference(options, operand.inputColumnId, {
    kind: options.kind,
    path: options.path,
    outputColumnId: options.outputColumnId,
    stepId: options.stepId,
  });
}

function collectConditionReference(
  condition: TransformCondition | undefined,
  options: ReferenceCollectorContext & {
    path: string;
    stepId?: string;
  },
) {
  if (!condition?.columnId) {
    return;
  }

  options.references.push({
    columnId: condition.columnId,
    target: condition.target,
    kind: 'condition',
    path: options.path,
    outputColumnId: options.outputColumnId,
    stepId: options.stepId,
  });
}

function addInputReference(
  context: ReferenceCollectorContext,
  columnId: string | undefined,
  reference: Omit<SettingsColumnReference, 'columnId' | 'target'>,
) {
  if (!columnId) {
    return;
  }

  context.references.push({
    columnId,
    target: 'input',
    ...reference,
  });
}

function buildReferencesSummary(references: SettingsColumnReference[]): SettingsReferencesSummary {
  return {
    inputColumnIds: uniqueSortedColumnIds(references, 'input'),
    outputColumnIds: uniqueSortedColumnIds(references, 'output'),
    references,
    referencesByColumnId: groupReferencesByColumnId(references),
  };
}

function uniqueSortedColumnIds(references: SettingsColumnReference[], target: SettingsColumnReference['target']) {
  return Array.from(new Set(
    references
      .filter((reference) => reference.target === target)
      .map((reference) => reference.columnId)
      .filter(Boolean),
  )).sort((left, right) => left.localeCompare(right));
}
