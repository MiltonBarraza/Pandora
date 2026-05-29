import type { IgnoreRule, NormalizedRow, OutputCategory, RowOverrides } from '../../types/import';

export function applyIgnoreRules(
  rows: NormalizedRow[],
  ignoreRules: IgnoreRule[],
  rowOverrides: RowOverrides,
): NormalizedRow[] {
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

    const matchedRule = ignoreRules.find((rule) => matchesIgnoreRule(row, normalizeIgnoreRule(rule)));
    if (matchedRule) {
      return {
        ...row,
        status: 'ignored',
        ignoredReason: matchedRule.reason || describeIgnoreRule(normalizeIgnoreRule(matchedRule)),
      };
    }

    if (row.error) {
      return { ...row, status: 'error', ignoredReason: undefined };
    }

    return { ...row, status: 'included', ignoredReason: undefined };
  });
}

export function matchesIgnoreRule(row: NormalizedRow, rule: IgnoreRule) {
  const rawValue = row.values[rule.categoryId] ?? '';
  const value = rawValue.trim();
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

  if (rule.operator === 'startsWith') {
    return normalizedValue.startsWith(normalizedExpected);
  }

  if (rule.operator === 'endsWith') {
    return normalizedValue.endsWith(normalizedExpected);
  }

  return false;
}

export function describeIgnoreRule(rule: IgnoreRule, categories: OutputCategory[] = []) {
  const categoryName = categories.find((category) => category.id === rule.categoryId)?.name ?? 'Columna';

  if (rule.operator === 'isEmpty') {
    return `Ignorada por regla: ${categoryName} esta vacio`;
  }

  if (rule.operator === 'isNotEmpty') {
    return `Ignorada por regla: ${categoryName} no esta vacio`;
  }

  if (rule.operator === 'contains') {
    return `Ignorada por regla: ${categoryName} contiene "${rule.value ?? ''}"`;
  }

  if (rule.operator === 'notContains') {
    return `Ignorada por regla: ${categoryName} no contiene "${rule.value ?? ''}"`;
  }

  if (rule.operator === 'equals') {
    return `Ignorada por regla: ${categoryName} es igual a "${rule.value ?? ''}"`;
  }

  if (rule.operator === 'startsWith') {
    return `Ignorada por regla: ${categoryName} empieza con "${rule.value ?? ''}"`;
  }

  return `Ignorada por regla: ${categoryName} termina con "${rule.value ?? ''}"`;
}

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
    categoryId: rule.categoryId ?? legacyRule.columnKey ?? '',
    operator: operatorMap[legacyRule.operator ?? ''] ?? rule.operator ?? 'contains',
  };
}

export function rowContainsText(row: NormalizedRow, text: string) {
  const needle = text.trim().toLowerCase();
  if (!needle) {
    return false;
  }

  return Object.values(row.values).some((value) => value.toLowerCase().includes(needle));
}
