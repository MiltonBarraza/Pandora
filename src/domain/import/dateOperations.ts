import type { DateInputFormat, DateInvalidFallback, DateOutputFormat, TransformStep } from '../../types/import';

export type KnownDateOutputFormat =
  | 'DD/MM/YYYY'
  | 'YYYY-MM-DD'
  | 'MM/DD/YYYY'
  | 'DD-MM-YYYY'
  | 'YYYY/MM/DD';

export type DateOutputFormatPart = 'DD' | 'MM' | 'AAAA';
export type DateOutputFormatSeparator = '/' | '-' | '.' | ' ';

export type DateOutputFormatPattern = {
  parts: [DateOutputFormatPart, DateOutputFormatPart, DateOutputFormatPart];
  separators: [DateOutputFormatSeparator, DateOutputFormatSeparator];
};

export type DateParts = {
  year: number;
  month: number;
  day: number;
};

const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const shortMonthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const weekdayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const shortWeekdayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const supportedDateOutputFormatParts = new Set([
  'AAAA',
  'AA',
  'YYYY',
  'YY',
  'MMMM',
  'MMM',
  'MM',
  'M',
  'dddd',
  'ddd',
  'DD',
  'D',
]);

export const defaultDateInputFormat: DateInputFormat = 'DD/MM/YYYY';
export const defaultDateOutputFormat: DateOutputFormat = 'YYYY-MM-DD';
export const defaultDateInvalidFallback: DateInvalidFallback = 'original';

export const supportedDateInputFormats: DateInputFormat[] = [
  'DD/MM/YYYY',
  'D/M/YYYY',
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'M/D/YYYY',
  'DD-MM-YYYY',
  'YYYY/MM/DD',
  'DD/MM/YY',
  'D/M/YY',
  'MM/DD/YY',
  'M/D/YY',
];

export const supportedDateOutputFormats: KnownDateOutputFormat[] = [
  'DD/MM/YYYY',
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'DD-MM-YYYY',
  'YYYY/MM/DD',
];

export function parseDateValue(value: unknown, inputFormat: DateInputFormat = defaultDateInputFormat): DateParts | null {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }

  const match = raw.match(getDateFormatPattern(inputFormat));
  if (!match?.groups) {
    return null;
  }

  const dateParts = {
    year: normalizeYear(match.groups.year),
    month: Number(match.groups.month),
    day: Number(match.groups.day),
  };

  return isValidDateParts(dateParts) ? dateParts : null;
}

export function formatDateValue(dateParts: DateParts, outputFormat: DateOutputFormat = defaultDateOutputFormat) {
  const year = String(dateParts.year).padStart(4, '0');
  const shortYear = year.slice(-2);
  const month = String(dateParts.month).padStart(2, '0');
  const rawMonth = String(dateParts.month);
  const day = String(dateParts.day).padStart(2, '0');
  const rawDay = String(dateParts.day);
  const weekday = getWeekdayIndex(dateParts);
  const safeOutputFormat = isValidDateOutputFormat(outputFormat) ? outputFormat : defaultDateOutputFormat;

  return safeOutputFormat.replace(/dddd|MMMM|AAAA|YYYY|ddd|MMM|DD|MM|AA|YY|D|M/g, (part) => {
    if (part === 'dddd') return weekdayNames[weekday];
    if (part === 'ddd') return shortWeekdayNames[weekday];
    if (part === 'MMMM') return monthNames[dateParts.month - 1];
    if (part === 'MMM') return shortMonthNames[dateParts.month - 1];
    if (part === 'AAAA' || part === 'YYYY') return year;
    if (part === 'AA' || part === 'YY') return shortYear;
    if (part === 'MM') return month;
    if (part === 'M') return rawMonth;
    if (part === 'DD') return day;
    return rawDay;
  });
}

export function getDateOutputFormatDisplayValue(format: DateOutputFormat = defaultDateOutputFormat): DateOutputFormat {
  return String(format).replace(/YYYY/g, 'AAAA').replace(/YY/g, 'AA') as DateOutputFormat;
}

export function isKnownDateOutputFormat(format: string): format is KnownDateOutputFormat {
  return supportedDateOutputFormats.includes(format as KnownDateOutputFormat);
}

export function isValidDateOutputFormat(format: string): format is DateOutputFormat {
  return getDateOutputFormatError(format) === '';
}

export function getDateOutputFormatError(format: string) {
  const value = String(format ?? '').trim();

  if (!value) {
    return 'El formato no puede estar vacío.';
  }

  if (/[ym]/.test(value) || /\bdd\b/.test(value)) {
    return value.includes('m')
      ? 'Usá MM en mayúscula para mes.'
      : 'Usá DD para día y AAAA para año.';
  }

  const parts = value.match(/[A-Za-z]+/g) ?? [];
  if (parts.length === 0) {
    return 'El formato debe incluir al menos una parte de fecha.';
  }

  if (parts.some((part) => !supportedDateOutputFormatParts.has(part))) {
    return 'El formato tiene partes que la app no reconoce. Revisá los formatos disponibles.';
  }

  if (/[^A-Za-z/\-. ]/.test(value)) {
    return 'El formato tiene partes que la app no reconoce. Revisá los formatos disponibles.';
  }

  return '';
}

export function parseDateOutputFormatPattern(format: string): DateOutputFormatPattern | null {
  const match = String(format ?? '').trim().match(/^(DD|MM|AAAA|YYYY)([\/\-. ])(DD|MM|AAAA|YYYY)([\/\-. ])(DD|MM|AAAA|YYYY)$/);
  if (!match) {
    return null;
  }

  return {
    parts: [
      normalizeDateOutputFormatPart(match[1]),
      normalizeDateOutputFormatPart(match[3]),
      normalizeDateOutputFormatPart(match[5]),
    ],
    separators: [match[2] as DateOutputFormatSeparator, match[4] as DateOutputFormatSeparator],
  };
}

export function buildDateOutputFormatFromPattern(pattern: DateOutputFormatPattern): DateOutputFormat {
  return `${pattern.parts[0]}${pattern.separators[0]}${pattern.parts[1]}${pattern.separators[1]}${pattern.parts[2]}`;
}

export function applyFormatDateStep(value: string, step: TransformStep) {
  const inputFormat = step.dateInputFormat ?? defaultDateInputFormat;
  const outputFormat = step.dateOutputFormat ?? defaultDateOutputFormat;
  const dateParts = parseDateValue(value, inputFormat)
    ?? (shouldParseFixedIsoDate(value, step) ? parseDateValue(value, 'YYYY-MM-DD') : null);

  if (dateParts) {
    return formatDateValue(dateParts, outputFormat);
  }

  return applyInvalidDateFallback(value, step);
}

function shouldParseFixedIsoDate(value: string, step: TransformStep) {
  return step.source?.type === 'fixedText' && Boolean(parseDateValue(value, 'YYYY-MM-DD'));
}

function applyInvalidDateFallback(value: string, step: TransformStep) {
  const fallback = step.dateInvalidFallback ?? defaultDateInvalidFallback;

  if (fallback === 'empty') {
    return '';
  }

  if (fallback === 'fixedText') {
    return step.dateInvalidFallbackText ?? '';
  }

  return value;
}

function getDateFormatPattern(format: DateInputFormat) {
  if (format === 'DD/MM/YYYY' || format === 'D/M/YYYY') {
    return /^(?<day>\d{1,2})\/(?<month>\d{1,2})\/(?<year>\d{4})$/;
  }

  if (format === 'MM/DD/YYYY' || format === 'M/D/YYYY') {
    return /^(?<month>\d{1,2})\/(?<day>\d{1,2})\/(?<year>\d{4})$/;
  }

  if (format === 'DD/MM/YY' || format === 'D/M/YY') {
    return /^(?<day>\d{1,2})\/(?<month>\d{1,2})\/(?<year>\d{2})$/;
  }

  if (format === 'MM/DD/YY' || format === 'M/D/YY') {
    return /^(?<month>\d{1,2})\/(?<day>\d{1,2})\/(?<year>\d{2})$/;
  }

  if (format === 'DD-MM-YYYY') {
    return /^(?<day>\d{2})-(?<month>\d{2})-(?<year>\d{4})$/;
  }

  if (format === 'YYYY/MM/DD') {
    return /^(?<year>\d{4})\/(?<month>\d{2})\/(?<day>\d{2})$/;
  }

  return /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/;
}

function normalizeYear(value: string) {
  if (value.length !== 2) {
    return Number(value);
  }

  const year = Number(value);
  return year <= 68 ? 2000 + year : 1900 + year;
}

function isValidDateParts({ year, month, day }: DateParts) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (year < 1 || month < 1 || month > 12) {
    return false;
  }

  return day >= 1 && day <= getDaysInMonth(year, month);
}

function getDaysInMonth(year: number, month: number) {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function getWeekdayIndex({ year, month, day }: DateParts) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function normalizeDateOutputFormatPart(part: string): DateOutputFormatPart {
  return part === 'YYYY' || part === 'AAAA' ? 'AAAA' : part as DateOutputFormatPart;
}

function isLeapYear(year: number) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}
