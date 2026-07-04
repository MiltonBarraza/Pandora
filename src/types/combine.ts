import type { WorkBook } from 'xlsx';

export type ColumnAssignmentMode = 'name' | 'position';

export type CombineSourceColumn = {
  id: string;
  name: string;
  index: number;
};

export type CombineSourceRow = {
  id: string;
  values: Record<string, string>;
};

export type CombineSource = {
  id: string;
  fileName: string;
  sheetName?: string;
  columns: CombineSourceColumn[];
  rows: CombineSourceRow[];
};

export type LoadedCombineSource =
  | {
      kind: 'csv';
      source: CombineSource;
    }
  | {
      kind: 'excel';
      source: CombineSource;
      sheetNames: string[];
      workbook: WorkBook;
    }
  | {
      kind: 'static';
      source: CombineSource;
    };

export type CombineOutputColumn = {
  id: string;
  name: string;
};

export type CombineColumnMapping = {
  sourceId: string;
  outputColumnId: string;
  sourceColumnId: string | null;
};

export type CombinedRow = {
  id: string;
  sourceId: string;
  sourceFileName: string;
  sourceSheetName?: string;
  values: Record<string, string>;
};
