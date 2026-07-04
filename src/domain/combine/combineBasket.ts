import type { CombineSource } from '../../types/combine';
import type { ProcessedExportResult } from '../../types/processedExport';
import { createCombineSourceFromSanitizedResult } from './createCombineSourceFromSanitizedResult';

export function addProcessedResultToCombineBasket(
  currentSources: CombineSource[],
  result: ProcessedExportResult,
) {
  const source = createCombineSourceFromSanitizedResult(result);
  const usedIds = new Set(currentSources.map((current) => current.id));
  const uniqueSource = usedIds.has(source.id)
    ? { ...source, id: getAvailableSourceId(source.id, usedIds) }
    : source;
  return [...currentSources, uniqueSource];
}

export function mergeCombineSources(
  basketSources: CombineSource[],
  uploadedSources: CombineSource[],
) {
  const basketIds = new Set(basketSources.map((source) => source.id));
  return [
    ...basketSources,
    ...uploadedSources.filter((source) => !basketIds.has(source.id)),
  ];
}

export function removeCombineSourceFromCollections({
  sourceId,
  basketSources,
  uploadedSources,
}: {
  sourceId: string;
  basketSources: CombineSource[];
  uploadedSources: CombineSource[];
}) {
  const isBasketSource = basketSources.some((source) => source.id === sourceId);
  return {
    removedBasketSourceId: isBasketSource ? sourceId : null,
    uploadedSources: isBasketSource
      ? uploadedSources
      : uploadedSources.filter((source) => source.id !== sourceId),
  };
}

function getAvailableSourceId(baseId: string, usedIds: Set<string>) {
  let suffix = 2;
  while (usedIds.has(`${baseId}:${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}:${suffix}`;
}
