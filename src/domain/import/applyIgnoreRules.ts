import type { IgnoreRule, InputColumn, OutputColumn, ProcessedRow, RowOverrides } from '../../types/import';

export function normalizeIgnoreRule(rule: IgnoreRule): IgnoreRule {
  const legacyRule = rule as IgnoreRule & { columnKey?: string; operator?: string };
  const operatorMap: Record<string, IgnoreRule['operator']> = {
    empty: 'isEmpty',
    equals: 'equals',
    contains: 'contains',
    startsWith: 'startsWith',
  };

  return {
    ...rule,
    target: rule.target ?? 'output',
    columnId: rule.columnId ?? rule.categoryId ?? legacyRule.columnKey ?? '',
    categoryId: rule.categoryId ?? legacyRule.columnKey ?? '',
    operator: operatorMap[legacyRule.operator ?? ''] ?? rule.operator ?? 'contains',
  };
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

    const normalizedRules = ignoreRules.map((rule) => normalizeProcessedIgnoreRule(rule, outputColumns));
    const matchedRule = normalizedRules.find((rule) => matchesProcessedIgnoreRule(row, rule));
    if (matchedRule) {
      return {
        ...row,
        status: 'ignored',
        ignoredReason: matchedRule.reason || describeProcessedIgnoreRule(matchedRule, inputColumns, outputColumns),
      };
    }

    return { ...row, status: 'included', ignoredReason: undefined };
  });
}

export function matchesProcessedIgnoreRule(row: ProcessedRow, rule: IgnoreRule) {
  const sourceValues = rule.target === 'input' ? row.inputValues : row.outputValues;
  const value = String(sourceValues[rule.columnId] ?? '').trim();
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

export function describeProcessedIgnoreRule(rule: IgnoreRule, inputColumns: InputColumn[], outputColumns: OutputColumn[]) {
  const columnName = rule.target === 'input'
    ? inputColumns.find((column) => column.id === rule.columnId)?.label ?? 'Columna de entrada'
    : outputColumns.find((column) => column.id === rule.columnId)?.label ?? 'Columna de salida';

  if (rule.operator === 'isEmpty') {
    return `Ignorada por regla: ${columnName} esta vacia`;
  }

  if (rule.operator === 'isNotEmpty') {
    return `Ignorada por regla: ${columnName} no esta vacia`;
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

  return `Ignorada por regla: ${columnName} termina con "${rule.value ?? ''}"`;
}

export function normalizeProcessedIgnoreRule(rule: IgnoreRule, outputColumns: OutputColumn[]): IgnoreRule {
  const normalized = normalizeIgnoreRule(rule);
  const outputColumn = outputColumns.find((column) => column.legacyCategoryId === normalized.columnId || column.legacyCategoryId === normalized.categoryId);

  if (normalized.target === 'output' && outputColumn && normalized.columnId !== outputColumn.id) {
    return {
      ...normalized,
      columnId: outputColumn.id,
    };
  }

  if (normalized.columnId) {
    return normalized;
  }

  return {
    ...normalized,
    target: normalized.target ?? 'output',
    columnId: outputColumn?.id ?? normalized.categoryId ?? '',
  };
}
