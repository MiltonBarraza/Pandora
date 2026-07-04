import { describe, expect, it } from 'vitest';
import type { CombineColumnMapping, CombineOutputColumn, CombineSource } from '../../../types/combine';
import { buildCombinedRows } from '../buildCombinedRows';
import { buildCombinedExportAoA } from '../exportCombinedXlsx';
import { sortCombinedRows } from '../sortCombinedRows';
import { addSourceMetadataToRows, buildSourceMetadataColumns } from '../sourceMetadata';

describe('combine volume', () => {
  it('builds, enriches, sorts and exports a reasonable multi-source dataset', () => {
    const sources = createSources(5, 600, 8);
    const outputColumns: CombineOutputColumn[] = Array.from({ length: 8 }, (_, index) => ({
      id: `output:${index}`,
      name: `Salida ${index + 1}`,
    }));
    const mappings: CombineColumnMapping[] = sources.flatMap((source) => outputColumns.map((column, index) => ({
      sourceId: source.id,
      outputColumnId: column.id,
      sourceColumnId: `column:${index}`,
    })));
    const sourceRowsBefore = sources.map((source) => source.rows);

    const combinedRows = buildCombinedRows({ sources, outputColumns, mappings });
    const metadataOptions = { includeFileName: true, includeSheetName: true };
    const finalColumns = [...outputColumns, ...buildSourceMetadataColumns(metadataOptions)];
    const finalRows = sortCombinedRows(
      addSourceMetadataToRows(combinedRows, metadataOptions),
      { columnId: 'output:0', direction: 'desc' },
    );
    const exportAoA = buildCombinedExportAoA({ outputColumns: finalColumns, combinedRows: finalRows });

    expect(finalRows).toHaveLength(3000);
    expect(finalColumns).toHaveLength(10);
    expect(exportAoA).toHaveLength(3001);
    expect(exportAoA.every((row) => row.length === 10)).toBe(true);
    expect(finalRows[0].values['metadata:fileName']).toMatch(/^fuente-\d\.xlsx$/);
    expect(sources.map((source) => source.rows)).toEqual(sourceRowsBefore);
  });
});

function createSources(sourceCount: number, rowCount: number, columnCount: number): CombineSource[] {
  return Array.from({ length: sourceCount }, (_, sourceIndex) => ({
    id: `source:${sourceIndex}`,
    fileName: `fuente-${sourceIndex}.xlsx`,
    sheetName: `Hoja ${sourceIndex + 1}`,
    columns: Array.from({ length: columnCount }, (_, columnIndex) => ({
      id: `column:${columnIndex}`,
      name: `Columna ${columnIndex + 1}`,
      index: columnIndex,
    })),
    rows: Array.from({ length: rowCount }, (_, rowIndex) => ({
      id: `row:${rowIndex}`,
      values: Object.fromEntries(Array.from({ length: columnCount }, (_, columnIndex) => [
        `column:${columnIndex}`,
        String(sourceIndex * rowCount + rowIndex + columnIndex),
      ])),
    })),
  }));
}
