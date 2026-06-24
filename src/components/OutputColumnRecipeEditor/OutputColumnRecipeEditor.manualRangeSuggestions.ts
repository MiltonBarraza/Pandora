import type { ManualRangeValue, OutputRecipe } from '../../types/import';
import { hasInvalidManualRange } from '../../domain/import/manualRangeModel';

export type ManualRangeSuggestionsResult = {
  suggestions: ManualRangeValue[];
  duplicateCount: number;
  overlappingCount: number;
};

export function buildManualRangeSuggestions(
  generatedRanges: ManualRangeValue[],
  existingRanges: ManualRangeValue[],
): ManualRangeSuggestionsResult {
  const acceptedRanges = [...existingRanges];

  return generatedRanges.reduce<ManualRangeSuggestionsResult>((result, range) => {
    if (hasInvalidManualRange(range)) {
      return result;
    }

    if (acceptedRanges.some((acceptedRange) => haveSameManualRangeBounds(range, acceptedRange))) {
      return { ...result, duplicateCount: result.duplicateCount + 1 };
    }

    if (acceptedRanges.some((acceptedRange) => doManualRangesOverlap(range, acceptedRange))) {
      return { ...result, overlappingCount: result.overlappingCount + 1 };
    }

    acceptedRanges.push(range);

    return {
      ...result,
      suggestions: [...result.suggestions, range],
    };
  }, { suggestions: [], duplicateCount: 0, overlappingCount: 0 });
}

export function appendManualRangeSuggestion(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  suggestion: ManualRangeValue,
): Extract<OutputRecipe, { type: 'manualRange' }> {
  const result = buildManualRangeSuggestions([suggestion], recipe.ranges);
  if (result.suggestions.length === 0) {
    return recipe;
  }

  return {
    ...recipe,
    ranges: [...recipe.ranges, result.suggestions[0]],
  };
}

export function appendManualRangeSuggestions(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  suggestions: ManualRangeValue[],
): Extract<OutputRecipe, { type: 'manualRange' }> {
  const result = buildManualRangeSuggestions(suggestions, recipe.ranges);
  if (result.suggestions.length === 0) {
    return recipe;
  }

  return {
    ...recipe,
    ranges: [...recipe.ranges, ...result.suggestions],
  };
}

function haveSameManualRangeBounds(left: ManualRangeValue, right: ManualRangeValue) {
  return left.startRowNumber === right.startRowNumber && left.endRowNumber === right.endRowNumber;
}

function doManualRangesOverlap(left: ManualRangeValue, right: ManualRangeValue) {
  if (hasInvalidManualRange(left) || hasInvalidManualRange(right)) {
    return false;
  }

  return left.startRowNumber <= right.endRowNumber && right.startRowNumber <= left.endRowNumber;
}
