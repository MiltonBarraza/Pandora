import type { ManualRangeValue, OutputRecipe } from '../../types/import';
import { hasInvalidManualRange } from '../../domain/import/manualRangeModel';

export type ManualRangeOmittedSuggestionReason = 'duplicate' | 'overlapExisting' | 'overlapGenerated';

export type ManualRangeOmittedSuggestion = {
  range: ManualRangeValue;
  reason: ManualRangeOmittedSuggestionReason;
};

export type ManualRangeSuggestionsResult = {
  suggestions: ManualRangeValue[];
  omittedSuggestions: ManualRangeOmittedSuggestion[];
  duplicateCount: number;
  overlappingCount: number;
};

export function buildManualRangeSuggestions(
  generatedRanges: ManualRangeValue[],
  existingRanges: ManualRangeValue[],
): ManualRangeSuggestionsResult {
  const acceptedGeneratedRanges: ManualRangeValue[] = [];

  return generatedRanges.reduce<ManualRangeSuggestionsResult>((result, range) => {
    if (hasInvalidManualRange(range)) {
      return result;
    }

    if (existingRanges.some((existingRange) => haveSameManualRangeBounds(range, existingRange))
      || acceptedGeneratedRanges.some((acceptedRange) => haveSameManualRangeBounds(range, acceptedRange))) {
      return omitManualRangeSuggestion(result, range, 'duplicate');
    }

    if (existingRanges.some((existingRange) => doManualRangesOverlap(range, existingRange))) {
      return omitManualRangeSuggestion(result, range, 'overlapExisting');
    }

    if (acceptedGeneratedRanges.some((acceptedRange) => doManualRangesOverlap(range, acceptedRange))) {
      return omitManualRangeSuggestion(result, range, 'overlapGenerated');
    }

    acceptedGeneratedRanges.push(range);

    return {
      ...result,
      suggestions: [...result.suggestions, range],
    };
  }, { suggestions: [], omittedSuggestions: [], duplicateCount: 0, overlappingCount: 0 });
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

function omitManualRangeSuggestion(
  result: ManualRangeSuggestionsResult,
  range: ManualRangeValue,
  reason: ManualRangeOmittedSuggestionReason,
): ManualRangeSuggestionsResult {
  return {
    ...result,
    omittedSuggestions: [...result.omittedSuggestions, { range, reason }],
    duplicateCount: reason === 'duplicate' ? result.duplicateCount + 1 : result.duplicateCount,
    overlappingCount: reason === 'duplicate' ? result.overlappingCount : result.overlappingCount + 1,
  };
}

function doManualRangesOverlap(left: ManualRangeValue, right: ManualRangeValue) {
  if (hasInvalidManualRange(left) || hasInvalidManualRange(right)) {
    return false;
  }

  return left.startRowNumber <= right.endRowNumber && right.startRowNumber <= left.endRowNumber;
}
