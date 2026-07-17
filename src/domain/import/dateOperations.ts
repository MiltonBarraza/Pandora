import type { DateInputFormat, DateInvalidFallback, DateOutputFormat, TransformStep } from '../../types/import';

export type KnownDateOutputFormat =
  | 'DD/MM/YYYY'
  | 'YYYY-MM-DD'
  | 'MM/DD/YYYY'
  | 'DD-MM-YYYY'
  | 'YYYY/MM/DD';

export type DateParts = {
  year: number;
  month: number;
  day: number;
};

const supportedDateOutputPartPattern = /dddd|MMMM|AAAA|YYYY|ddd|MMM|AA|YY|MM|DD|M|D/g;
const supportedDateOutputPartMatcher = /dddd|MMMM|AAAA|YYYY|ddd|MMM|AA|YY|MM|DD|M|D/;
const longMonthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const shortMonthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const longWeekdayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const shortWeekdayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

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
  const looseMonth = String(dateParts.month);
  const day = String(dateParts.day).padStart(2, '0');
  const looseDay = String(dateParts.day);
  const longMonth = longMonthNames[dateParts.month - 1] ?? '';
  const shortMonth = shortMonthNames[dateParts.month - 1] ?? '';
  const weekday = getWeekdayIndex(dateParts);
  const longWeekday = longWeekdayNames[weekday] ?? '';
  const shortWeekday = shortWeekdayNames[weekday] ?? '';
  const safeOutputFormat = isValidDateOutputFormat(outputFormat) ? outputFormat : defaultDateOutputFormat;

  return safeOutputFormat.replace(supportedDateOutputPartPattern, (part) => {
    if (part === 'dddd') return longWeekday;
    if (part === 'ddd') return shortWeekday;
    if (part === 'MMMM') return longMonth;
    if (part === 'MMM') return shortMonth;
    if (part === 'AAAA' || part === 'YYYY') return year;
    if (part === 'AA' || part === 'YY') return shortYear;
    if (part === 'MM') return month;
    if (part === 'M') return looseMonth;
    if (part === 'DD') return day;
    return looseDay;
  });
}

export function isKnownDateOutputFormat(format: string): format is KnownDateOutputFormat {
  return supportedDateOutputFormats.includes(format as KnownDateOutputFormat);
}

export function isValidDateOutputFormat(format: string): format is DateOutputFormat {
  return getDateOutputFormatError(format) === '';
}

export function getDateOutputFormatError(format: string) {
  const raw = String(format ?? '');
  const value = raw.trim();

  if (!value) {
    return 'Escribí un formato, por ejemplo DD/MM/AAAA.';
  }

  if (/(A{5,}|Y{5,}|M{5,}|D{3,}|d{5,})/.test(value)) {
    return 'El formato tiene partes que la app no reconoce. Revisá los formatos disponibles.';
  }

  const valueWithoutWeekdayParts = value.replace(/dddd|ddd/g, '');
  if (/[may]/.test(value) || /d/.test(valueWithoutWeekdayParts)) {
    if (/[m]/.test(value)) {
      return 'Usá MM o M en mayúscula para mes.';
    }

    if (/[y]/.test(value)) {
      return 'Usá AAAA o AA en mayúscula para año.';
    }

    return 'Usá DD o D en mayúscula para día.';
  }

  if (!supportedDateOutputPartMatcher.test(value)) {
    return 'Usá al menos una parte válida: AAAA, AA, MMMM, MMM, MM, M, DD o D.';
  }

  if (!/^[ADMAYd/\-. ]+$/.test(value)) {
    return 'Usá sólo formatos disponibles y separadores /, -, . o espacio.';
  }

  const withoutSupportedParts = value.replace(supportedDateOutputPartPattern, '');
  if (/[A-Za-z]/.test(withoutSupportedParts)) {
    return 'El formato tiene partes que la app no reconoce. Revisá los formatos disponibles.';
  }

  return '';
}

export function getDateOutputFormatDisplayValue(format: DateOutputFormat = defaultDateOutputFormat) {
  return String(format).replace(/YYYY/g, 'AAAA').replace(/YY/g, 'AA');
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

function getWeekdayIndex(dateParts: DateParts) {
  return new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day)).getUTCDay();
}

function isLeapYear(year: number) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}
