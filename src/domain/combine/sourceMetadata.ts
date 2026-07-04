import type {
  CombinedRow,
  CombineOutputColumn,
  SourceMetadataOptions,
} from '../../types/combine';

export const sourceFileNameColumnId = 'metadata:fileName';
export const sourceSheetNameColumnId = 'metadata:sheetName';

export function buildSourceMetadataColumns(
  options: SourceMetadataOptions,
): CombineOutputColumn[] {
  return [
    ...(options.includeFileName
      ? [{ id: sourceFileNameColumnId, name: 'Archivo origen' }]
      : []),
    ...(options.includeSheetName
      ? [{ id: sourceSheetNameColumnId, name: 'Hoja origen' }]
      : []),
  ];
}

export function addSourceMetadataToRows(
  rows: CombinedRow[],
  options: SourceMetadataOptions,
): CombinedRow[] {
  if (!options.includeFileName && !options.includeSheetName) {
    return rows;
  }

  return rows.map((row) => ({
    ...row,
    values: {
      ...row.values,
      ...(options.includeFileName ? { [sourceFileNameColumnId]: row.sourceFileName } : {}),
      ...(options.includeSheetName ? { [sourceSheetNameColumnId]: row.sourceSheetName ?? '' } : {}),
    },
  }));
}

export function isSourceMetadataColumn(columnId: string) {
  return columnId === sourceFileNameColumnId || columnId === sourceSheetNameColumnId;
}
