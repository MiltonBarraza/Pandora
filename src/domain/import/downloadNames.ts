import type { FileNameSettings } from '../../types/import';

export function buildOutputFileBaseName({
  settings,
  sourceFileName,
  sheetName,
  now = new Date(),
}: {
  settings: FileNameSettings;
  sourceFileName: string;
  sheetName?: string;
  now?: Date;
}) {
  if (settings.mode === 'custom' && settings.customName.trim()) {
    return sanitizeNamePart(removeExtension(settings.customName)) || 'Archivo preparado';
  }

  const parts = [
    settings.includeBaseText ? settings.baseText || 'Archivo preparado' : '',
    settings.includeOriginalName ? removeExtension(sourceFileName) : '',
    settings.includeSheetName ? sheetName : '',
    settings.includeDate ? formatLocalDatePart(now, settings.includeTime ?? false) : '',
  ]
    .map((part) => sanitizeNamePart(part))
    .filter(Boolean);

  return parts.join(' - ') || 'Archivo preparado';
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

export function formatLocalDatePart(value: Date, includeTime = false) {
  const date = [
    value.getFullYear(),
    padDatePart(value.getMonth() + 1),
    padDatePart(value.getDate()),
  ].join('-');

  if (!includeTime) {
    return date;
  }

  return `${date}_${padDatePart(value.getHours())}-${padDatePart(value.getMinutes())}`;
}

function removeExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '');
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}
