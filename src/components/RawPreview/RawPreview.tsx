import type { CSSProperties } from 'react';
import { columnLetter } from '../../domain/import/columnAnalysis';
import type { RawRow } from '../../types/import';
import { TruncatedText } from '../ui/TruncatedText/TruncatedText';

type RawPreviewProps = {
  rows: RawRow[];
  maxColumns: number;
  activeColumns?: number[];
  columnLabels?: Record<number, string>;
  rowNumbers?: number[];
  rowNumberOffset?: number;
};

type RawPreviewTableStyle = CSSProperties & {
  '--raw-preview-column-count': string;
};

export function RawPreview({
  rows,
  maxColumns,
  activeColumns,
  columnLabels,
  rowNumbers,
  rowNumberOffset = 0,
}: RawPreviewProps) {
  const columns = getRawPreviewColumns({
    maxColumns,
    activeColumns,
  });
  const previewRows = rows.slice(0, 30);

  return (
    <>
      {columns.length === 0 ? (
        <div className="emptyState rawPreviewEmptyState">
          No hay columnas activas para previsualizar. Activá columnas en Columnas detectadas.
        </div>
      ) : (
        <div className="tableWrap rawPreviewTableWrap">
          <table
            className="rawPreviewTable"
            style={{ '--raw-preview-column-count': String(columns.length) } as RawPreviewTableStyle}
          >
            <colgroup>
              <col className="rawPreviewRowNumberColumn" />
              {columns.map((column) => (
                <col key={column} className="rawPreviewDataColumn" />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                {columns.map((column) => (
                  <th key={column} className="rawPreviewColumnHeader">
                    <TruncatedText text={getRawPreviewColumnLabel(column, columnLabels)} tooltipThreshold={14} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td>{getRawPreviewRowNumber(rowIndex, rowNumberOffset, rowNumbers)}</td>
                  {columns.map((column) => (
                    <td key={column}>{String(row[column] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function getRawPreviewRowNumber(rowIndex: number, rowNumberOffset = 0, rowNumbers?: number[]) {
  return rowNumbers?.[rowIndex] ?? rowNumberOffset + rowIndex + 1;
}

export function getRawPreviewColumns({
  maxColumns,
  activeColumns,
}: {
  maxColumns: number;
  activeColumns?: number[];
}) {
  return activeColumns ?? Array.from({ length: maxColumns }, (_, index) => index);
}

export function getRawPreviewColumnLabel(columnIndex: number, columnLabels?: Record<number, string>) {
  const label = columnLabels?.[columnIndex]?.trim();
  return label || columnLetter(columnIndex);
}
