export function normalizeWhitespace(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function toText(value: unknown): string {
  return String(value ?? '').trim();
}
