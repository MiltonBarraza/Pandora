import { parseStartRowInputWhileEditing } from './numberInput';
import { getInputColumnLabel } from './inputColumnLabels';
import { evaluateTextCondition } from './evaluateCondition';
import type {
  InputColumn,
  InputRow,
  ManualRangeCondition,
  ManualRangeValue,
  ManualRangeValueSource,
  OutputRecipe,
  RangeValueRecipe,
  RangeValueSource,
  StepSource,
  TransformStep,
} from '../../types/import';

export type ManualRangeValueSourceType = ManualRangeValueSource['type'] | 'input';
export type ManualRangeInitialValueMode = 'empty' | 'detectedText' | 'firstValueInColumn' | 'lastValueInColumn';
export type ManualRangeStartFilter = {
  inputColumnId: string;
  operator: 'isEmpty' | 'isNotEmpty';
};

export type ManualRangeGenerationConfig = {
  inputColumnId: string;
  startRowNumber: number;
  endRowNumber: number;
  initialValueMode?: ManualRangeInitialValueMode;
  initialValueColumnId?: string;
  validRowsColumnId?: string;
  trailingRowCount?: number;
  startFilter?: ManualRangeStartFilter;
  idFactory?: () => string;
};

export type ManualRangeBlockGenerationConfig = {
  dataColumnId: string;
  startRowNumber: number;
  endRowNumber: number;
  initialValueMode?: ManualRangeInitialValueMode;
  initialValueColumnId?: string;
  trailingRowCount?: number;
  idFactory?: () => string;
};

export const manualRangeValueSourceOptions: Array<{ value: ManualRangeValueSourceType; label: string }> = [
  { value: 'fixedText', label: 'Texto fijo' },
  { value: 'rangeText', label: 'Texto encontrado en el rango' },
  { value: 'input', label: 'Columna de entrada' },
];

export function createManualRangeRecipe(): Extract<OutputRecipe, { type: 'manualRange' }> {
  return {
    type: 'manualRange',
    ranges: [],
  };
}

export function manualRangeStepToRecipe(step: TransformStep): Extract<OutputRecipe, { type: 'manualRange' }> {
  return {
    type: 'manualRange',
    ranges: step.ranges ?? [],
    ...(step.manualRangeCondition ? { condition: step.manualRangeCondition } : {}),
  };
}

export function manualRangeRecipeToStepPatch(recipe: Extract<OutputRecipe, { type: 'manualRange' }>): Partial<TransformStep> {
  return {
    ranges: recipe.ranges,
    manualRangeCondition: recipe.condition,
  };
}

export function createDefaultManualRangeValue(index: number): ManualRangeValue {
  void index;
  return {
    id: crypto.randomUUID(),
    startRowNumber: 0,
    endRowNumber: 0,
    valueRecipe: { source: { type: 'fixedText', value: '' }, steps: [] },
    valueSource: { type: 'fixedText', value: '' },
  };
}

export function getManualRangeRowCount(range: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>) {
  if (!isValidManualRangeNumber(range.startRowNumber) || !isValidManualRangeNumber(range.endRowNumber)) {
    return '';
  }

  if (range.endRowNumber < range.startRowNumber) {
    return '';
  }

  return String(range.endRowNumber - range.startRowNumber + 1);
}

export function getManualRangeRowCountFromInputs(startRowInput: string, endRowInput: string) {
  const startRowNumber = parseManualRangeRowInput(startRowInput);
  const endRowNumber = parseManualRangeRowInput(endRowInput);
  if (startRowNumber === undefined || endRowNumber === undefined) {
    return '';
  }

  return getManualRangeRowCount({ startRowNumber, endRowNumber });
}

export function parseManualRangeRowInput(value: string) {
  return parseStartRowInputWhileEditing(value);
}

export function hasInvalidManualRange(range: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>) {
  return getManualRangeRowCount(range) === '';
}

export function manualRangesOverlap(
  left: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>,
  right: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>,
) {
  if (hasInvalidManualRange(left) || hasInvalidManualRange(right)) {
    return false;
  }

  const normalizedLeft = normalizeManualRangeBounds(left);
  const normalizedRight = normalizeManualRangeBounds(right);
  return normalizedLeft.startRowNumber <= normalizedRight.endRowNumber
    && normalizedRight.startRowNumber <= normalizedLeft.endRowNumber;
}

export function findOverlappingManualRange(
  candidate: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>,
  ranges: ManualRangeValue[],
  ignoreRangeId?: string,
) {
  if (hasInvalidManualRange(candidate)) {
    return null;
  }

  return ranges.find((range) => range.id !== ignoreRangeId && manualRangesOverlap(candidate, range)) ?? null;
}

export function hasOverlappingManualRanges(ranges: ManualRangeValue[]) {
  return ranges.some((range, index) => {
    return findOverlappingManualRange(range, ranges.slice(0, index)) !== null;
  });
}

export function addManualRangeValue(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  position: 'start' | 'end' = 'end',
): Extract<OutputRecipe, { type: 'manualRange' }> {
  const nextRange = createDefaultManualRangeValue(recipe.ranges.length);
  return {
    ...recipe,
    ranges: position === 'start' ? [nextRange, ...recipe.ranges] : [...recipe.ranges, nextRange],
  };
}

export function duplicateManualRangeValue(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rangeId: string,
): Extract<OutputRecipe, { type: 'manualRange' }> {
  const rangeIndex = recipe.ranges.findIndex((range) => range.id === rangeId);
  if (rangeIndex < 0) {
    return recipe;
  }

  const range = recipe.ranges[rangeIndex];
  const duplicatedRange: ManualRangeValue = {
    ...range,
    id: crypto.randomUUID(),
    valueRecipe: cloneRangeValueRecipe(range.valueRecipe),
    valueSource: range.valueSource ? { ...range.valueSource } : undefined,
  };

  return {
    ...recipe,
    ranges: [
      ...recipe.ranges.slice(0, rangeIndex + 1),
      duplicatedRange,
      ...recipe.ranges.slice(rangeIndex + 1),
    ],
  };
}

export function sortManualRangesByStart(recipe: Extract<OutputRecipe, { type: 'manualRange' }>): Extract<OutputRecipe, { type: 'manualRange' }> {
  return {
    ...recipe,
    ranges: [...recipe.ranges].sort((left, right) => (
      left.startRowNumber - right.startRowNumber
      || left.endRowNumber - right.endRowNumber
    )),
  };
}

export function updateManualRangeValue(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rangeId: string,
  patch: Partial<ManualRangeValue>,
): Extract<OutputRecipe, { type: 'manualRange' }> {
  return {
    ...recipe,
    ranges: recipe.ranges.map((range) => (range.id === rangeId ? { ...range, ...sanitizeManualRangePatch(patch) } : range)),
  };
}

export function getManualRangeFixedTextValue(range: ManualRangeValue) {
  if (range.valueRecipe?.source.type === 'fixedText') {
    return range.valueRecipe.source.value;
  }

  if (range.valueSource?.type === 'fixedText') {
    return range.valueSource.value;
  }

  return range.value ?? '';
}

export function getManualRangeReferenceText(range: ManualRangeValue) {
  const source = getManualRangeValueRecipeSource(range);
  const sourceText = getRangeReferenceSourceText(source);
  if (source.type === 'rangeText') {
    if (sourceText) {
      return sourceText;
    }
  }

  if (source.type === 'fixedText') {
    if (sourceText) {
      return sourceText;
    }
  }

  const concatStep = range.valueRecipe?.steps?.find((step) => step.type === 'concat');
  if (concatStep?.parts?.length) {
    let concatText = '';
    concatStep.parts.forEach((part) => {
      const partText = part.source.type === 'previousResult'
        ? sourceText
        : getRangeReferenceSourceText(part.source);
      if (!partText) {
        return;
      }
      concatText += `${concatText ? part.separatorBefore ?? '' : ''}${partText}`;
    });
    if (concatText.trim()) {
      return concatText.trim();
    }
    return 'Valor concatenado';
  }

  return range.suggestedFromText?.trim() ?? '';
}

function getRangeReferenceSourceText(source: StepSource) {
  if (source.type === 'rangeText') {
    return source.selectedText.trim();
  }
  if (source.type === 'fixedText') {
    return source.value.trim();
  }
  return '';
}

export function getManualRangeValueSourceType(range: ManualRangeValue): ManualRangeValueSourceType {
  if (range.valueRecipe?.source.type === 'fixedText' || range.valueRecipe?.source.type === 'rangeText' || range.valueRecipe?.source.type === 'input') {
    return range.valueRecipe.source.type;
  }

  return range.valueSource?.type ?? 'fixedText';
}

export function getManualRangeInputSource(range: ManualRangeValue): Extract<RangeValueSource, { type: 'input' }> {
  return range.valueRecipe?.source.type === 'input'
    ? range.valueRecipe.source
    : { type: 'input', inputColumnId: '' };
}

export function getManualRangeRangeTextSource(range: ManualRangeValue): Extract<ManualRangeValueSource, { type: 'rangeText' }> {
  if (range.valueRecipe?.source.type === 'rangeText') {
    return range.valueRecipe.source;
  }

  return range.valueSource?.type === 'rangeText'
    ? range.valueSource
    : { type: 'rangeText', inputColumnId: '', selectedText: '' };
}

export function getManualRangeValueRecipeSource(range: ManualRangeValue): RangeValueSource {
  if (range.valueRecipe?.source) {
    return range.valueRecipe.source;
  }

  if (range.valueSource?.type === 'rangeText') {
    return range.valueSource;
  }

  return { type: 'fixedText', value: getManualRangeFixedTextValue(range) };
}

export function updateManualRangeValueSourceType(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rangeId: string,
  type: ManualRangeValueSourceType,
  inputColumns: InputColumn[] = [],
): Extract<OutputRecipe, { type: 'manualRange' }> {
  return {
    ...recipe,
    ranges: recipe.ranges.map((range) => {
      if (range.id !== rangeId) {
        return range;
      }

      const { value: _legacyValue, ...nextRange } = range;
      if (type === 'input') {
        const { valueSource: _valueSource, ...rangeWithoutValueSource } = nextRange;
        const source = {
          type: 'input' as const,
          inputColumnId: getManualRangeInputSource(range).inputColumnId || inputColumns[0]?.id || '',
        };
        return {
          ...rangeWithoutValueSource,
          valueRecipe: { source, steps: range.valueRecipe?.steps ?? [] },
        };
      }

      if (type === 'rangeText') {
        const rangeTextSource = getManualRangeRangeTextSource(range);
        const source = {
          type: 'rangeText' as const,
          inputColumnId: rangeTextSource.inputColumnId || inputColumns[0]?.id || '',
          selectedText: rangeTextSource.selectedText,
        };
        return {
          ...nextRange,
          valueRecipe: { source, steps: range.valueRecipe?.steps ?? [] },
          valueSource: source,
        };
      }

      const source = { type: 'fixedText' as const, value: getManualRangeFixedTextValue(range) };
      return {
        ...nextRange,
        valueRecipe: { source, steps: range.valueRecipe?.steps ?? [] },
        valueSource: source,
      };
    }),
  };
}

export function updateManualRangeValueRecipeSteps(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rangeId: string,
  steps: TransformStep[],
): Extract<OutputRecipe, { type: 'manualRange' }> {
  return {
    ...recipe,
    ranges: recipe.ranges.map((range) => {
      if (range.id !== rangeId) {
        return range;
      }

      return {
        ...range,
        valueRecipe: {
          source: getManualRangeValueRecipeSource(range),
          steps: sanitizeRangeValueRecipeSteps(steps),
        },
      };
    }),
  };
}

export function updateManualRangePrimarySource(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rangeId: string,
  source: StepSource,
  rows: InputRow[] = [],
): Extract<OutputRecipe, { type: 'manualRange' }> {
  if (source.type === 'input') {
    return updateManualRangeInputValue(recipe, rangeId, source.inputColumnId);
  }

  if (source.type === 'rangeText') {
    return reconcileManualRangeTextSelections(
      updateManualRangeRangeTextValue(recipe, rangeId, {
        inputColumnId: source.inputColumnId,
        selectedText: source.selectedText,
      }),
      rangeId,
      rows,
    );
  }

  if (source.type === 'fixedText') {
    return updateManualRangeFixedTextValue(recipe, rangeId, source.value);
  }

  return recipe;
}

export function updateManualRangePrimarySourceAndSteps(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rangeId: string,
  source: StepSource,
  steps: TransformStep[],
  rows: InputRow[] = [],
): Extract<OutputRecipe, { type: 'manualRange' }> {
  return updateManualRangeValueRecipeSteps(
    updateManualRangePrimarySource(recipe, rangeId, source, rows),
    rangeId,
    steps,
  );
}

function sanitizeRangeValueRecipeSteps(steps: TransformStep[]): TransformStep[] {
  return steps
    .filter((step) => step.type !== 'manualRange')
    .map((step) => {
      if (step.type !== 'concat') {
        return step;
      }

      return {
        ...step,
        parts: (step.parts ?? []).map((part) => ({
          ...part,
          steps: (part.steps ?? []).filter((partStep) => partStep.type !== 'manualRange' && partStep.type !== 'concat'),
        })),
      };
    });
}

export function updateManualRangeInputValue(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rangeId: string,
  inputColumnId: string,
): Extract<OutputRecipe, { type: 'manualRange' }> {
  return {
    ...recipe,
    ranges: recipe.ranges.map((range) => {
      if (range.id !== rangeId) {
        return range;
      }

      const { value: _legacyValue, valueSource: _valueSource, ...nextRange } = range;
      return {
        ...nextRange,
        valueRecipe: {
          source: { type: 'input' as const, inputColumnId },
          steps: range.valueRecipe?.steps ?? [],
        },
      };
    }),
  };
}

export function updateManualRangeFixedTextValue(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rangeId: string,
  value: string,
): Extract<OutputRecipe, { type: 'manualRange' }> {
  return {
    ...recipe,
    ranges: recipe.ranges.map((range) => {
      if (range.id !== rangeId) {
        return range;
      }

      const { value: _legacyValue, ...nextRange } = range;
      const source = { type: 'fixedText' as const, value };
      return {
        ...nextRange,
        valueRecipe: { source, steps: range.valueRecipe?.steps ?? [] },
        valueSource: source,
      };
    }),
  };
}

export function updateManualRangeRangeTextValue(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rangeId: string,
  patch: Partial<Extract<ManualRangeValueSource, { type: 'rangeText' }>>,
): Extract<OutputRecipe, { type: 'manualRange' }> {
  return {
    ...recipe,
    ranges: recipe.ranges.map((range) => {
      if (range.id !== rangeId) {
        return range;
      }

      const { value: _legacyValue, ...nextRange } = range;
      const rangeTextSource = getManualRangeRangeTextSource(range);
      const source = {
        ...rangeTextSource,
        ...patch,
        type: 'rangeText' as const,
      };
      return {
        ...nextRange,
        valueRecipe: { source, steps: range.valueRecipe?.steps ?? [] },
        valueSource: source,
      };
    }),
  };
}

export function getManualRangeTextOptions(rows: InputRow[], range: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>, inputColumnId: string) {
  if (!inputColumnId) {
    return [];
  }

  const seen = new Set<string>();
  const options: string[] = [];
  rows.forEach((row) => {
    if (row.rowNumber < range.startRowNumber || row.rowNumber > range.endRowNumber) {
      return;
    }

    const value = String(row.values[inputColumnId] ?? '').trim();
    if (!value || seen.has(value)) {
      return;
    }

    seen.add(value);
    options.push(value);
  });

  return options;
}

export function generateManualRangesFromTexts(rows: InputRow[], config: ManualRangeGenerationConfig): ManualRangeValue[] {
  const { inputColumnId, startRowNumber, endRowNumber, initialValueMode = 'empty', initialValueColumnId, validRowsColumnId, trailingRowCount = 0, startFilter, idFactory = () => crypto.randomUUID() } = config;

  if (!inputColumnId || !isValidManualRangeNumber(startRowNumber) || !isValidManualRangeNumber(endRowNumber) || endRowNumber < startRowNumber) {
    return [];
  }

  const foundTexts = rows
    .filter((row) => row.rowNumber >= startRowNumber && row.rowNumber <= endRowNumber)
    .map((row) => ({
      rowNumber: row.rowNumber,
      text: String(row.values[inputColumnId] ?? '').trim(),
      row,
    }))
    .filter((row) => row.text)
    .filter(({ row }) => matchesManualRangeStartFilter(row, startFilter))
    .map(({ rowNumber, text }) => ({ rowNumber, text }))
    .sort((left, right) => left.rowNumber - right.rowNumber);

  return foundTexts.map((row, index) => {
    const nextTextRowNumber = foundTexts[index + 1]?.rowNumber;
    const naturalEndRowNumber = Math.min(endRowNumber, nextTextRowNumber ? nextTextRowNumber - 1 : endRowNumber);
    const rangeEndRowNumber = getAdjustedManualRangeEndRowNumber(rows, {
      startRowNumber: row.rowNumber,
      endRowNumber: naturalEndRowNumber,
      validRowsColumnId,
    });
    const extendedEndRowNumber = getTrailingAdjustedManualRangeEndRowNumber({
      adjustedEndRowNumber: rangeEndRowNumber,
      naturalEndRowNumber,
      configuredEndRowNumber: endRowNumber,
      trailingRowCount,
    });

    const rangeTextSource = {
      type: 'rangeText' as const,
      inputColumnId,
      selectedText: row.text,
    };
    const source = createGeneratedManualRangeValueSource(rows, {
      startRowNumber: row.rowNumber,
      endRowNumber: extendedEndRowNumber,
      initialValueMode,
      initialValueColumnId,
      rangeTextSource,
    });

    return {
      id: idFactory(),
      startRowNumber: row.rowNumber,
      endRowNumber: extendedEndRowNumber,
      suggestedFromText: row.text,
      valueRecipe: {
        source,
        steps: [],
      },
      valueSource: source,
    };
  });
}

export function generateManualRangesFromDataBlocks(rows: InputRow[], config: ManualRangeBlockGenerationConfig): ManualRangeValue[] {
  const { dataColumnId, startRowNumber, endRowNumber, initialValueMode = 'empty', initialValueColumnId, trailingRowCount = 0, idFactory = () => crypto.randomUUID() } = config;

  if (!dataColumnId || !isValidManualRangeNumber(startRowNumber) || !isValidManualRangeNumber(endRowNumber) || endRowNumber < startRowNumber) {
    return [];
  }

  const sortedRows = rows
    .filter((row) => row.rowNumber >= startRowNumber && row.rowNumber <= endRowNumber)
    .sort((left, right) => left.rowNumber - right.rowNumber);
  const detectedBlocks: Array<{ startRowNumber: number; endRowNumber: number }> = [];
  let blockStartRowNumber: number | null = null;
  let lastUsefulRowNumber: number | null = null;
  let previousRowNumber: number | null = null;

  sortedRows.forEach((row) => {
    if (previousRowNumber !== null && row.rowNumber > previousRowNumber + 1) {
      if (blockStartRowNumber !== null && lastUsefulRowNumber !== null) {
        detectedBlocks.push({
          startRowNumber: blockStartRowNumber,
          endRowNumber: lastUsefulRowNumber,
        });
      }
      blockStartRowNumber = null;
      lastUsefulRowNumber = null;
    }
    previousRowNumber = row.rowNumber;

    const isUsefulRow = Boolean(String(row.values[dataColumnId] ?? '').trim());
    if (isUsefulRow) {
      blockStartRowNumber ??= row.rowNumber;
      lastUsefulRowNumber = row.rowNumber;
      return;
    }

    if (blockStartRowNumber !== null && lastUsefulRowNumber !== null) {
      detectedBlocks.push({
        startRowNumber: blockStartRowNumber,
        endRowNumber: lastUsefulRowNumber,
      });
    }
    blockStartRowNumber = null;
    lastUsefulRowNumber = null;
  });

  if (blockStartRowNumber !== null && lastUsefulRowNumber !== null) {
    detectedBlocks.push({
      startRowNumber: blockStartRowNumber,
      endRowNumber: lastUsefulRowNumber,
    });
  }

  return detectedBlocks.map((block, index) => {
    const nextBlockStartRowNumber = detectedBlocks[index + 1]?.startRowNumber;
    const naturalEndRowNumber = Math.min(endRowNumber, nextBlockStartRowNumber ? nextBlockStartRowNumber - 1 : endRowNumber);
    const extendedEndRowNumber = getTrailingAdjustedManualRangeEndRowNumber({
      adjustedEndRowNumber: block.endRowNumber,
      naturalEndRowNumber,
      configuredEndRowNumber: endRowNumber,
      trailingRowCount,
    });

    return createManualRangeBlockValue(rows, {
      startRowNumber: block.startRowNumber,
      endRowNumber: extendedEndRowNumber,
      initialValueMode,
      initialValueColumnId,
      idFactory,
    });
  });
}

function createManualRangeBlockValue(
  rows: InputRow[],
  config: {
    startRowNumber: number;
    endRowNumber: number;
    initialValueMode: ManualRangeInitialValueMode;
    initialValueColumnId?: string;
    idFactory: () => string;
  },
): ManualRangeValue {
  const { startRowNumber, endRowNumber, initialValueMode, initialValueColumnId, idFactory } = config;
  const source = createGeneratedManualRangeValueSource(rows, {
    startRowNumber,
    endRowNumber,
    initialValueMode,
    initialValueColumnId,
  });

  return {
    id: idFactory(),
    startRowNumber,
    endRowNumber,
    valueRecipe: {
      source,
      steps: [],
    },
    valueSource: source,
  };
}

function createGeneratedManualRangeValueSource(
  rows: InputRow[],
  config: {
    startRowNumber: number;
    endRowNumber: number;
    initialValueMode: ManualRangeInitialValueMode;
    initialValueColumnId?: string;
    rangeTextSource?: Extract<ManualRangeValueSource, { type: 'rangeText' }>;
  },
): ManualRangeValueSource {
  const { startRowNumber, endRowNumber, initialValueMode, initialValueColumnId, rangeTextSource } = config;
  if (initialValueMode === 'detectedText' && rangeTextSource) {
    return rangeTextSource;
  }

  if ((initialValueMode === 'firstValueInColumn' || initialValueMode === 'lastValueInColumn') && initialValueColumnId) {
    const selectedText = findManualRangeBoundaryValue(rows, {
      startRowNumber,
      endRowNumber,
      inputColumnId: initialValueColumnId,
      direction: initialValueMode === 'firstValueInColumn' ? 'first' : 'last',
    });

    return {
      type: 'rangeText',
      inputColumnId: initialValueColumnId,
      selectedText,
    };
  }

  return { type: 'fixedText', value: '' };
}

function findManualRangeBoundaryValue(
  rows: InputRow[],
  config: {
    startRowNumber: number;
    endRowNumber: number;
    inputColumnId: string;
    direction: 'first' | 'last';
  },
) {
  const { startRowNumber, endRowNumber, inputColumnId, direction } = config;
  const rangeRows = rows
    .filter((row) => row.rowNumber >= startRowNumber && row.rowNumber <= endRowNumber)
    .sort((left, right) => left.rowNumber - right.rowNumber);
  const orderedRows = direction === 'first' ? rangeRows : [...rangeRows].reverse();

  for (const row of orderedRows) {
    const value = String(row.values[inputColumnId] ?? '').trim();
    if (value) {
      return value;
    }
  }

  return '';
}

function matchesManualRangeStartFilter(row: InputRow, startFilter: ManualRangeStartFilter | undefined) {
  if (!startFilter?.inputColumnId || !isManualRangeStartFilterOperator(startFilter.operator)) {
    return true;
  }

  return evaluateTextCondition(String(row.values[startFilter.inputColumnId] ?? ''), startFilter.operator);
}

function isManualRangeStartFilterOperator(operator: string): operator is ManualRangeStartFilter['operator'] {
  return operator === 'isEmpty' || operator === 'isNotEmpty';
}

function getAdjustedManualRangeEndRowNumber(
  rows: InputRow[],
  config: { startRowNumber: number; endRowNumber: number; validRowsColumnId?: string },
) {
  const { startRowNumber, endRowNumber, validRowsColumnId } = config;
  if (!validRowsColumnId) {
    return endRowNumber;
  }

  const lastUsefulRow = rows
    .filter((row) => row.rowNumber >= startRowNumber && row.rowNumber <= endRowNumber)
    .filter((row) => String(row.values[validRowsColumnId] ?? '').trim())
    .sort((left, right) => right.rowNumber - left.rowNumber)[0];

  return lastUsefulRow?.rowNumber ?? endRowNumber;
}

function getTrailingAdjustedManualRangeEndRowNumber(config: {
  adjustedEndRowNumber: number;
  naturalEndRowNumber: number;
  configuredEndRowNumber: number;
  trailingRowCount: number;
}) {
  const { adjustedEndRowNumber, naturalEndRowNumber, configuredEndRowNumber, trailingRowCount } = config;
  const normalizedTrailingRowCount = Number.isFinite(trailingRowCount)
    ? Math.max(0, Math.trunc(trailingRowCount))
    : 0;

  if (normalizedTrailingRowCount === 0) {
    return adjustedEndRowNumber;
  }

  return Math.min(
    adjustedEndRowNumber + normalizedTrailingRowCount,
    naturalEndRowNumber,
    configuredEndRowNumber,
  );
}

export function getManualRangeSelectedTextOptions(
  rows: InputRow[],
  range: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>,
  source: Extract<ManualRangeValueSource, { type: 'rangeText' }>,
) {
  return getManualRangeTextOptions(rows, range, source.inputColumnId);
}

export function reconcileManualRangeTextSelections(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rangeId: string,
  rows: InputRow[],
): Extract<OutputRecipe, { type: 'manualRange' }> {
  let recipeChanged = false;
  const ranges = recipe.ranges.map((range) => {
    if (range.id !== rangeId) {
      return range;
    }

    const nextSource = range.valueRecipe
      ? clearInvalidRangeTextSource(range.valueRecipe.source, range, rows)
      : undefined;
    const nextSteps = range.valueRecipe
      ? clearInvalidRangeTextSteps(range.valueRecipe.steps ?? [], range, rows)
      : undefined;
    const nextLegacySource = range.valueSource?.type === 'rangeText'
      ? clearInvalidRangeTextSource(range.valueSource, range, rows)
      : range.valueSource;
    const changed = nextSource !== range.valueRecipe?.source
      || nextSteps !== range.valueRecipe?.steps
      || nextLegacySource !== range.valueSource;
    if (!changed) {
      return range;
    }

    recipeChanged = true;
    return {
      ...range,
      ...(range.valueRecipe ? { valueRecipe: { source: nextSource!, steps: nextSteps } } : {}),
      valueSource: nextLegacySource,
    };
  });

  return recipeChanged ? { ...recipe, ranges } : recipe;
}

function clearInvalidRangeTextSource<TSource extends StepSource>(
  source: TSource,
  range: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>,
  rows: InputRow[],
): TSource {
  if (source.type !== 'rangeText' || !source.selectedText) {
    return source;
  }

  const options = getManualRangeTextOptions(rows, range, source.inputColumnId);
  return options.includes(source.selectedText) ? source : { ...source, selectedText: '' };
}

function clearInvalidRangeTextSteps(
  steps: TransformStep[],
  range: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>,
  rows: InputRow[],
) {
  let stepsChanged = false;
  const nextSteps = steps.map((step) => {
    if (step.type !== 'concat' || !step.parts) {
      return step;
    }

    let partsChanged = false;
    const parts = step.parts.map((part) => {
      const source = clearInvalidRangeTextSource(part.source, range, rows);
      if (source === part.source) {
        return part;
      }
      partsChanged = true;
      return { ...part, source };
    });
    if (!partsChanged) {
      return step;
    }
    stepsChanged = true;
    return { ...step, parts };
  });

  return stepsChanged ? nextSteps : steps;
}

export function getManualRangeRangeTextHelpText(
  rows: InputRow[],
  range: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>,
  source: Extract<ManualRangeValueSource, { type: 'rangeText' }>,
) {
  if (!source.inputColumnId) {
    return 'Elegí una columna para buscar textos.';
  }

  if (getManualRangeTextOptions(rows, range, source.inputColumnId).length === 0) {
    return 'No se encontraron textos en este rango.';
  }

  return '';
}

export function removeManualRangeValue(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rangeId: string,
): Extract<OutputRecipe, { type: 'manualRange' }> {
  return {
    ...recipe,
    ranges: recipe.ranges.filter((range) => range.id !== rangeId),
  };
}

export function updateManualRangeCondition(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  condition: ManualRangeCondition | null,
): Extract<OutputRecipe, { type: 'manualRange' }> {
  if (!condition || !condition.inputColumnId) {
    const { condition: _condition, ...nextRecipe } = recipe;
    return nextRecipe;
  }

  return {
    ...recipe,
    condition,
  };
}

export function getManualRangeCountLabel(recipe: Extract<OutputRecipe, { type: 'manualRange' }>) {
  const count = recipe.ranges.length;
  return `${count} ${count === 1 ? 'rango configurado' : 'rangos configurados'}`;
}

export function describeManualRangeCondition(recipe: Extract<OutputRecipe, { type: 'manualRange' }>, inputColumns: InputColumn[]) {
  if (!recipe.condition) {
    return 'Sin condición';
  }

  const inputColumn = inputColumns.find((column) => column.id === recipe.condition?.inputColumnId);
  const columnLabel = inputColumn ? getInputColumnLabel(inputColumn) : 'Columna de entrada';
  const operatorLabel = recipe.condition.operator === 'isEmpty' ? 'está vacía' : 'no está vacía';
  return `${columnLabel} ${operatorLabel}`;
}

export function describeManualRangeStepSummary(step: TransformStep, inputColumns: InputColumn[] = []) {
  const ranges = step.ranges ?? [];
  const count = ranges.length;
  const parts = [`${count} ${count === 1 ? 'rango' : 'rangos'}`];
  const conditionSummary = describeManualRangeStepCondition(step.manualRangeCondition, inputColumns);
  const valueSummary = describeManualRangeStepValueSource(ranges, inputColumns);
  const rangesSummary = describeManualRangeRanges(ranges);

  if (conditionSummary) {
    parts.push(conditionSummary);
  }

  if (valueSummary) {
    parts.push(valueSummary);
  }

  if (rangesSummary) {
    parts.push(rangesSummary);
  }

  return parts.join(' · ');
}

function describeManualRangeStepCondition(condition: ManualRangeCondition | undefined, inputColumns: InputColumn[]) {
  if (!condition) {
    return '';
  }

  const inputColumn = inputColumns.find((column) => column.id === condition.inputColumnId);
  const columnLabel = inputColumn ? getInputColumnLabel(inputColumn) : 'Columna de entrada';
  const operatorLabel = condition.operator === 'isEmpty' ? 'está vacía' : 'no está vacía';
  return `${columnLabel} ${operatorLabel}`;
}

function describeManualRangeStepValueSource(ranges: ManualRangeValue[], inputColumns: InputColumn[]) {
  if (ranges.length === 0) {
    return '';
  }

  const hasTransforms = ranges.some((range) => (range.valueRecipe?.steps ?? []).length > 0);
  if (hasTransforms) {
    return 'valor personalizado';
  }

  const sourceKinds = new Set(ranges.map(getManualRangeValueSourceType));
  if (sourceKinds.size > 1) {
    return 'valores mixtos';
  }

  const [sourceKind] = Array.from(sourceKinds);
  if (sourceKind === 'rangeText' || sourceKind === 'input') {
    const inputColumnIds = new Set(ranges.map((range) => (
      sourceKind === 'input'
        ? getManualRangeInputSource(range).inputColumnId
        : getManualRangeRangeTextSource(range).inputColumnId
    )));
    if (inputColumnIds.size !== 1) {
      return 'valores mixtos';
    }

    const [inputColumnId] = Array.from(inputColumnIds);
    const inputColumn = inputColumns.find((column) => column.id === inputColumnId);
    return `valores desde ${inputColumn ? getInputColumnLabel(inputColumn) : 'Columna de entrada'}`;
  }

  return 'texto fijo';
}

function describeManualRangeRanges(ranges: ManualRangeValue[]) {
  if (ranges.length === 0) {
    return '';
  }

  const visibleRanges = ranges.slice(0, 3).map((range) => `${range.startRowNumber}-${range.endRowNumber}`);
  return `${visibleRanges.join(', ')}${ranges.length > visibleRanges.length ? '…' : ''}`;
}

function normalizeManualRangeBounds(range: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>) {
  return {
    startRowNumber: Math.min(range.startRowNumber, range.endRowNumber),
    endRowNumber: Math.max(range.startRowNumber, range.endRowNumber),
  };
}

function sanitizeManualRangePatch(patch: Partial<ManualRangeValue>): Partial<ManualRangeValue> {
  return {
    ...patch,
    ...(patch.startRowNumber !== undefined ? { startRowNumber: sanitizeManualRangeNumber(patch.startRowNumber) } : {}),
    ...(patch.endRowNumber !== undefined ? { endRowNumber: sanitizeManualRangeNumber(patch.endRowNumber) } : {}),
  };
}

function sanitizeManualRangeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1;
}

function cloneRangeValueRecipe(recipe: RangeValueRecipe | undefined) {
  return recipe ? JSON.parse(JSON.stringify(recipe)) as RangeValueRecipe : undefined;
}

function isValidManualRangeNumber(value: number) {
  return Number.isInteger(value) && value > 0;
}
