import { columnLetter } from '../../domain/import/columnAnalysis';
import type { RawRow } from '../../types/import';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

type RawPreviewProps = {
  rows: RawRow[];
  maxColumns: number;
  activeColumns?: number[];
  dataColumns?: number[];
  rowNumberOffset?: number;
  showAllColumns?: boolean;
  showDataColumns?: boolean;
  showHiddenColumnsToggle?: boolean;
  showDataColumnsToggle?: boolean;
  onShowAllColumnsChange?: (showAllColumns: boolean) => void;
  onShowDataColumnsChange?: (showDataColumns: boolean) => void;
};

export function RawPreview({
  rows,
  maxColumns,
  activeColumns,
  dataColumns,
  rowNumberOffset = 0,
  showAllColumns = false,
  showDataColumns = false,
  showHiddenColumnsToggle = false,
  showDataColumnsToggle = false,
  onShowAllColumnsChange,
  onShowDataColumnsChange,
}: RawPreviewProps) {
  const columns = getRawPreviewColumns({
    maxColumns,
    activeColumns,
    dataColumns,
    showAllColumns,
    showDataColumns,
  });
  const previewRows = rows.slice(0, 30);

  return (
    <>
      {showHiddenColumnsToggle || showDataColumnsToggle ? (
        <div className="rawPreviewOptions">
          {showHiddenColumnsToggle ? (
            <label className="checkboxField">
              <input
                type="checkbox"
                checked={showAllColumns}
                onChange={(event) => onShowAllColumnsChange?.(event.target.checked)}
              />
              <span className="labelWithInfo">
                <span>Mostrar columnas ocultas por detección</span>
                <InfoTooltip content="Incluye columnas ocultas por estar vacías, tener pocos datos o ancho muy reducido." />
              </span>
            </label>
          ) : null}
          {showDataColumnsToggle ? (
            <label className="checkboxField">
              <input
                type="checkbox"
                checked={showDataColumns}
                onChange={(event) => onShowDataColumnsChange?.(event.target.checked)}
              />
              <span className="labelWithInfo">
                <span>Mostrar columnas con datos</span>
                <InfoTooltip content="Muestra columnas con al menos un valor, aunque la detección las haya ocultado." />
              </span>
            </label>
          ) : null}
          <p className="muted">La detección puede ocultar columnas vacías, con pocos datos o de ancho muy reducido.</p>
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
                <td>{rowNumberOffset + rowIndex + 1}</td>
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

export function getRawPreviewColumns({
  maxColumns,
  activeColumns,
  dataColumns,
  showAllColumns,
  showDataColumns,
}: {
  maxColumns: number;
  activeColumns?: number[];
  dataColumns?: number[];
  showAllColumns?: boolean;
  showDataColumns?: boolean;
}) {
  if (showAllColumns) {
    return Array.from({ length: maxColumns }, (_, index) => index);
  }

  if (showDataColumns) {
    return dataColumns ?? [];
  }

  return activeColumns?.length ? activeColumns : Array.from({ length: maxColumns }, (_, index) => index);
}
