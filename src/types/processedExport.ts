export type ProcessedExportColumn = {
  id: string;
  label: string;
  order: number;
  enabled: boolean;
};

export type ProcessedExportRow = {
  id?: string;
  status: 'included' | 'excluded';
  outputValues: Record<string, string>;
};

export type ProcessedExportResult = {
  id: string;
  fileBaseName: string;
  sourceFileName?: string;
  sheetName?: string;
  columns: ProcessedExportColumn[];
  rows: ProcessedExportRow[];
};
