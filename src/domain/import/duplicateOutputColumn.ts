import type { ConcatPart, OutputColumn, OutputRecipe, RecipePart, TransformStep } from '../../types/import';

export function duplicateOutputColumn(column: OutputColumn): OutputColumn {
  return {
    id: crypto.randomUUID(),
    label: `${column.label || 'Sin nombre'} copia`,
    order: column.order,
    enabled: true,
    recipe: cloneRecipeWithNewIds(column.recipe),
  };
}

function cloneRecipeWithNewIds(recipe: OutputRecipe): OutputRecipe {
  if (recipe.type === 'combine') {
    return {
      ...recipe,
      parts: recipe.parts.map(clonePartWithNewIds),
      steps: cloneStepsWithNewIds(recipe.steps),
    };
  }

  if ('steps' in recipe) {
    return {
      ...recipe,
      steps: cloneStepsWithNewIds(recipe.steps),
    };
  }

  return { ...recipe };
}

function clonePartWithNewIds(part: RecipePart): RecipePart {
  if (part.type === 'input') {
    return {
      ...part,
      id: crypto.randomUUID(),
      steps: cloneStepsWithNewIds(part.steps),
    };
  }

  return {
    ...part,
    id: crypto.randomUUID(),
    steps: cloneStepsWithNewIds(part.steps),
  };
}

function cloneStepsWithNewIds(steps?: TransformStep[]): TransformStep[] | undefined {
  return steps?.map((step) => ({
    ...step,
    id: crypto.randomUUID(),
    source: step.source ? { ...step.source } : undefined,
    leftOperand: step.leftOperand ? { ...step.leftOperand } : undefined,
    rightOperand: step.rightOperand ? { ...step.rightOperand } : undefined,
    parts: cloneConcatPartsWithNewIds(step.parts),
    condition: step.condition ? { ...step.condition } : undefined,
  }));
}

function cloneConcatPartsWithNewIds(parts?: ConcatPart[]): ConcatPart[] | undefined {
  return parts?.map((part) => ({
    ...part,
    id: crypto.randomUUID(),
    source: { ...part.source },
    steps: cloneStepsWithNewIds(part.steps),
  }));
}
