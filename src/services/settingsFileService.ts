import type { ExportedImportSettings, ParseImportSettingsResult } from '../types/import';

export function serializeImportSettings(settings: ExportedImportSettings) {
  return JSON.stringify(settings, null, 2);
}

export function parseImportSettingsJson(json: string): ParseImportSettingsResult {
  try {
    const parsed = JSON.parse(json) as unknown;
    return validateImportedSettings(parsed);
  } catch {
    return {
      ok: false,
      error: 'El archivo de configuración no contiene JSON válido.',
    };
  }
}

export function validateImportedSettings(value: unknown): ParseImportSettingsResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      error: 'El archivo de configuración debe contener un objeto JSON.',
    };
  }

  if (value.app !== 'excel-sanitizer') {
    return {
      ok: false,
      error: 'El archivo de configuración no pertenece a excel-sanitizer.',
    };
  }

  if (value.schemaVersion !== 1) {
    return {
      ok: false,
      error: 'La versión del archivo de configuración no es compatible.',
    };
  }

  if (!isRecord(value.sourceSnapshot)) {
    return {
      ok: false,
      error: 'El archivo de configuración no contiene snapshot de origen.',
    };
  }

  if (!isRecord(value.config)) {
    return {
      ok: false,
      error: 'El archivo de configuración no contiene "config".',
    };
  }

  const config = value.config;
  if (!Array.isArray(config.outputColumns)) {
    return buildMissingConfigError('outputColumns');
  }

  if (!Array.isArray(config.inputIgnoreRules)) {
    return buildMissingConfigError('inputIgnoreRules');
  }

  if (config.inputNormalizationRules !== undefined && !Array.isArray(config.inputNormalizationRules)) {
    return buildMissingConfigError('inputNormalizationRules');
  }

  if (!Array.isArray(config.outputIgnoreRules)) {
    return buildMissingConfigError('outputIgnoreRules');
  }

  if (!isPlainObject(config.inputColumnAliases)) {
    return buildMissingConfigError('inputColumnAliases');
  }

  if (!Array.isArray(config.columnVisibility)) {
    return buildMissingConfigError('columnVisibility');
  }

  return {
    ok: true,
    settings: value as ExportedImportSettings,
  };
}

export function getImportSettingsFileName(settings: ExportedImportSettings) {
  const baseName = sanitizeSettingsFileNamePart(settings.name || settings.sourceSnapshot.sheetName || 'settings');
  const datePart = getDatePart(settings.exportedAt);
  return `excel-sanitizer-settings-${baseName}-${datePart}.json`;
}

export function downloadImportSettingsFile(settings: ExportedImportSettings) {
  const blob = new Blob([serializeImportSettings(settings)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getImportSettingsFileName(settings);
  link.click();
  URL.revokeObjectURL(url);
}

function buildMissingConfigError(fieldName: string): ParseImportSettingsResult {
  return {
    ok: false,
    error: `El archivo de settings no contiene config.${fieldName} válido.`,
  };
}

function sanitizeSettingsFileNamePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'settings';
}

function getDatePart(value: string) {
  const datePart = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : new Date().toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
