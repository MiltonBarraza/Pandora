import type { IgnoreRule, WizardPersistedSettings } from '../types/import';

const settingsKey = 'excel-sanitizer:generic-settings';

export function loadPersistedSettings(): Partial<WizardPersistedSettings> {
  try {
    const raw = localStorage.getItem(settingsKey);
    const parsed = raw ? (JSON.parse(raw) as Partial<WizardPersistedSettings>) : {};
    const legacyIgnoreRules = normalizeIgnoreRules(parsed.ignoreRules);
    return {
      ...parsed,
      ignoreRules: legacyIgnoreRules,
      inputIgnoreRules: normalizeIgnoreRules(parsed.inputIgnoreRules) ?? legacyIgnoreRules?.filter((rule) => rule.target === 'input'),
      outputIgnoreRules: normalizeIgnoreRules(parsed.outputIgnoreRules) ?? legacyIgnoreRules?.filter((rule) => rule.target !== 'input'),
      inputColumnAliases: parsed.inputColumnAliases,
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

function normalizeIgnoreRules(rules?: IgnoreRule[]) {
  return rules?.map((rule) => {
    const { id, target, columnId, operator, value } = rule;
    return { id, target, columnId, operator, ...(value !== undefined ? { value } : {}) };
  });
}
