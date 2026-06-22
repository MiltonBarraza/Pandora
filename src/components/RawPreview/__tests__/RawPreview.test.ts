import { describe, expect, it } from 'vitest';
import { getRawPreviewColumnLabel, getRawPreviewColumns, getRawPreviewRowNumber } from '../RawPreview';

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
    })).toEqual([0, 2]);
  });

  it('falls back to every column when active columns are not provided', () => {
    expect(getRawPreviewColumns({
      maxColumns: 4,
    })).toEqual([0, 1, 2, 3]);
  });

  it('keeps an explicit empty active column list empty', () => {
    expect(getRawPreviewColumns({
      maxColumns: 4,
      activeColumns: [],
    })).toEqual([]);
  });
});

describe('getRawPreviewColumnLabel', () => {
  it('uses configured column labels when available', () => {
    expect(getRawPreviewColumnLabel(1, { 1: 'SKU visual' })).toBe('SKU visual');
  });

  it('falls back to the column letter without a configured label', () => {
    expect(getRawPreviewColumnLabel(2, { 2: '   ' })).toBe('C');
  });
});
