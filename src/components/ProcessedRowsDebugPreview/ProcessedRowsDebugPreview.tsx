import type { CSSProperties } from 'react';
import { getEnabledOutputColumns } from '../../domain/import/outputModel';
import type { OutputColumn, ProcessedRow, RowOverrides } from '../../types/import';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { TruncatedText } from '../ui/TruncatedText/TruncatedText';

export const normalizedPreviewRowLimit = 30;

type NormalizedPreviewTableStyle = CSSProperties & {
  '--normalized-preview-column-count': string;
};

type ProcessedRowsPreviewProps = {
  rows: ProcessedRow[];
  outputColumns: OutputColumn[];
  // Reserved while row selection/status controls stay intentionally hidden from section 8.
  // Overrides still apply upstream and remain available to audit export.
  rowOverrides?: RowOverrides;
  onRowOverridesChange?: (overrides: RowOverrides) => void;
  title?: string;
  note?: string;
};

export function ProcessedRowsPreview({
  rows,
  outputColumns,
  title = 'Vista por columnas de salida',
  note = 'Esta vista muestra el resultado final de las columnas de salida configuradas.',
}: ProcessedRowsPreviewProps) {
  const columns = getEnabledOutputColumns(outputColumns);
  const visibleRows = getVisibleNormalizedPreviewRows(rows);
  const previewRows = getNormalizedPreviewRows(rows);
  const previewSummaryItems = getNormalizedPreviewSummaryItems(rows);
  const previewLimitText = getNormalizedPreviewLimitText(visibleRows.length, previewRows.length);

  return (
    <section className="panel slim">
      <div className="normalizedPreviewTitleRow">
        <h3 className="headingWithInfo">
          <span>{title}</span>
          {note ? <InfoTooltip content={note} /> : null}
        </h3>
      </div>
      <div className="normalizedPreviewSummary summaryMetricList" aria-label="Resumen de filas">
        <span className="summaryMetricGroupLabel">Filas:</span>
        {previewSummaryItems.map((item) => (
          <span className="normalizedPreviewSummaryChip summaryMetricChip" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </span>
        ))}
      </div>
      <p className="muted normalizedPreviewLimit">{previewLimitText}</p>
      {columns.length === 0 ? <p className="muted">No hay columnas de salida configuradas.</p> : null}
      {columns.length > 0 ? (
        <div className="tableWrap small">
          <table
            className="normalizedPreviewTable"
            style={{ '--normalized-preview-column-count': String(columns.length) } as NormalizedPreviewTableStyle}
          >
            <colgroup>
              {columns.map((column) => (
                <col key={column.id} className="normalizedPreviewDataColumn" />
              ))}
            </colgroup>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.id}>
                    <TruncatedText text={column.label} tooltipThreshold={14} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>Sin filas para mostrar</td>
                </tr>
              ) : (
                previewRows.map((row) => (
                  <tr key={row.rowNumber}>
                    {columns.map((column) => (
                      <td key={column.id}>
                        <TruncatedText text={row.outputValues[column.id] ?? ''} tooltipThreshold={24} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export function getNormalizedPreviewRows(rows: ProcessedRow[]) {
  return getVisibleNormalizedPreviewRows(rows).slice(0, normalizedPreviewRowLimit);
}

export function getVisibleNormalizedPreviewRows(rows: ProcessedRow[]) {
  return rows.filter((row) => row.status !== 'ignored');
}

export function getNormalizedPreviewRowCountLabel(rowCount: number) {
  return `${rowCount} ${rowCount === 1 ? 'fila' : 'filas'}`;
}

export function getNormalizedPreviewLimitText(totalRows: number, shownRows: number) {
  if (totalRows > normalizedPreviewRowLimit) {
    return `Vista previa: ${shownRows} de ${totalRows} filas mostradas.`;
  }

  return `Vista previa: ${shownRows} ${shownRows === 1 ? 'fila mostrada' : 'filas mostradas'}.`;
}

export function getNormalizedPreviewSummaryItems(rows: ProcessedRow[]) {
  const includedCount = rows.filter((row) => row.status === 'included').length;
  const ignoredCount = rows.filter((row) => row.status === 'ignored').length;
  const errorCount = rows.filter((row) => row.status === 'error').length;
  return [
    { label: 'Procesadas', value: rows.length },
    { label: 'Incluidas', value: includedCount },
    { label: 'Excluidas por filtros', value: ignoredCount },
    { label: 'Con errores', value: errorCount },
  ];
}
