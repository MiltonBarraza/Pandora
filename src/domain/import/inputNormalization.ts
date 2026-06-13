import type { InputColumn, InputNormalizationCondition, InputNormalizationRule, RangeGroupInputNormalizationRule, RangeValueInputNormalizationRule, RawRow } from '../../types/import';
import { isVirtualInputColumnId } from './inputColumnLabels';

export type InputNormalizationRuleImpact = {
  ruleId: string;
  columnId: string;
  completedCellCount: number;
  enabled: boolean;
};

export type InputFillDownRange = {
  value: string;
  startRowNumber: number;
  endRowNumber: number;
  filledCount: number;
  sourceRowNumber: number;
};

export type InputRangeGroupRange = {
  value: string;
  startRowNumber: number;
  endRowNumber: number;
  appliedCount: number;
  sourceRowNumber: number;
};

export type InputRangeValueRange = {
  value: string;
  startRowNumber: number;
  endRowNumber: number;
  appliedCount: number;
  sourceRowNumber: number;
};

export function applyInputNormalizationRules(
  rawRows: RawRow[],
  rules: InputNormalizationRule[] = [],
  inputColumns: InputColumn[],
): RawRow[] {
  const sourceRows = cloneRows(rawRows);

  return rules.reduce(
    (normalizedRows, rule) => applyInputNormalizationRule(sourceRows, normalizedRows, rule, inputColumns),
    cloneRows(rawRows),
  );
}

function applyInputNormalizationRule(sourceRows: RawRow[], normalizedRows: RawRow[], rule: InputNormalizationRule, inputColumns: InputColumn[]): RawRow[] {
  if (!rule.enabled) {
    return normalizedRows;
  }

  if (rule.type === 'fillDown') {
    const columnIndex = inputColumns.find((column) => column.id === rule.columnId)?.columnIndex;
    return typeof columnIndex === 'number' ? applyFillDownRule(normalizedRows, columnIndex) : normalizedRows;
  }

  if (rule.type === 'rangeGroup') {
    const indexes = getRangeGroupColumnIndexes(rule, inputColumns);
    return indexes ? applyRangeGroupRule(sourceRows, rule, indexes, normalizedRows) : normalizedRows;
  }

  if (rule.type === 'rangeValue') {
    const indexes = getRangeValueColumnIndexes(rule, inputColumns);
    return indexes ? applyRangeValueRule(sourceRows, rule, indexes, normalizedRows) : normalizedRows;
  }

  return normalizedRows;
}

export function applyFillDownRule(rawRows: RawRow[], columnIndex: number): RawRow[] {
  let lastValue: unknown;

  return rawRows.map((row) => {
    const nextRow = cloneRowWithProperties(row);
    const currentValue = nextRow[columnIndex];

    if (isEmptyCell(currentValue)) {
      if (lastValue !== undefined) {
        nextRow[columnIndex] = lastValue;
      }
      return nextRow;
    }

    lastValue = currentValue;
    return nextRow;
  });
}

export function getInputNormalizationRuleImpacts(
  rawRows: RawRow[],
  rules: InputNormalizationRule[] = [],
  inputColumns: InputColumn[],
  headerRowIndex: number | null = null,
): InputNormalizationRuleImpact[] {
  const normalizationStartRowIndex = getInputNormalizationStartRowIndex(headerRowIndex);
  const rowsToNormalize = rawRows.slice(normalizationStartRowIndex);

  return rules.map((rule) => {
    const columnId = getNormalizationRulePrimaryColumnId(rule);
    const columnIndex = inputColumns.find((column) => column.id === columnId)?.columnIndex;
    return {
      ruleId: rule.id,
      columnId,
      enabled: rule.enabled,
      completedCellCount: getRuleCompletedCellCount({
        rowsToNormalize,
        rule,
        inputColumns,
        columnIndex,
      }),
    };
  });
}

export function getInputNormalizationRuleRanges(
  rawRows: RawRow[],
  rules: InputNormalizationRule[] = [],
  inputColumns: InputColumn[],
  headerRowIndex: number | null = null,
  rowNumberByIndex?: number[],
) {
  return rules.map((rule) => {
    const columnId = getNormalizationRulePrimaryColumnId(rule);
    const columnIndex = inputColumns.find((column) => column.id === columnId)?.columnIndex;
    return {
      ruleId: rule.id,
      columnId,
      enabled: rule.enabled,
      ranges: getRuleRanges({ rawRows, rule, inputColumns, columnIndex, headerRowIndex, rowNumberByIndex }),
    };
  });
}

export function getInputNormalizationStartRowIndex(headerRowIndex: number | null = null) {
  return headerRowIndex === null ? 0 : headerRowIndex + 1;
}

export function countFillDownCompletedCells(rawRows: RawRow[], columnIndex: number) {
  let lastValue: unknown;
  let completedCellCount = 0;

  rawRows.forEach((row) => {
    const currentValue = row[columnIndex];
    if (isEmptyCell(currentValue)) {
      if (lastValue !== undefined) {
        completedCellCount += 1;
      }
      return;
    }

    lastValue = currentValue;
  });

  return completedCellCount;
}

export function getFillDownRanges(
  rawRows: RawRow[],
  columnIndex: number,
  headerRowIndex: number | null = null,
  rowNumberByIndex?: number[],
): InputFillDownRange[] {
  const normalizationStartRowIndex = getInputNormalizationStartRowIndex(headerRowIndex);
  const ranges: InputFillDownRange[] = [];
  let currentRange: InputFillDownRange | null = null;

  rawRows.slice(normalizationStartRowIndex).forEach((row, offset) => {
    const rawRowIndex = normalizationStartRowIndex + offset;
    const rowNumber = rowNumberByIndex?.[rawRowIndex] ?? rawRowIndex + 1;
    const currentValue = row[columnIndex];

    if (isEmptyCell(currentValue)) {
      if (currentRange) {
        currentRange.endRowNumber = rowNumber;
        currentRange.filledCount += 1;
      }
      return;
    }

    currentRange = {
      value: String(currentValue ?? '').trim(),
      startRowNumber: rowNumber,
      endRowNumber: rowNumber,
      filledCount: 0,
      sourceRowNumber: rowNumber,
    };
    ranges.push(currentRange);
  });

  return ranges;
}

export function applyRangeGroupRule(
  rawRows: RawRow[],
  rule: RangeGroupInputNormalizationRule,
  indexes: RangeGroupColumnIndexes,
  targetRows: RawRow[] = rawRows,
): RawRow[] {
  let currentGroup: unknown;

  // Range rules read the original Excel structure and write only their normalized target.
  return rawRows.map((row, rowIndex) => {
    const nextRow = cloneRowWithProperties(targetRows[rowIndex]);
    const groupValue = row[indexes.groupColumnIndex];

    if (!isEmptyCell(groupValue) && matchesCondition(row, indexes.groupStartConditionColumnIndex, rule.groupStartCondition)) {
      currentGroup = groupValue;
    }

    if (matchesCondition(row, indexes.applyToRowConditionColumnIndex, rule.applyToRowCondition)) {
      writeRangeTargetValue(nextRow, indexes, currentGroup ?? '');
    } else {
      writeRangeTargetValue(nextRow, indexes, '');
    }

    return nextRow;
  });
}

export function countRangeGroupAppliedRows(
  rawRows: RawRow[],
  rule: RangeGroupInputNormalizationRule,
  indexes: RangeGroupColumnIndexes,
) {
  let currentGroup: unknown;
  let appliedCount = 0;

  rawRows.forEach((row) => {
    const groupValue = row[indexes.groupColumnIndex];

    if (!isEmptyCell(groupValue) && matchesCondition(row, indexes.groupStartConditionColumnIndex, rule.groupStartCondition)) {
      currentGroup = groupValue;
    }

    if (currentGroup !== undefined && matchesCondition(row, indexes.applyToRowConditionColumnIndex, rule.applyToRowCondition)) {
      appliedCount += 1;
    }
  });

  return appliedCount;
}

export function getRangeGroupRanges(
  rawRows: RawRow[],
  rule: RangeGroupInputNormalizationRule,
  indexes: RangeGroupColumnIndexes,
  headerRowIndex: number | null = null,
  rowNumberByIndex?: number[],
): InputRangeGroupRange[] {
  const normalizationStartRowIndex = getInputNormalizationStartRowIndex(headerRowIndex);
  const ranges: InputRangeGroupRange[] = [];
  let currentRange: InputRangeGroupRange | null = null;

  rawRows.slice(normalizationStartRowIndex).forEach((row, offset) => {
    const rawRowIndex = normalizationStartRowIndex + offset;
    const rowNumber = rowNumberByIndex?.[rawRowIndex] ?? rawRowIndex + 1;
    const groupValue = row[indexes.groupColumnIndex];

    if (!isEmptyCell(groupValue) && matchesCondition(row, indexes.groupStartConditionColumnIndex, rule.groupStartCondition)) {
      currentRange = {
        value: String(groupValue ?? '').trim(),
        startRowNumber: rowNumber,
        endRowNumber: rowNumber,
        appliedCount: 0,
        sourceRowNumber: rowNumber,
      };
      ranges.push(currentRange);
    }

    if (currentRange && matchesCondition(row, indexes.applyToRowConditionColumnIndex, rule.applyToRowCondition)) {
      currentRange.endRowNumber = rowNumber;
      currentRange.appliedCount += 1;
    }
  });

  return ranges;
}

export function applyRangeValueRule(
  rawRows: RawRow[],
  rule: RangeValueInputNormalizationRule,
  indexes: RangeValueColumnIndexes,
  targetRows: RawRow[] = rawRows,
): RawRow[] {
  if (getRangeValueApplyMode(rule) === 'allRowsInRange') {
    return applyRangeValueRuleToAllRowsInRange(rawRows, rule, indexes, targetRows);
  }

  let currentValue: unknown;

  // Range rules read the original Excel structure and write only their normalized target.
  return rawRows.map((row, rowIndex) => {
    const nextRow = cloneRowWithProperties(targetRows[rowIndex]);
    const value = row[indexes.valueColumnIndex];
    const canCaptureOrApply = matchesCondition(row, indexes.captureConditionColumnIndex, rule.captureCondition);

    if (!isEmptyCell(value)) {
      currentValue = canCaptureOrApply ? value : undefined;
    }

    if (canCaptureOrApply) {
      writeRangeTargetValue(nextRow, indexes, currentValue ?? '');
    } else {
      writeRangeTargetValue(nextRow, indexes, '');
    }

    return nextRow;
  });
}

export function countRangeValueAppliedRows(
  rawRows: RawRow[],
  rule: RangeValueInputNormalizationRule,
  indexes: RangeValueColumnIndexes,
) {
  if (getRangeValueApplyMode(rule) === 'allRowsInRange') {
    return getAllRowsInRangeValueSegments(rawRows, rule, indexes).reduce((total, segment) => total + segment.rowIndexes.length, 0);
  }

  let currentValue: unknown;
  let appliedCount = 0;

  rawRows.forEach((row) => {
    const value = row[indexes.valueColumnIndex];
    const canCaptureOrApply = matchesCondition(row, indexes.captureConditionColumnIndex, rule.captureCondition);

    if (!isEmptyCell(value)) {
      currentValue = canCaptureOrApply ? value : undefined;
    }

    if (currentValue !== undefined && canCaptureOrApply) {
      appliedCount += 1;
    }
  });

  return appliedCount;
}

export function getRangeValueRanges(
  rawRows: RawRow[],
  rule: RangeValueInputNormalizationRule,
  indexes: RangeValueColumnIndexes,
  headerRowIndex: number | null = null,
  rowNumberByIndex?: number[],
): InputRangeValueRange[] {
  if (getRangeValueApplyMode(rule) === 'allRowsInRange') {
    const normalizationStartRowIndex = getInputNormalizationStartRowIndex(headerRowIndex);
    return getAllRowsInRangeValueSegments(rawRows, rule, indexes, normalizationStartRowIndex)
      .map((segment) => {
        const rowNumbers = segment.rowIndexes.map((rowIndex) => rowNumberByIndex?.[rowIndex] ?? rowIndex + 1);
        const sourceRowNumber = rowNumberByIndex?.[segment.sourceRowIndex] ?? segment.sourceRowIndex + 1;
        return {
          value: String(segment.value ?? '').trim(),
          startRowNumber: Math.min(...rowNumbers),
          endRowNumber: Math.max(...rowNumbers),
          appliedCount: segment.rowIndexes.length,
          sourceRowNumber,
        };
      });
  }

  const normalizationStartRowIndex = getInputNormalizationStartRowIndex(headerRowIndex);
  const ranges: InputRangeValueRange[] = [];
  let currentRange: InputRangeValueRange | null = null;

  rawRows.slice(normalizationStartRowIndex).forEach((row, offset) => {
    const rawRowIndex = normalizationStartRowIndex + offset;
    const rowNumber = rowNumberByIndex?.[rawRowIndex] ?? rawRowIndex + 1;
    const value = row[indexes.valueColumnIndex];
    const canCaptureOrApply = matchesCondition(row, indexes.captureConditionColumnIndex, rule.captureCondition);

    if (!isEmptyCell(value)) {
      currentRange = canCaptureOrApply
        ? {
            value: String(value ?? '').trim(),
            startRowNumber: rowNumber,
            endRowNumber: rowNumber,
            appliedCount: 0,
            sourceRowNumber: rowNumber,
          }
        : null;

      if (currentRange) {
        ranges.push(currentRange);
      }
    }

    if (currentRange && canCaptureOrApply) {
      currentRange.endRowNumber = rowNumber;
      currentRange.appliedCount += 1;
    }
  });

  return ranges;
}

function applyRangeValueRuleToAllRowsInRange(
  rawRows: RawRow[],
  rule: RangeValueInputNormalizationRule,
  indexes: RangeValueColumnIndexes,
  targetRows: RawRow[],
): RawRow[] {
  const nextRows = targetRows.map(cloneRowWithProperties);

  rawRows.forEach((row, rowIndex) => {
    if (!matchesCondition(row, indexes.captureConditionColumnIndex, rule.captureCondition)) {
      writeRangeTargetValue(nextRows[rowIndex], indexes, '');
    }
  });

  getAllRowsInRangeValueSegments(rawRows, rule, indexes).forEach((segment) => {
    segment.rowIndexes.forEach((rowIndex) => {
      writeRangeTargetValue(nextRows[rowIndex], indexes, segment.value);
    });
  });

  return nextRows;
}

type AllRowsInRangeValueSegment = {
  value: unknown;
  sourceRowIndex: number;
  rowIndexes: number[];
};

function getAllRowsInRangeValueSegments(
  rawRows: RawRow[],
  rule: RangeValueInputNormalizationRule,
  indexes: RangeValueColumnIndexes,
  startRowIndex = 0,
): AllRowsInRangeValueSegment[] {
  const segments: AllRowsInRangeValueSegment[] = [];
  let currentRowIndexes: number[] = [];
  let currentValue: unknown;
  let currentSourceRowIndex: number | null = null;

  const flush = () => {
    if (currentValue !== undefined && currentSourceRowIndex !== null && currentRowIndexes.length > 0) {
      segments.push({
        value: currentValue,
        sourceRowIndex: currentSourceRowIndex,
        rowIndexes: [...currentRowIndexes],
      });
    }

    currentRowIndexes = [];
    currentValue = undefined;
    currentSourceRowIndex = null;
  };

  rawRows.slice(startRowIndex).forEach((row, offset) => {
    const rowIndex = startRowIndex + offset;
    const value = row[indexes.valueColumnIndex];
    const canCaptureOrApply = matchesCondition(row, indexes.captureConditionColumnIndex, rule.captureCondition);

    if (!canCaptureOrApply && !isEmptyCell(value)) {
      flush();
      return;
    }

    if (!canCaptureOrApply) {
      return;
    }

    currentRowIndexes.push(rowIndex);
    if (!isEmptyCell(value)) {
      currentValue = value;
      currentSourceRowIndex = rowIndex;
    }
  });

  flush();
  return segments;
}

export type RangeGroupColumnIndexes = {
  groupColumnIndex: number;
  groupStartConditionColumnIndex: number;
  applyToRowConditionColumnIndex: number;
  targetColumnId: string;
  targetColumnIndex?: number;
};

export type RangeValueColumnIndexes = {
  valueColumnIndex: number;
  captureConditionColumnIndex: number;
  targetColumnId: string;
  targetColumnIndex?: number;
};

export function getRangeGroupColumnIndexes(rule: RangeGroupInputNormalizationRule, inputColumns: InputColumn[]): RangeGroupColumnIndexes | null {
  const groupColumnIndex = getInputColumnIndex(inputColumns, rule.groupColumnId);
  const groupStartConditionColumnIndex = getInputColumnIndex(inputColumns, rule.groupStartCondition.columnId);
  const applyToRowConditionColumnIndex = getInputColumnIndex(inputColumns, rule.applyToRowCondition.columnId);
  const targetColumnIndex = getInputColumnIndex(inputColumns, rule.targetColumnId);

  if (
    typeof groupColumnIndex !== 'number' ||
    typeof groupStartConditionColumnIndex !== 'number' ||
    typeof applyToRowConditionColumnIndex !== 'number' ||
    !isValidRangeTarget(rule.targetColumnId, targetColumnIndex)
  ) {
    return null;
  }

  return {
    groupColumnIndex,
    groupStartConditionColumnIndex,
    applyToRowConditionColumnIndex,
    targetColumnId: rule.targetColumnId,
    targetColumnIndex,
  };
}

export function getRangeValueColumnIndexes(rule: RangeValueInputNormalizationRule, inputColumns: InputColumn[]): RangeValueColumnIndexes | null {
  const valueColumnIndex = getInputColumnIndex(inputColumns, rule.valueColumnId);
  const captureConditionColumnIndex = getInputColumnIndex(inputColumns, rule.captureCondition.columnId);
  const targetColumnIndex = getInputColumnIndex(inputColumns, rule.targetColumnId);

  if (
    typeof valueColumnIndex !== 'number' ||
    typeof captureConditionColumnIndex !== 'number' ||
    !isValidRangeTarget(rule.targetColumnId, targetColumnIndex)
  ) {
    return null;
  }

  return {
    valueColumnIndex,
    captureConditionColumnIndex,
    targetColumnId: rule.targetColumnId,
    targetColumnIndex,
  };
}

function matchesCondition(row: RawRow, columnIndex: number, condition: InputNormalizationCondition) {
  const isEmpty = isEmptyCell(row[columnIndex]);
  return condition.operator === 'isEmpty' ? isEmpty : !isEmpty;
}

function getRuleCompletedCellCount({
  rowsToNormalize,
  rule,
  inputColumns,
  columnIndex,
}: {
  rowsToNormalize: RawRow[];
  rule: InputNormalizationRule;
  inputColumns: InputColumn[];
  columnIndex: number | undefined;
}) {
  if (!rule.enabled) {
    return 0;
  }

  if (rule.type === 'fillDown') {
    return typeof columnIndex === 'number' ? countFillDownCompletedCells(rowsToNormalize, columnIndex) : 0;
  }

  if (rule.type === 'rangeGroup') {
    const indexes = getRangeGroupColumnIndexes(rule, inputColumns);
    return indexes ? countRangeGroupAppliedRows(rowsToNormalize, rule, indexes) : 0;
  }

  const indexes = getRangeValueColumnIndexes(rule, inputColumns);
  return indexes ? countRangeValueAppliedRows(rowsToNormalize, rule, indexes) : 0;
}

function getRuleRanges({
  rawRows,
  rule,
  inputColumns,
  columnIndex,
  headerRowIndex,
  rowNumberByIndex,
}: {
  rawRows: RawRow[];
  rule: InputNormalizationRule;
  inputColumns: InputColumn[];
  columnIndex: number | undefined;
  headerRowIndex: number | null;
  rowNumberByIndex?: number[];
}) {
  if (!rule.enabled) {
    return [];
  }

  if (rule.type === 'fillDown') {
    return typeof columnIndex === 'number' ? getFillDownRanges(rawRows, columnIndex, headerRowIndex, rowNumberByIndex) : [];
  }

  if (rule.type === 'rangeGroup') {
    const indexes = getRangeGroupColumnIndexes(rule, inputColumns);
    return indexes ? getRangeGroupRanges(rawRows, rule, indexes, headerRowIndex, rowNumberByIndex) : [];
  }

  const indexes = getRangeValueColumnIndexes(rule, inputColumns);
  return indexes ? getRangeValueRanges(rawRows, rule, indexes, headerRowIndex, rowNumberByIndex) : [];
}

function getNormalizationRulePrimaryColumnId(rule: InputNormalizationRule) {
  return rule.type === 'fillDown' ? rule.columnId : rule.targetColumnId;
}

function getRangeValueApplyMode(rule: RangeValueInputNormalizationRule) {
  return rule.applyMode ?? 'matchingRowsOnly';
}

function getInputColumnIndex(inputColumns: InputColumn[], columnId: string) {
  return inputColumns.find((column) => column.id === columnId)?.columnIndex;
}

function isValidRangeTarget(columnId: string, columnIndex: number | undefined) {
  return typeof columnIndex === 'number' || isVirtualInputColumnId(columnId);
}

function writeRangeTargetValue(row: RawRow, indexes: Pick<RangeGroupColumnIndexes, 'targetColumnId' | 'targetColumnIndex'>, value: unknown) {
  if (isVirtualInputColumnId(indexes.targetColumnId)) {
    (row as unknown as Record<string, unknown>)[indexes.targetColumnId] = value;
    return;
  }

  if (typeof indexes.targetColumnIndex === 'number') {
    row[indexes.targetColumnIndex] = value;
  }
}

function cloneRows(rawRows: RawRow[]): RawRow[] {
  return rawRows.map(cloneRowWithProperties);
}

function cloneRowWithProperties(row: RawRow): RawRow {
  return Object.assign([...row], getRawRowObjectProperties(row));
}

function getRawRowObjectProperties(row: RawRow) {
  return Object.fromEntries(
    Object.entries(row as unknown as Record<string, unknown>).filter(([key]) => !isArrayIndexKey(key)),
  );
}

function isArrayIndexKey(key: string) {
  return String(Number(key)) === key && Number.isInteger(Number(key)) && Number(key) >= 0;
}

export function isInputNormalizationEmptyCell(value: unknown) {
  return String(value ?? '').trim() === '';
}

function isEmptyCell(value: unknown) {
  return isInputNormalizationEmptyCell(value);
}
