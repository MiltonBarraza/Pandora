import type { IgnoreRule, WizardPersistedSettings } from '../types/import';

const settingsKey = 'excel-sanitizer:generic-settings';

export function loadPersistedSettings(): Partial<WizardPersistedSettings> {
  try {
    const raw = localStorage.getItem(settingsKey);
    const parsed = raw ? (JSON.parse(raw) as Partial<WizardPersistedSettings>) : {};
    return {
      ...parsed,
      ignoreRules: parsed.ignoreRules?.map(normalizePersistedIgnoreRule),
    };
  } catch {
    return {};
  }
}

export function savePersistedSettings(settings: Partial<WizardPersistedSettings>) {
  localStorage.setItem(settingsKey, JSON.stringify(settings));
}

export function defaultIgnoreRules(): IgnoreRule[] {
  return [];
}

function normalizePersistedIgnoreRule(rule: IgnoreRule): IgnoreRule {
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
