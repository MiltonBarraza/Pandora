import type { NumericFormulaOperator, NumericOperation, TransformStep } from '../../types/import';

export function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }

  if (/[a-zA-Z]/.test(raw)) {
    return null;
  }

  const cleaned = raw
    .replace(/[^\d,.-]/g, '')
    .replace(/\s+/g, '');

  if (!cleaned || cleaned === '-' || cleaned === ',' || cleaned === '.') {
    return null;
  }

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;

  if (lastComma > -1 && lastDot > -1) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = cleaned
      .replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '')
      .replace(decimalSeparator, '.');
  } else if (lastComma > -1) {
    normalized = normalizeSingleSeparator(cleaned, ',');
  } else if (lastDot > -1) {
    normalized = normalizeSingleSeparator(cleaned, '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractNumericValue(value: unknown): number | null {
  const raw = String(value ?? '');
  const match = raw.match(/[-+]?\d[\d.,]*/);
  return match ? parseNumericValue(match[0]) : null;
}

export function applyNumericOperation(value: number, operation: NumericOperation, amount: number) {
  if (operation === 'addPercentage') {
    return value * (1 + amount / 100);
  }

  if (operation === 'subtractPercentage') {
    return value * (1 - amount / 100);
  }

  return value / (1 + amount / 100);
}

export function applyNumericFormulaOperation(value: number, operator: NumericFormulaOperator, amount: number) {
  if (operator === 'add') {
    return value + amount;
  }

  if (operator === 'subtract') {
    return value - amount;
  }

  if (operator === 'multiply') {
    return value * amount;
  }

  return value / amount;
}

export function formatNumericResult(value: number, rounding: TransformStep['rounding'] = 2) {
  return rounding === 'none' ? String(value) : value.toFixed(rounding ?? 2);
}

function normalizeSingleSeparator(value: string, separator: ',' | '.') {
  const parts = value.split(separator);
  if (parts.length === 2 && parts[1].length <= 2) {
    return value.replace(separator, '.');
  }

  if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 2) {
    return value.replace(separator, '');
  }

  if (parts.length > 2) {
    const decimalCandidate = parts[parts.length - 1] ?? '';
    if (decimalCandidate.length <= 2) {
      return `${parts.slice(0, -1).join('')}.${decimalCandidate}`;
    }
    return parts.join('');
  }

  return value.replace(separator, '.');
}
