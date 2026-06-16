import { columnLetter } from '../../domain/import/columnAnalysis';
import type { RawRow } from '../../types/import';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

type RawPreviewProps = {
  rows: RawRow[];
  maxColumns: number;
  activeColumns?: number[];
  rowNumbers?: number[];
  rowNumberOffset?: number;
  showAllColumns?: boolean;
  showHiddenColumnsToggle?: boolean;
  onShowAllColumnsChange?: (showAllColumns: boolean) => void;
};

export function RawPreview({
  rows,
  maxColumns,
  activeColumns,
  rowNumbers,
  rowNumberOffset = 0,
  showAllColumns = false,
  showHiddenColumnsToggle = false,
  onShowAllColumnsChange,
}: RawPreviewProps) {
  const columns = showAllColumns || !activeColumns?.length ? Array.from({ length: maxColumns }, (_, index) => index) : activeColumns;
  const previewRows = rows.slice(0, 30);

  return (
    <>
      {showHiddenColumnsToggle ? (
        <div className="rawPreviewOptions">
          <label className="checkboxField">
            <input
              type="checkbox"
              checked={showAllColumns}
              onChange={(event) => onShowAllColumnsChange?.(event.target.checked)}
            />
            <span className="labelWithInfo">
              <span>Mostrar columnas ocultadas automáticamente</span>
              <InfoTooltip content="Muestra columnas que fueron sugeridas como no utiles." />
            </span>
          </label>
          <p className="muted">Algunas columnas pueden ocultarse automáticamente porque no están vacías, no tienen ancho o tienen pocos datos.</p>
        </div>
      ) : null}
      <div className="tableWrap rawPreviewTableWrap">
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
    </>
  );
}

export function getRawPreviewRowNumber(rowIndex: number, rowNumberOffset = 0, rowNumbers?: number[]) {
  return rowNumbers?.[rowIndex] ?? rowNumberOffset + rowIndex + 1;
}
