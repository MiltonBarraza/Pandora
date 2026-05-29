export function parseCurrency(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value ?? '').trim();
  if (!raw) {
    return 0;
  }

  const cleaned = raw
    .replace(/[^\d,.-]/g, '')
    .replace(/\s+/g, '');

  if (!cleaned || cleaned === '-' || cleaned === ',' || cleaned === '.') {
    return 0;
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
  return Number.isFinite(parsed) ? parsed : 0;
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
