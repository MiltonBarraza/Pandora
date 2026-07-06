import type { FileNameSettings } from '../types/import';

const fileNameSettingsKey = 'excel-sanitizer:file-name-settings';

export function defaultFileNameSettings(): FileNameSettings {
  return {
    mode: 'default',
    customName: '',
    baseText: 'Archivo preparado',
    includeBaseText: true,
    includeOriginalName: true,
    includeSheetName: true,
    includeDate: false,
    includeTime: false,
  };
}

export function normalizeFileNameSettings(settings?: Partial<FileNameSettings> | null): FileNameSettings {
  const next = { ...defaultFileNameSettings(), ...settings };
  return {
    ...next,
    includeTime: next.includeDate ? next.includeTime ?? false : false,
  };
}

export function loadFileNameSettings(): FileNameSettings {
  try {
    const raw = localStorage.getItem(fileNameSettingsKey);
    const parsed = raw ? (JSON.parse(raw) as Partial<FileNameSettings>) : null;
    return normalizeFileNameSettings(parsed);
  } catch {
    return defaultFileNameSettings();
  }
}

export function saveFileNameSettings(settings: FileNameSettings) {
  localStorage.setItem(fileNameSettingsKey, JSON.stringify(normalizeFileNameSettings(settings)));
}
