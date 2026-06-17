import { parseStartRowInputWhileEditing } from './numberInput';
import { getInputColumnLabel } from './inputColumnLabels';
import type {
  InputColumn,
  InputRow,
  ManualRangeCondition,
  ManualRangeValue,
  ManualRangeValueSource,
  OutputRecipe,
  RangeValueRecipe,
  RangeValueSource,
  TransformStep,
} from '../../types/import';

export type ManualRangeValueSourceType = ManualRangeValueSource['type'] | 'input';
export type ManualRangeGenerationMode = 'untilNextText' | 'singleRow';

export type ManualRangeGenerationConfig = {
  inputColumnId: string;
  startRowNumber: number;
  endRowNumber: number;
  mode: ManualRangeGenerationMode;
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
  const rowNumber = Math.max(1, index + 1);
  return {
    id: crypto.randomUUID(),
    startRowNumber: rowNumber,
    endRowNumber: rowNumber,
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

export function hasOverlappingManualRanges(ranges: ManualRangeValue[]) {
  return ranges.some((range, index) => {
    if (hasInvalidManualRange(range)) {
      return false;
    }

    return ranges.slice(0, index).some((previousRange) => (
      !hasInvalidManualRange(previousRange) &&
      range.startRowNumber <= previousRange.endRowNumber &&
      previousRange.startRowNumber <= range.endRowNumber
    ));
  });
}

export function addManualRangeValue(recipe: Extract<OutputRecipe, { type: 'manualRange' }>): Extract<OutputRecipe, { type: 'manualRange' }> {
  return {
    ...recipe,
    ranges: [...recipe.ranges, createDefaultManualRangeValue(recipe.ranges.length)],
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
          valueRecipe: { source, steps: [] },
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
          valueRecipe: { source, steps: [] },
          valueSource: source,
        };
      }

      const source = { type: 'fixedText' as const, value: getManualRangeFixedTextValue(range) };
      return {
        ...nextRange,
        valueRecipe: { source, steps: [] },
        valueSource: source,
      };
    }),
  };
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
          steps: [],
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
        valueRecipe: { source, steps: [] },
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
        valueRecipe: { source, steps: [] },
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
  const { inputColumnId, startRowNumber, endRowNumber, mode, idFactory = () => crypto.randomUUID() } = config;

  if (!inputColumnId || !isValidManualRangeNumber(startRowNumber) || !isValidManualRangeNumber(endRowNumber) || endRowNumber < startRowNumber) {
    return [];
  }

  const foundTexts = rows
    .filter((row) => row.rowNumber >= startRowNumber && row.rowNumber <= endRowNumber)
    .map((row) => ({
      rowNumber: row.rowNumber,
      text: String(row.values[inputColumnId] ?? '').trim(),
    }))
    .filter((row) => row.text)
    .sort((left, right) => left.rowNumber - right.rowNumber);

  return foundTexts.map((row, index) => {
    const nextTextRowNumber = foundTexts[index + 1]?.rowNumber;
    const rangeEndRowNumber = mode === 'singleRow'
      ? row.rowNumber
      : Math.min(endRowNumber, nextTextRowNumber ? nextTextRowNumber - 1 : endRowNumber);

    return {
      id: idFactory(),
      startRowNumber: row.rowNumber,
      endRowNumber: rangeEndRowNumber,
      valueRecipe: {
        source: {
          type: 'rangeText',
          inputColumnId,
          selectedText: row.text,
        },
        steps: [],
      },
      valueSource: {
        type: 'rangeText',
        inputColumnId,
        selectedText: row.text,
      },
    };
  });
}

export function getManualRangeSelectedTextOptions(
  rows: InputRow[],
  range: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>,
  source: Extract<ManualRangeValueSource, { type: 'rangeText' }>,
) {
  const options = getManualRangeTextOptions(rows, range, source.inputColumnId);
  const selectedText = source.selectedText.trim();
  return selectedText && !options.includes(selectedText) ? [selectedText, ...options] : options;
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
