import type { NumericOperation, NumericTransformationConfig } from '../../types/import';

export function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }

  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(/\s+/g, '');
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

export function applyNumericOperation(value: number, operation: NumericOperation, amount: number): number {
  if (operation === 'add') {
    return value + amount;
  }

  if (operation === 'subtract') {
    return value - amount;
  }

  if (operation === 'multiply') {
    return value * amount;
  }

  if (operation === 'divide') {
    return value / amount;
  }

  if (operation === 'addPercentage') {
    return value * (1 + amount / 100);
  }

  if (operation === 'subtractPercentage') {
    return value * (1 - amount / 100);
  }

  return value / (1 + amount / 100);
}

export function formatNumericResult(value: number, rounding: NumericTransformationConfig['rounding'] = 2): string {
  if (rounding === 'none') {
    return String(value);
  }

  return value.toFixed(rounding);
}

export function getSuggestedNumericColumnName(sourceColumn: string, operation: NumericOperation, amount: number): string {
  if (operation === 'add') {
    return `${sourceColumn} +$${amount}`;
  }

  if (operation === 'subtract') {
    return `${sourceColumn} -$${amount}`;
  }

  if (operation === 'multiply') {
    return `${sourceColumn} x${amount}`;
  }

  if (operation === 'divide') {
    return `${sourceColumn} /${amount}`;
  }

  if (operation === 'addPercentage') {
    return `${sourceColumn} +${amount}%`;
  }

  if (operation === 'subtractPercentage') {
    return `${sourceColumn} -${amount}%`;
  }

  return `${sourceColumn} sin ${amount}%`;
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
