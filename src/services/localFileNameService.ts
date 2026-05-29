import type { FileNameSettings } from '../types/import';

const fileNameSettingsKey = 'excel-sanitizer:file-name-settings';

export function defaultFileNameSettings(): FileNameSettings {
  return {
    mode: 'default',
    customName: '',
    baseText: 'Archivo sanitizado',
    includeBaseText: true,
    includeOriginalName: true,
    includeSheetName: true,
    includeDate: false,
  };
}

export function loadFileNameSettings(): FileNameSettings {
  try {
    const raw = localStorage.getItem(fileNameSettingsKey);
    const parsed = raw ? (JSON.parse(raw) as Partial<FileNameSettings>) : null;
    return { ...defaultFileNameSettings(), ...parsed };
  } catch {
    return defaultFileNameSettings();
  }
}

export function saveFileNameSettings(settings: FileNameSettings) {
  localStorage.setItem(fileNameSettingsKey, JSON.stringify(settings));
}
