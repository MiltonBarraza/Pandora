import type { IgnoreRule, IgnoredInputRow, InputColumn, InputRow, OutputColumn, ProcessedRow, RowOverrides } from '../../types/import';
import { getInputColumnLabel } from './inputColumnLabels';

export function normalizeIgnoreRule(rule: IgnoreRule): IgnoreRule {
  return rule;
}

export function applyIgnoreRulesToProcessedRows({
  rows,
  ignoreRules,
  rowOverrides,
  inputColumns,
  outputColumns,
}: {
  rows: ProcessedRow[];
  ignoreRules: IgnoreRule[];
  rowOverrides: RowOverrides;
  inputColumns: InputColumn[];
  outputColumns: OutputColumn[];
}): ProcessedRow[] {
  return applyRowOverridesToProcessedRows(
    applyOutputIgnoreRulesToProcessedRows({
      rows,
      outputIgnoreRules: ignoreRules.filter((rule) => rule.target !== 'input'),
      outputColumns,
    }).map((row) => {
      if (row.status === 'ignored' || row.status === 'error') {
        return row;
      }

      const inputRules = ignoreRules.filter((rule) => rule.target === 'input');
      const matchedRule = inputRules.find((rule) => evaluateIgnoreRule(row.inputValues, forceRuleTarget(rule, 'input')));
      if (!matchedRule) {
        return row;
      }

      return {
        ...row,
        status: 'ignored',
        ignoredReason: describeProcessedIgnoreRule(forceRuleTarget(matchedRule, 'input'), inputColumns, outputColumns),
      };
    }),
    rowOverrides,
  );
}

export function applyInputIgnoreRulesToInputRows({
  inputRows,
  inputIgnoreRules,
  inputColumns,
}: {
  inputRows: InputRow[];
  inputIgnoreRules: IgnoreRule[];
  inputColumns: InputColumn[];
}) {
  const includedInputRows: InputRow[] = [];
  const ignoredInputRows: IgnoredInputRow[] = [];

  inputRows.forEach((row) => {
    const matchedRule = inputIgnoreRules
      .map((rule) => forceRuleTarget(rule, 'input'))
      .find((rule) => evaluateIgnoreRule(row.values, rule));

    if (matchedRule) {
      ignoredInputRows.push({
        rowNumber: row.rowNumber,
        inputValues: row.values,
        ignoredReason: describeProcessedIgnoreRule(matchedRule, inputColumns, []),
      });
      return;
    }

    includedInputRows.push(row);
  });

  return { includedInputRows, ignoredInputRows };
}

export function applyOutputIgnoreRulesToProcessedRows({
  rows,
  outputIgnoreRules,
  outputColumns,
}: {
  rows: ProcessedRow[];
  outputIgnoreRules: IgnoreRule[];
  outputColumns: OutputColumn[];
}): ProcessedRow[] {
  return rows.map((row) => {
    if (row.error) {
      return { ...row, status: 'error', ignoredReason: undefined };
    }

    if (row.status === 'ignored') {
      return row;
    }

    const normalizedRules = outputIgnoreRules.map((rule) => normalizeProcessedIgnoreRule(forceRuleTarget(rule, 'output'), outputColumns));
    const matchedRule = normalizedRules.find((rule) => evaluateIgnoreRule(row.outputValues, rule));
    if (matchedRule) {
      return {
        ...row,
        status: 'ignored',
        ignoredReason: describeProcessedIgnoreRule(matchedRule, [], outputColumns),
      };
    }

    return { ...row, status: 'included', ignoredReason: undefined };
  });
}

export function applyRowOverridesToProcessedRows(rows: ProcessedRow[], rowOverrides: RowOverrides): ProcessedRow[] {
  return rows.map((row) => {
    const override = rowOverrides[row.rowNumber];

    if (override?.status === 'ignored') {
      return {
        ...row,
        status: 'ignored',
        ignoredReason: override.reason || 'Ignorada manualmente',
      };
    }

    if (override?.status === 'included') {
      return row.error ? { ...row, status: 'error', ignoredReason: undefined } : { ...row, status: 'included', ignoredReason: undefined };
    }

    if (row.error) {
      return { ...row, status: 'error', ignoredReason: undefined };
    }

    return row;
  });
}

export function matchesProcessedIgnoreRule(row: ProcessedRow, rule: IgnoreRule) {
  const sourceValues = rule.target === 'input' ? row.inputValues : row.outputValues;
  return evaluateIgnoreRule(sourceValues, rule);
}

export function evaluateIgnoreRule(values: Record<string, string>, rule: IgnoreRule) {
  if (!isIgnoreRuleComplete(rule)) {
    return false;
  }

  const value = String(values[rule.columnId] ?? '').trim();
  const expected = rule.value ?? '';
  const normalizedValue = value.toLowerCase();
  const normalizedExpected = expected.trim().toLowerCase();

  if (rule.operator === 'isEmpty') {
    return value === '';
  }

  if (rule.operator === 'isNotEmpty') {
    return value !== '';
  }

  if (rule.operator === 'contains') {
    return normalizedValue.includes(normalizedExpected);
  }

  if (rule.operator === 'notContains') {
    return !normalizedValue.includes(normalizedExpected);
  }

  if (rule.operator === 'equals') {
    return normalizedValue === normalizedExpected;
  }

  if (rule.operator === 'notEquals') {
    return normalizedValue !== normalizedExpected;
  }

  if (rule.operator === 'startsWith') {
    return normalizedValue.startsWith(normalizedExpected);
  }

  if (rule.operator === 'endsWith') {
    return normalizedValue.endsWith(normalizedExpected);
  }

  return false;
}

export function isIgnoreRuleComplete(rule: IgnoreRule) {
  if (!rule.columnId || !rule.operator) {
    return false;
  }

  return !ignoreRuleNeedsValue(rule.operator) || (rule.value?.trim() ?? '') !== '';
}

export function ignoreRuleNeedsValue(operator: IgnoreRule['operator']) {
  return operator !== '' && operator !== 'isEmpty' && operator !== 'isNotEmpty';
}

function forceRuleTarget(rule: IgnoreRule, target: IgnoreRule['target']): IgnoreRule {
  return { ...rule, target };
}

export function describeProcessedIgnoreRule(rule: IgnoreRule, inputColumns: InputColumn[], outputColumns: OutputColumn[]) {
  const columnName = rule.target === 'input'
    ? getMatchedInputColumnLabel(rule.columnId, inputColumns)
    : outputColumns.find((column) => column.id === rule.columnId)?.label ?? 'Columna de salida';

  if (rule.operator === 'isEmpty') {
    return `Ignorada por regla: ${columnName} está vacía`;
  }

  if (rule.operator === 'isNotEmpty') {
    return `Ignorada por regla: ${columnName} no está vacía`;
  }

  if (rule.operator === 'contains') {
    return `Ignorada por regla: ${columnName} contiene "${rule.value ?? ''}"`;
  }

  if (rule.operator === 'notContains') {
    return `Ignorada por regla: ${columnName} no contiene "${rule.value ?? ''}"`;
  }

  if (rule.operator === 'equals') {
    return `Ignorada por regla: ${columnName} es igual a "${rule.value ?? ''}"`;
  }

  if (rule.operator === 'notEquals') {
    return `Ignorada por regla: ${columnName} no es igual a "${rule.value ?? ''}"`;
  }

  if (rule.operator === 'startsWith') {
    return `Ignorada por regla: ${columnName} empieza con "${rule.value ?? ''}"`;
  }

  if (rule.operator === 'endsWith') {
    return `Ignorada por regla: ${columnName} termina con "${rule.value ?? ''}"`;
  }

  return 'Ignorada por regla incompleta';
}

function getMatchedInputColumnLabel(columnId: string, inputColumns: InputColumn[]) {
  const inputColumn = inputColumns.find((column) => column.id === columnId);
  return inputColumn ? getInputColumnLabel(inputColumn) : 'Columna de entrada';
}

export function normalizeProcessedIgnoreRule(rule: IgnoreRule, outputColumns: OutputColumn[]): IgnoreRule {
  const normalized = normalizeIgnoreRule(rule);
  return outputColumns.some((column) => column.id === normalized.columnId) || normalized.target === 'input'
    ? normalized
    : { ...normalized, columnId: '' };
}
