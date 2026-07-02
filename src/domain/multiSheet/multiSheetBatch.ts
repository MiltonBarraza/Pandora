import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
} from '../../types/combine';
import type {
  MultiSheetBatch,
  MultiSheetBatchSheet,
  MultiSheetOutputColumnSchema,
  MultiSheetOutputSchema,
} from '../../types/multiSheet';
import type {
  ProcessedExportColumn,
  ProcessedExportResult,
} from '../../types/processedExport';
import { createCombineSourceFromSanitizedResult } from '../combine/createCombineSourceFromSanitizedResult';

export type MultiSheetSchemaValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type AddProcessedResultToMultiSheetBatchResult =
  | {
    ok: true;
    batch: MultiSheetBatch;
    errors: [];
    warnings: string[];
  }
  | {
    ok: false;
    batch: MultiSheetBatch;
    errors: string[];
    warnings: string[];
  };

export type MultiSheetCombinePayload = {
  sources: CombineSource[];
  outputColumns: CombineOutputColumn[];
  mappings: CombineColumnMapping[];
};

export function createEmptyMultiSheetBatch(
  id: string,
  fileName?: string,
): MultiSheetBatch {
  return {
    id,
    ...(fileName === undefined ? {} : { fileName }),
    outputSchema: null,
    sheets: [],
  };
}

export function addProcessedResultToMultiSheetBatch(
  batch: MultiSheetBatch,
  result: ProcessedExportResult,
): AddProcessedResultToMultiSheetBatchResult {
  const sourceFileError = getSourceFileError(batch.fileName, result.sourceFileName);
  if (sourceFileError) {
    return {
      ok: false,
      batch,
      errors: [sourceFileError],
      warnings: [],
    };
  }

  const validation = batch.outputSchema
    ? validateProcessedResultAgainstMultiSheetSchema(result, batch.outputSchema)
    : { valid: true, errors: [], warnings: [] };

  if (!validation.valid) {
    return {
      ok: false,
      batch,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  const outputSchema = batch.outputSchema ?? createMultiSheetOutputSchema(result);
  const fileName = normalizeOptionalFileName(batch.fileName)
    ?? normalizeOptionalFileName(result.sourceFileName);
  const source = createUniqueSource(
    createCombineSourceFromSanitizedResult(result),
    new Set(batch.sheets.map((sheet) => sheet.id)),
  );
  const sheet: MultiSheetBatchSheet = {
    id: source.id,
    fileName: source.fileName,
    sheetName: source.sheetName,
    status: 'configured',
    rowCount: source.rows.length,
    source,
    warnings: [...validation.warnings],
  };

  return {
    ok: true,
    batch: {
      ...batch,
      ...(fileName ? { fileName } : {}),
      outputSchema,
      sheets: [...batch.sheets, sheet],
    },
    errors: [],
    warnings: [...validation.warnings],
  };
}

export function removeSheetFromMultiSheetBatch(
  batch: MultiSheetBatch,
  sheetId: string,
): MultiSheetBatch {
  const sheets = batch.sheets.filter((sheet) => sheet.id !== sheetId);

  if (sheets.length === batch.sheets.length) {
    return batch;
  }

  return {
    ...batch,
    outputSchema: sheets.length === 0 ? null : batch.outputSchema,
    sheets,
  };
}

export function createCombinePayloadFromMultiSheetBatch(
  batch: MultiSheetBatch,
): MultiSheetCombinePayload {
  const sources = batch.sheets.map((sheet) => sheet.source);
  const schemaColumns = [...(batch.outputSchema?.columns ?? [])]
    .sort((left, right) => left.index - right.index);
  const outputColumns = schemaColumns.map((column) => ({
    id: `output:${column.index}`,
    name: column.name,
  }));
  const mappings = sources.flatMap((source) => outputColumns.map((outputColumn, index) => ({
    sourceId: source.id,
    outputColumnId: outputColumn.id,
    sourceColumnId: source.columns.find((column) => column.index === schemaColumns[index].index)?.id ?? null,
  })));

  return { sources, outputColumns, mappings };
}

export function createMultiSheetOutputSchema(
  result: ProcessedExportResult,
): MultiSheetOutputSchema {
  return {
    columns: buildOutputColumns(result.columns),
  };
}

export function validateProcessedResultAgainstMultiSheetSchema(
  result: ProcessedExportResult,
  schema: MultiSheetOutputSchema,
): MultiSheetSchemaValidationResult {
  const actualColumns = buildOutputColumns(result.columns);
  const errors: string[] = [];

  if (actualColumns.length !== schema.columns.length) {
    errors.push(
      `Cantidad de columnas distinta: se esperaban ${schema.columns.length} y se encontraron ${actualColumns.length}.`,
    );
  }

  const comparableColumnCount = Math.min(actualColumns.length, schema.columns.length);

  for (let index = 0; index < comparableColumnCount; index += 1) {
    const expected = schema.columns[index];
    const actual = actualColumns[index];

    if (actual.normalizedName !== expected.normalizedName) {
      errors.push(
        `Columna ${index + 1} distinta: se esperaba "${expected.name}" y se encontró "${actual.name}".`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

function buildOutputColumns(
  columns: ProcessedExportColumn[],
): MultiSheetOutputColumnSchema[] {
  return [...columns]
    .filter((column) => column.enabled)
    .sort((left, right) => left.order - right.order)
    .map((column, index) => {
      const name = column.label.trim() || `Columna ${index + 1}`;

      return {
        index,
        name,
        normalizedName: normalizeMultiSheetColumnName(name),
      };
    });
}

function normalizeMultiSheetColumnName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function createUniqueSource(source: CombineSource, usedIds: Set<string>): CombineSource {
  if (!usedIds.has(source.id)) {
    return source;
  }

  let suffix = 2;
  while (usedIds.has(`${source.id}:${suffix}`)) {
    suffix += 1;
  }

  return { ...source, id: `${source.id}:${suffix}` };
}

function getSourceFileError(batchFileName?: string, resultFileName?: string) {
  const expected = normalizeOptionalFileName(batchFileName);
  const actual = normalizeOptionalFileName(resultFileName);

  if (!expected || !actual || expected.toLocaleLowerCase() === actual.toLocaleLowerCase()) {
    return null;
  }

  return `Archivo fuente distinto: el lote corresponde a "${expected}" y la hoja pertenece a "${actual}".`;
}

function normalizeOptionalFileName(value?: string) {
  return value?.trim() || undefined;
}
