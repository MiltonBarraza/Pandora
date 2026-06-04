import { getEnabledOutputColumns } from '../../domain/import/outputModel';
import { useState } from 'react';
import type { OutputColumn, ProcessedRow, RowOverrides } from '../../types/import';

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
  rowOverrides = {},
  onRowOverridesChange,
  title = 'Vista por columnas de salida',
  note = 'Esta vista refleja columnas de salida y recetas simples. Transformaciones complejas, numericas y condiciones siguen pendientes de migracion.',
}: ProcessedRowsPreviewProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const columns = getEnabledOutputColumns(outputColumns);

  const updateOverride = (rowNumber: number, include: boolean) => {
    onRowOverridesChange?.({
      ...rowOverrides,
      [rowNumber]: include
        ? { status: 'included', reason: 'Incluida manualmente' }
        : { status: 'ignored', reason: 'Ignorada manualmente' },
    });
  };

  const includeAll = () => {
    onRowOverridesChange?.(Object.fromEntries(rows.map((row) => [row.rowNumber, { status: 'included', reason: 'Incluida manualmente' }])));
    setSelectedRows(new Set());
  };

  const ignoreSelected = () => {
    onRowOverridesChange?.({
      ...rowOverrides,
      ...Object.fromEntries([...selectedRows].map((rowNumber) => [rowNumber, { status: 'ignored', reason: 'Ignorada manualmente' }])),
    });
    setSelectedRows(new Set());
  };

  const toggleSelected = (rowNumber: number, selected: boolean) => {
    const nextRows = new Set(selectedRows);
    if (selected) {
      nextRows.add(rowNumber);
    } else {
      nextRows.delete(rowNumber);
    }
    setSelectedRows(nextRows);
  };

  return (
    <section className="panel slim">
      <h3>{title}</h3>
      {note ? <p className="muted">{note}</p> : null}
      {onRowOverridesChange ? (
        <div className="actions compactActions">
          <button type="button" className="secondary" onClick={includeAll}>Incluir todas</button>
          <button type="button" className="secondary" disabled={selectedRows.size === 0} onClick={ignoreSelected}>Ignorar seleccionadas</button>
        </div>
      ) : null}
      <div className="tableWrap small">
        <table>
          <thead>
            <tr>
              {onRowOverridesChange ? <th>Seleccionar</th> : null}
              {onRowOverridesChange ? <th>Incluir</th> : null}
              <th>Estado</th>
              <th>Fila</th>
              {columns.map((column) => (
                <th key={column.id}>{column.label}</th>
              ))}
              <th>Motivo/Error</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onRowOverridesChange ? 5 : 3)}>Sin filas para mostrar</td>
              </tr>
            ) : (
              rows.slice(0, 200).map((row) => {
                const status = row.status;
                const reason = row.ignoredReason || row.error || '';

                return (
                  <tr key={row.rowNumber} className={status === 'ignored' ? 'mutedRow' : undefined}>
                    {onRowOverridesChange ? (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(row.rowNumber)}
                          onChange={(event) => toggleSelected(row.rowNumber, event.target.checked)}
                        />
                      </td>
                    ) : null}
                    {onRowOverridesChange ? (
                      <td>
                        <input
                          type="checkbox"
                          checked={status === 'included'}
                          onChange={(event) => updateOverride(row.rowNumber, event.target.checked)}
                        />
                      </td>
                    ) : null}
                    <td>{statusLabel(status)}</td>
                    <td>{row.rowNumber}</td>
                    {columns.map((column) => (
                      <td key={column.id}>{row.outputValues[column.id] ?? ''}</td>
                    ))}
                    <td className={status === 'error' ? 'errorText' : undefined}>{reason}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ProcessedRowsDebugPreview(props: ProcessedRowsPreviewProps) {
  return <ProcessedRowsPreview title="Preview experimental del nuevo modelo" {...props} />;
}

function statusLabel(status: ProcessedRow['status']) {
  if (status === 'ignored') {
    return 'Ignorada';
  }

  if (status === 'error') {
    return 'Con error';
  }

  return 'Incluida';
}
