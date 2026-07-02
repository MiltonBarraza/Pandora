import type {
  MultiSheetOutputColumnSchema,
  MultiSheetOutputSchema,
} from '../../types/multiSheet';
import type {
  ProcessedExportColumn,
  ProcessedExportResult,
} from '../../types/processedExport';

export type MultiSheetSchemaValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

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
