import { describe, expect, it } from 'vitest';
import { getRawPreviewColumns } from '../RawPreview';

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
