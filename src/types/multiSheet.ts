import type { CombineSource } from './combine';

export type MultiSheetOutputColumnSchema = {
  index: number;
  name: string;
  normalizedName: string;
};

export type MultiSheetOutputSchema = {
  columns: MultiSheetOutputColumnSchema[];
};

export type MultiSheetBatchSheet = {
  id: string;
  fileName: string;
  sheetName?: string;
  status: 'configured' | 'invalid';
  rowCount: number;
  source: CombineSource;
  warnings: string[];
};

export type MultiSheetBatch = {
  id: string;
  fileName?: string;
  outputSchema: MultiSheetOutputSchema | null;
  sheets: MultiSheetBatchSheet[];
};
