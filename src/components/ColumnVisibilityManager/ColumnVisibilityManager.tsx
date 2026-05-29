import type { ColumnAnalysis, IgnoredReason } from '../../types/import';

type ColumnVisibilityManagerProps = {
  columns: ColumnAnalysis[];
  onChange: (columns: ColumnAnalysis[]) => void;
};

const reasonLabels: Record<IgnoredReason, string> = {
  hidden: 'Oculta',
  narrow: 'Angosta',
  empty: 'Vacia',
  lowData: 'Pocos datos',
  manual: 'Manual',
};

export function ColumnVisibilityManager({ columns, onChange }: ColumnVisibilityManagerProps) {
  const activeCount = columns.filter((column) => !column.ignored).length;
  const ignoredCount = columns.length - activeCount;

  const updateColumn = (columnIndex: number, ignored: boolean) => {
    onChange(
      columns.map((column) =>
        column.columnIndex === columnIndex
          ? {
              ...column,
              ignored,
              ignoredReason: ignored ? 'manual' : undefined,
            }
          : column,
      ),
    );
  };

  const showAll = () => {
    onChange(columns.map((column) => ({ ...column, ignored: false, ignoredReason: undefined })));
  };

  const hideByReasons = (reasons: IgnoredReason[]) => {
    onChange(
      columns.map((column) =>
        column.autoIgnoredReason && reasons.includes(column.autoIgnoredReason)
          ? { ...column, ignored: true, ignoredReason: column.autoIgnoredReason }
          : column,
      ),
    );
  };

  const restoreAutomatic = () => {
    onChange(
      columns.map((column) => ({
        ...column,
        ignored: column.autoIgnored,
        ignoredReason: column.autoIgnoredReason,
      })),
    );
  };

  return (
    <div className="columnDetection">
      <div className="sectionHeader">
        <p>
          {activeCount} activas, {ignoredCount} ignoradas. Puedes reactivar cualquier columna sin perder datos.
        </p>
        <div className="actions compactActions">
          <button type="button" className="secondary" onClick={showAll}>
            Mostrar todas
          </button>
          <button type="button" className="secondary" onClick={() => hideByReasons(['empty'])}>
            Ocultar vacias
          </button>
          <button type="button" className="secondary" onClick={() => hideByReasons(['hidden', 'narrow'])}>
            Ocultar ocultas/angostas
          </button>
          <button type="button" className="secondary" onClick={restoreAutomatic}>
            Restaurar sugerencia automatica
          </button>
        </div>
      </div>

      <div className="tableWrap columnTable">
        <table>
          <thead>
            <tr>
              <th>Activa</th>
              <th>Columna</th>
              <th>Encabezado</th>
              <th>Ejemplos</th>
              <th>Datos</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column) => (
              <tr key={column.columnIndex} className={column.ignored ? 'mutedRow' : undefined}>
                <td>
                  <input
                    aria-label={`Activar columna ${column.columnLetter}`}
                    type="checkbox"
                    checked={!column.ignored}
                    onChange={(event) => updateColumn(column.columnIndex, !event.target.checked)}
                  />
                </td>
                <td>
                  <strong>{column.columnLetter}</strong>
                </td>
                <td>{column.header || '-'}</td>
                <td>{column.sampleValues.join(' | ') || '-'}</td>
                <td>{column.nonEmptyCount}</td>
                <td>{column.ignoredReason ? reasonLabels[column.ignoredReason] : 'Activa'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
