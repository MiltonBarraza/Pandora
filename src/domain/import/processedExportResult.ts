import type { OutputColumn, ProcessedRow } from '../../types/import';
import type { ProcessedExportResult } from '../../types/processedExport';

export function getProcessedExportAvailability(
  rows: ProcessedRow[],
  outputColumns: OutputColumn[],
) {
  if (!outputColumns.some((column) => column.enabled)) {
    return {
      exportable: false,
      disabledReason: 'Configurá al menos una columna de salida habilitada.',
    };
  }

  if (!rows.some((row) => row.status === 'included')) {
    return {
      exportable: false,
      disabledReason: 'No hay filas incluidas para guardar.',
    };
  }

  return { exportable: true, disabledReason: '' };
}

export function createProcessedExportResult({
  rows,
  outputColumns,
  fileBaseName,
  sourceFileName,
  sheetName,
}: {
  rows: ProcessedRow[];
  outputColumns: OutputColumn[];
  fileBaseName: string;
  sourceFileName?: string;
  sheetName?: string;
}): ProcessedExportResult {
  return {
    id: createProcessedExportId(),
    fileBaseName,
    sourceFileName: sourceFileName || undefined,
    sheetName: sheetName || undefined,
    columns: outputColumns.map(({ id, label, order, enabled }) => ({ id, label, order, enabled })),
    rows: rows
      .filter((row) => row.status === 'included')
      .map((row) => ({
        status: 'included',
        outputValues: { ...row.outputValues },
      })),
  };
}

function createProcessedExportId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `processed-export:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
