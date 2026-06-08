import { getEnabledOutputColumns } from '../../domain/import/outputModel';
import type { OutputColumn, ProcessedRow, RowOverrides } from '../../types/import';

export const normalizedPreviewRowLimit = 30;

type ProcessedRowsPreviewProps = {
  rows: ProcessedRow[];
  outputColumns: OutputColumn[];
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
  const previewRows = getNormalizedPreviewRows(rows);
  const previewSummary = getNormalizedPreviewSummary(rows);
  const previewLimitText = getNormalizedPreviewLimitText(rows.length, previewRows.length);

  return (
    <section className="panel slim">
      <h3>{title}</h3>
      {note ? <p className="muted">{note}</p> : null}
      <p className="muted normalizedPreviewSummary">{previewSummary}</p>
      <p className="muted normalizedPreviewLimit">{previewLimitText}</p>
      {columns.length === 0 ? <p className="muted">No hay columnas de salida configuradas.</p> : null}
      {columns.length > 0 ? (
        <div className="tableWrap small">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.id}>{column.label}</th>
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
                      <td key={column.id}>{row.outputValues[column.id] ?? ''}</td>
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

export function ProcessedRowsDebugPreview(props: ProcessedRowsPreviewProps) {
  return <ProcessedRowsPreview title="Preview experimental del nuevo modelo" {...props} />;
}

export function getNormalizedPreviewRows(rows: ProcessedRow[]) {
  return rows.slice(0, normalizedPreviewRowLimit);
}

export function getNormalizedPreviewLimitText(totalRows: number, shownRows: number) {
  if (totalRows > normalizedPreviewRowLimit) {
    return `Vista previa normalizada: ${shownRows} de ${totalRows} filas.`;
  }

  return 'Vista previa normalizada: se muestran hasta 30 filas.';
}

export function getNormalizedPreviewSummary(rows: ProcessedRow[]) {
  const includedCount = rows.filter((row) => row.status === 'included').length;
  const ignoredCount = rows.filter((row) => row.status === 'ignored').length;
  const errorCount = rows.filter((row) => row.status === 'error').length;
  const parts = [
    `${rows.length} filas procesadas.`,
    `${includedCount} incluidas`,
    `${ignoredCount} excluidas por filtros`,
    `${errorCount} con errores`,
  ];

  return `${parts[0]} ${parts.slice(1).join(', ')}.`;
}
