import type { DateInputFormat, DateInvalidFallback, DateOutputFormat, TransformStep } from '../../types/import';

export type DateParts = {
  year: number;
  month: number;
  day: number;
};

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

export const supportedDateOutputFormats: DateOutputFormat[] = [
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
  const month = String(dateParts.month).padStart(2, '0');
  const day = String(dateParts.day).padStart(2, '0');

  if (outputFormat === 'DD/MM/YYYY') {
    return `${day}/${month}/${year}`;
  }

  if (outputFormat === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  }

  if (outputFormat === 'DD-MM-YYYY') {
    return `${day}-${month}-${year}`;
  }

  if (outputFormat === 'YYYY/MM/DD') {
    return `${year}/${month}/${day}`;
  }

  return `${year}-${month}-${day}`;
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

function isLeapYear(year: number) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}
