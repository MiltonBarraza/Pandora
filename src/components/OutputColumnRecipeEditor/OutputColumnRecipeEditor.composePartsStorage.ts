import type { OutputRecipe, RecipePart } from '../../types/import';
import { getConfiguredConcatStep } from './OutputColumnRecipeEditor.displayHelpers';
import { getConcatPartFromRecipePart } from './OutputColumnRecipeEditor.recipeHelpers';

type CombineRecipe = Extract<OutputRecipe, { type: 'combine' }>;

export type ComposeRecipePartsStorageMode = 'recipeParts' | 'concatStepParts';

export function getComposeRecipePartsStorageMode(recipe: CombineRecipe): ComposeRecipePartsStorageMode {
  return recipe.parts.length === 0 && getConfiguredConcatStep(recipe) ? 'concatStepParts' : 'recipeParts';
}

export function applyComposeRecipePartsUpdate(recipe: CombineRecipe, parts: RecipePart[]): CombineRecipe {
  const concatStep = getConfiguredConcatStep(recipe);
  if (getComposeRecipePartsStorageMode(recipe) === 'concatStepParts' && concatStep) {
    return {
      ...recipe,
      customMode: 'concat',
      steps: (recipe.steps ?? []).map((step) => step.id === concatStep.id
        ? { ...step, parts: parts.map(getConcatPartFromRecipePart) }
        : step),
    };
  }

  return {
    ...recipe,
    customMode: 'concat',
    parts,
    separator: recipe.separator ?? '',
  };
}
