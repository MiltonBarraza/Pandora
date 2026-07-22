export function parseOptionalNumberInput(value: string): number | undefined {
  if (value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeNumberInputWhileTyping(previousValue: string, nextValue: string): string {
  if (previousValue !== '0' || !/^\d{2}$/.test(nextValue)) {
    return nextValue;
  }

  if (nextValue.startsWith('0')) {
    return nextValue.slice(1);
  }

  return nextValue.slice(0, -1);
}

export function parseStartRowInputWhileEditing(value: string): number | undefined {
  const parsed = parseOptionalNumberInput(value.trim());

  if (parsed === undefined || !Number.isInteger(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

export function normalizeNumberInputOnBlur(
  value: string,
  options: {
    fallback: number;
    min?: number;
    max?: number;
    integer?: boolean;
  },
): number {
  const fallback = Number.isFinite(options.fallback) ? options.fallback : 0;
  let normalized = parseOptionalNumberInput(value) ?? fallback;

  if (options.integer) {
    normalized = Math.trunc(normalized);
  }

  if (options.min !== undefined) {
    normalized = Math.max(options.min, normalized);
  }

  if (options.max !== undefined) {
    normalized = Math.min(options.max, normalized);
  }

  return normalized;
}
