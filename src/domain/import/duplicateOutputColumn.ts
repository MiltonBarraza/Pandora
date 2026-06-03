import type { OutputColumn, OutputRecipe, RecipePart, TransformStep } from '../../types/import';

export function duplicateOutputColumn(column: OutputColumn): OutputColumn {
  return {
    ...column,
    id: crypto.randomUUID(),
    label: `${column.label || 'Sin nombre'} copia`,
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

function cloneStepsWithNewIds(steps?: TransformStep[]) {
  return steps?.map((step) => ({
    ...step,
    id: crypto.randomUUID(),
    condition: step.condition ? { ...step.condition } : undefined,
  }));
}
