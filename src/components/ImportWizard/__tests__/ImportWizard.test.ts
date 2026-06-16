import { describe, expect, it } from 'vitest';
import {
  getExcelRowNumberForInternalIndex,
  getInternalIndexForExcelRowNumber,
  getRawPreviewRowNumbers,
  shouldProtectWizardState,
} from '../ImportWizard';

describe('ImportWizard guard state', () => {
  it('does not protect an empty initial wizard', () => {
    expect(shouldProtectWizardState({
      isConfigurationDirty: false,
      hasLoadedFile: false,
      selectedSheet: '',
      rowCount: 0,
      columnAnalysisCount: 0,
    })).toBe(false);
  });

  it('does not protect the synthetic initial column analysis before a file is loaded', () => {
    expect(shouldProtectWizardState({
      isConfigurationDirty: false,
      hasLoadedFile: false,
      selectedSheet: '',
      rowCount: 0,
      columnAnalysisCount: 1,
    })).toBe(false);
  });

  it('protects loaded source state even before configuration edits', () => {
    expect(shouldProtectWizardState({
      isConfigurationDirty: false,
      hasLoadedFile: true,
      selectedSheet: '',
      rowCount: 0,
      columnAnalysisCount: 0,
    })).toBe(true);
    expect(shouldProtectWizardState({
      isConfigurationDirty: false,
      hasLoadedFile: false,
      selectedSheet: 'Hoja 1',
      rowCount: 0,
      columnAnalysisCount: 0,
    })).toBe(true);
    expect(shouldProtectWizardState({
      isConfigurationDirty: false,
      hasLoadedFile: false,
      selectedSheet: '',
      rowCount: 5,
      columnAnalysisCount: 0,
    })).toBe(true);
    expect(shouldProtectWizardState({
      isConfigurationDirty: false,
      hasLoadedFile: true,
      selectedSheet: '',
      rowCount: 0,
      columnAnalysisCount: 2,
    })).toBe(true);
  });
});

describe('ImportWizard raw preview row numbers', () => {
  const rowMetadata = [
    { internalRowIndex: 0, excelRowNumber: 8 },
    { internalRowIndex: 1, excelRowNumber: 10 },
    { internalRowIndex: 2, excelRowNumber: 11 },
  ];

  it('passes real Excel row numbers to the preview', () => {
    expect(getRawPreviewRowNumbers(rowMetadata, 0, false)).toEqual([8, 10, 11]);
  });

  it('keeps real Excel row numbers when preview starts from data start', () => {
    expect(getRawPreviewRowNumbers(rowMetadata, 1, true)).toEqual([10, 11]);
  });

  it('keeps CSV fallback behavior when metadata is absent', () => {
    expect(getRawPreviewRowNumbers([], 1, true)).toBeUndefined();
  });
});

describe('ImportWizard row number mapping', () => {
  const rowMetadata = [
    { internalRowIndex: 0, excelRowNumber: 8 },
    { internalRowIndex: 1, excelRowNumber: 10 },
    { internalRowIndex: 2, excelRowNumber: 11 },
  ];

  it('shows the real Excel row for an internal row index', () => {
    expect(getExcelRowNumberForInternalIndex(rowMetadata, 0)).toBe(8);
    expect(getExcelRowNumberForInternalIndex(rowMetadata, 1)).toBe(10);
  });

  it('converts a real Excel row number to the matching internal index', () => {
    expect(getInternalIndexForExcelRowNumber(rowMetadata, 8)).toBe(0);
    expect(getInternalIndexForExcelRowNumber(rowMetadata, 10)).toBe(1);
  });

  it('uses the next available row when the Excel row was discarded', () => {
    expect(getInternalIndexForExcelRowNumber(rowMetadata, 9)).toBe(1);
  });

  it('keeps previous index-based behavior without metadata', () => {
    expect(getExcelRowNumberForInternalIndex([], 5)).toBe(6);
    expect(getInternalIndexForExcelRowNumber([], 6)).toBe(5);
  });
});
