import { describe, expect, it } from 'vitest';
import { shouldProtectWizardState } from '../ImportWizard';

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
