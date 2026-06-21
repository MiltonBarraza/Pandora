import { describe, expect, it } from 'vitest';
import { shouldShowTruncatedTextTooltip } from '../TruncatedText';

describe('TruncatedText', () => {
  it('shows tooltip only when text exceeds threshold', () => {
    expect(shouldShowTruncatedTextTooltip('SKU', 14)).toBe(false);
    expect(shouldShowTruncatedTextTooltip('Encabezado comercial larguisimo', 14)).toBe(true);
  });
});
