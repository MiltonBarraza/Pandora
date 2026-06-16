import { describe, expect, it } from 'vitest';
import { getRawPreviewRowNumber } from '../RawPreview';

describe('RawPreview row numbers', () => {
  it('shows real row numbers when provided', () => {
    expect(getRawPreviewRowNumber(0, 0, [8, 10])).toBe(8);
    expect(getRawPreviewRowNumber(1, 0, [8, 10])).toBe(10);
  });

  it('falls back to offset-based row numbers without metadata', () => {
    expect(getRawPreviewRowNumber(0, 5)).toBe(6);
    expect(getRawPreviewRowNumber(1, 5)).toBe(7);
  });
});
