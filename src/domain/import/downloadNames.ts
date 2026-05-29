import type { FileNameSettings } from '../../types/import';

export function buildOutputFileBaseName({
  settings,
  sourceFileName,
  sheetName,
}: {
  settings: FileNameSettings;
  sourceFileName: string;
  sheetName?: string;
}) {
  if (settings.mode === 'custom' && settings.customName.trim()) {
    return sanitizeNamePart(removeExtension(settings.customName)) || 'Archivo sanitizado';
  }

  const parts = [
    settings.includeBaseText ? settings.baseText || 'Archivo sanitizado' : '',
    settings.includeOriginalName ? removeExtension(sourceFileName) : '',
    settings.includeSheetName ? sheetName : '',
    settings.includeDate ? new Date().toISOString().slice(0, 10) : '',
  ]
    .map((part) => sanitizeNamePart(part))
    .filter(Boolean);

  return parts.join(' - ') || 'Archivo sanitizado';
}

export function buildAuditFileBaseName(baseName: string) {
  const sanitizedBase = sanitizeNamePart(removeExtension(baseName));
  return sanitizedBase ? `Auditoría - ${sanitizedBase}` : 'Auditoría';
}

export function sanitizeNamePart(value?: string) {
  return String(value ?? '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function removeExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '');
}
