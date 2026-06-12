import { describe, expect, it } from 'vitest';
import { getRawRowNumbersFromSheetMetadata, shouldProtectWizardState } from '../ImportWizard';

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

describe('ImportWizard sheet metadata helpers', () => {
  it('maps non-empty metadata rows to real 1-based sheet row numbers', () => {
    expect(getRawRowNumbersFromSheetMetadata({
      merges: [],
      rows: [
        { originalRowIndex: 0, cells: [], isEmpty: true },
        { originalRowIndex: 7, cells: [], isEmpty: false },
        { originalRowIndex: 11, cells: [], isEmpty: false },
      ],
    })).toEqual([8, 12]);
  });

  it('returns undefined when spreadsheet metadata is not available', () => {
    expect(getRawRowNumbersFromSheetMetadata(null)).toBeUndefined();
  });
});
