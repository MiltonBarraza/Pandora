import { describe, expect, it } from 'vitest';
import {
  applyActiveColumnVisualOrder,
  getExcelRowNumberForInternalIndex,
  getHeaderRowOptions,
  getInternalDataStartIndexForExcelRowNumber,
  getInternalIndexForExcelRowNumber,
  getManualRangeRowsForVisibleOutput,
  getRawPreviewRows,
  getRawPreviewRowNumbers,
  getRowConfigurationError,
  getStartRowInputValidationError,
  headerRowOptionsHelpText,
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
    expect(getRawPreviewRowNumbers(rowMetadata, 10, true)).toEqual([10, 11]);
  });

  it('keeps a valid empty Excel row as the preview start', () => {
    expect(getRawPreviewRowNumbers(rowMetadata, 9, true)).toEqual([9, 10, 11]);
    expect(getRawPreviewRows([['A8'], ['A10'], ['A11']], rowMetadata, 9, true)).toEqual([
      [],
      ['A10'],
      ['A11'],
    ]);
  });

  it('keeps CSV fallback behavior when metadata is absent', () => {
    expect(getRawPreviewRowNumbers([], 2, true)).toBeUndefined();
    expect(getRawPreviewRows([['A1'], ['A2'], ['A3']], [], 2, true)).toEqual([['A2'], ['A3']]);
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

  it('keeps data start on a valid empty Excel row without normalizing the visible value', () => {
    expect(getInternalDataStartIndexForExcelRowNumber(rowMetadata, 9)).toBe(1);
  });

  it('keeps previous index-based behavior without metadata', () => {
    expect(getExcelRowNumberForInternalIndex([], 5)).toBe(6);
    expect(getInternalIndexForExcelRowNumber([], 6)).toBe(5);
    expect(getInternalDataStartIndexForExcelRowNumber([], 6)).toBe(5);
  });
});

describe('ImportWizard row configuration validation', () => {
  const rowMetadata = [
    { internalRowIndex: 0, excelRowNumber: 3 },
    { internalRowIndex: 1, excelRowNumber: 7 },
  ];

  it('requires the header row to be before the first data row', () => {
    expect(getRowConfigurationError(0, rowMetadata, 4)).toBe('');
    expect(getRowConfigurationError(1, rowMetadata, 7)).toBe('La fila de encabezados debe estar antes de la primera fila de datos.');
    expect(getRowConfigurationError(1, rowMetadata, 6)).toBe('La fila de encabezados debe estar antes de la primera fila de datos.');
  });

  it('keeps the row configuration error visible text stable', () => {
    expect(getRowConfigurationError(0, [], 1)).toBe('La fila de encabezados debe estar antes de la primera fila de datos.');
  });

  it('validates start row input without replacing invalid values', () => {
    expect(getStartRowInputValidationError('5')).toBe('');
    expect(getStartRowInputValidationError('')).toBe('Ingresá una primera fila de datos.');
    expect(getStartRowInputValidationError('0')).toBe('Usá un número entero mayor o igual a 1.');
    expect(getStartRowInputValidationError('1.5')).toBe('Usá un número entero mayor o igual a 1.');
  });
});

describe('ImportWizard header row options', () => {
  it('lists only content rows from spreadsheet metadata and documents that behavior', () => {
    expect(getHeaderRowOptions([
      { internalRowIndex: 0, excelRowNumber: 1 },
      { internalRowIndex: 1, excelRowNumber: 6 },
    ], 6)).toEqual([
      { value: 'none', label: 'Sin encabezados' },
      { value: '1', label: 'Fila 1' },
      { value: '6', label: 'Fila 6' },
    ]);
    expect(headerRowOptionsHelpText).toContain('Solo se muestran filas con contenido.');
  });

  it('keeps every row option for CSV rows without spreadsheet metadata', () => {
    expect(getHeaderRowOptions([], 3)).toEqual([
      { value: 'none', label: 'Sin encabezados' },
      { value: '1', label: 'Fila 1' },
      { value: '2', label: 'Fila 2' },
      { value: '3', label: 'Fila 3' },
    ]);
  });
});

describe('ImportWizard active column visual order', () => {
  it('orders active input columns for output generation using the visual order', () => {
    const inputColumns = [
      inputColumn(0, true),
      inputColumn(1, true),
      inputColumn(2, false),
      inputColumn(3, true),
    ];

    expect(applyActiveColumnVisualOrder(inputColumns, [3, 0]).map((column) => column.columnIndex)).toEqual([3, 0, 1, 2]);
  });

  it('keeps original column order when no visual order was set', () => {
    const inputColumns = [
      inputColumn(0, true),
      inputColumn(1, true),
      inputColumn(2, false),
    ];

    expect(applyActiveColumnVisualOrder(inputColumns, []).map((column) => column.columnIndex)).toEqual([0, 1, 2]);
  });
});

describe('ImportWizard manual range rows', () => {
  it('excludes rows removed by input/output filters and row overrides', () => {
    const inputRows = [
      { rowNumber: 42, values: { 'input-0': 'A' } },
      { rowNumber: 44, values: { 'input-0': 'B' } },
      { rowNumber: 46, values: { 'input-0': 'C' } },
    ];
    const processedRows = [
      { rowNumber: 42, inputValues: {}, outputValues: {}, status: 'included' as const },
      { rowNumber: 44, inputValues: {}, outputValues: {}, status: 'ignored' as const },
      { rowNumber: 46, inputValues: {}, outputValues: {}, status: 'included' as const },
    ];

    expect(getManualRangeRowsForVisibleOutput(inputRows, processedRows).map((row) => row.rowNumber)).toEqual([42, 46]);
  });

  it('keeps input-filtered rows available before output rows exist', () => {
    const inputRows = [{ rowNumber: 42, values: { 'input-0': 'A' } }];
    expect(getManualRangeRowsForVisibleOutput(inputRows, [])).toBe(inputRows);
  });
});

function inputColumn(columnIndex: number, active: boolean) {
  return {
    id: `input-${columnIndex}`,
    columnIndex,
    columnLetter: String.fromCharCode(65 + columnIndex),
    label: String.fromCharCode(65 + columnIndex),
    active,
    sampleValues: [],
    nonEmptyCount: 0,
  };
}
