import { describe, expect, it } from 'vitest';
import { getRawPreviewColumns, getRawPreviewRowNumber } from '../RawPreview';

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

describe('getRawPreviewColumns', () => {
  it('uses active columns by default', () => {
    expect(getRawPreviewColumns({
      maxColumns: 5,
      activeColumns: [0, 2],
      dataColumns: [0, 1, 2],
    })).toEqual([0, 2]);
  });

  it('uses data columns when the data-only preview toggle is enabled', () => {
    expect(getRawPreviewColumns({
      maxColumns: 5,
      activeColumns: [0, 2],
      dataColumns: [0, 1, 2, 4],
      showDataColumns: true,
    })).toEqual([0, 1, 2, 4]);
  });

  it('shows every column when the all-columns preview toggle is enabled', () => {
    expect(getRawPreviewColumns({
      maxColumns: 4,
      activeColumns: [0],
      dataColumns: [0, 2],
      showAllColumns: true,
      showDataColumns: true,
    })).toEqual([0, 1, 2, 3]);
  });
});
