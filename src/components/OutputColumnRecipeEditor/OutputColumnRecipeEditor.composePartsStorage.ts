import type { ConcatPart, OutputRecipe, RecipePart } from '../../types/import';
import { getConfiguredConcatStep } from './OutputColumnRecipeEditor.displayHelpers';
import { getConcatPartFromRecipePart, getRecipePartFromConcatPart } from './OutputColumnRecipeEditor.recipeHelpers';

type CombineRecipe = Extract<OutputRecipe, { type: 'combine' }>;

export type ComposeRecipePartsStorageMode = 'recipeParts' | 'concatStepParts';

export function getComposeRecipePartsStorageMode(recipe: CombineRecipe): ComposeRecipePartsStorageMode {
  return recipe.parts.length === 0 && getConfiguredConcatStep(recipe) ? 'concatStepParts' : 'recipeParts';
}

export function getComposeRecipePartsFromStorage(recipe: CombineRecipe): RecipePart[] {
  const concatStep = getConfiguredConcatStep(recipe);
  if (recipe.parts.length > 0 || !concatStep?.parts?.length) {
    return recipe.parts;
  }

  return concatStep.parts.map((part) => getRecipePartFromConcatPart(part));
}

export function getComposeConcatPartFromStorage(recipe: CombineRecipe, partId: string): ConcatPart | undefined {
  const concatStep = getConfiguredConcatStep(recipe);
  if (recipe.parts.length === 0 && concatStep?.parts?.length) {
    return concatStep.parts.find((part) => part.id === partId);
  }

  const part = recipe.parts.find((recipePart) => recipePart.id === partId);
  return part ? getConcatPartFromRecipePart(part) : undefined;
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

export function applyComposeConcatPartUpdate(recipe: CombineRecipe, partId: string, nextPart: ConcatPart): CombineRecipe {
  const concatStep = getConfiguredConcatStep(recipe);
  if (recipe.parts.length === 0 && concatStep?.parts?.length) {
    const hasPart = concatStep.parts.some((part) => part.id === partId);
    if (!hasPart) {
      return recipe;
    }

    return {
      ...recipe,
      steps: (recipe.steps ?? []).map((step) => step.id === concatStep.id
        ? { ...step, parts: concatStep.parts?.map((part) => (part.id === partId ? nextPart : part)) }
        : step),
    };
  }

  const currentPart = recipe.parts.find((part) => part.id === partId);
  if (!currentPart) {
    return recipe;
  }

  const nextRecipePart = getRecipePartFromConcatPart(nextPart);
  return applyComposeRecipePartsUpdate(recipe, recipe.parts.map((part) => part.id === partId
    ? { ...nextRecipePart, ...(currentPart.separatorAfter !== undefined ? { separatorAfter: currentPart.separatorAfter } : {}) }
    : part));
}
