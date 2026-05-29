import { useState } from 'react';
import type { RawRow } from '../../types/import';
import { columnLetter } from '../../domain/import/columnAnalysis';

type RawPreviewProps = {
  rows: RawRow[];
  maxColumns: number;
  activeColumns?: number[];
};

export function RawPreview({ rows, maxColumns, activeColumns }: RawPreviewProps) {
  const [showAllColumns, setShowAllColumns] = useState(false);
  const columns = showAllColumns || !activeColumns?.length ? Array.from({ length: maxColumns }, (_, index) => index) : activeColumns;

  return (
    <>
      {activeColumns ? (
        <label className="checkboxField previewToggle">
          <input
            type="checkbox"
            checked={showAllColumns}
            onChange={(event) => setShowAllColumns(event.target.checked)}
          />
          Ver todas las columnas
        </label>
      ) : null}
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              {columns.map((column) => (
                <th key={column}>{columnLetter(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td>{rowIndex + 1}</td>
                {columns.map((column) => (
                  <td key={column}>{String(row[column] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
