import type { ColumnAnalysis, IgnoredReason } from '../../types/import';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

type ColumnVisibilityManagerProps = {
  columns: ColumnAnalysis[];
  showHeaderColumn?: boolean;
  onChange: (columns: ColumnAnalysis[]) => void;
};

const reasonLabels: Record<IgnoredReason, string> = {
  hidden: 'Oculta',
  narrow: 'Angosta',
  empty: 'Vacía',
  lowData: 'Pocos datos',
  manual: 'Manual',
};

const automaticReasonPluralLabels: Partial<Record<IgnoredReason, string>> = {
  hidden: 'ocultas',
  narrow: 'angostas',
  empty: 'vacías',
  lowData: 'pocos datos',
};

const automaticReasonOrder: IgnoredReason[] = ['empty', 'narrow', 'hidden', 'lowData'];

export function ColumnVisibilityManager({ columns, showHeaderColumn = true, onChange }: ColumnVisibilityManagerProps) {
  const activeCount = columns.filter((column) => !column.ignored).length;
  const ignoredCount = columns.length - activeCount;
  const automaticReasonSummary = buildAutomaticReasonSummary(columns);
  const appliedSuggestionGroups = getAppliedSuggestionGroups(columns);

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

  const updateAlias = (columnIndex: number, alias: string) => {
    onChange(
      columns.map((column) =>
        column.columnIndex === columnIndex
          ? {
              ...column,
              alias,
            }
          : column,
      ),
    );
  };

  const showAll = () => {
    onChange(activateAllColumns(columns));
  };

  const toggleByReasons = (reasons: IgnoredReason[]) => {
    onChange(toggleColumnsByAutomaticReasons(columns, reasons));
  };

  const restoreAutomatic = () => {
    onChange(restoreAutomaticColumnDetection(columns));
  };

  return (
    <div className="columnDetection">
      <div className="columnDetectionHeader">
        <div className="columnDetectionSummary">
          <p>
            {activeCount} columnas activas, {ignoredCount} ignoradas. Puedes reactivar cualquier columna sin perder datos.
          </p>
          {automaticReasonSummary ? <p className="muted">{automaticReasonSummary}</p> : null}
        </div>
        <div className="columnQuickActions">
          <div>
            <strong className="headingWithInfo">
              <span>Acciones rápidas</span>
              <InfoTooltip content="Activa o desactiva grupos sugeridos automaticamente." />
            </strong>
            <p className="muted">Puedes activar o desactivar grupos sugeridos sin perder datos.</p>
          </div>
          <div className="appliedSuggestions" aria-label="Sugerencias aplicadas">
            <span>Sugerencias aplicadas:</span>
            {appliedSuggestionGroups.empty || appliedSuggestionGroups.hiddenOrNarrow ? (
              <>
                {appliedSuggestionGroups.empty ? <span className="suggestionChip">Vacías</span> : null}
                {appliedSuggestionGroups.hiddenOrNarrow ? <span className="suggestionChip">Ocultas o angostas</span> : null}
              </>
            ) : (
              <span className="muted">Ninguna</span>
            )}
          </div>
          <div className="actions columnQuickActionsButtons">
            <InfoTooltip content="Incluye todas las columnas detectadas en la receta.">
              <button type="button" className="secondary" onClick={showAll}>
                Activar todas
              </button>
            </InfoTooltip>
            <InfoTooltip content="Alterna las columnas que parecen no tener datos utiles.">
              <button
                type="button"
                className={`secondary suggestionToggleButton${appliedSuggestionGroups.empty ? ' isActive' : ''}`}
                aria-pressed={appliedSuggestionGroups.empty}
                onClick={() => toggleByReasons(['empty'])}
              >
                Vacías sugeridas
              </button>
            </InfoTooltip>
            <InfoTooltip content="Alterna columnas que el Excel trae ocultas o muy angostas.">
              <button
                type="button"
                className={`secondary suggestionToggleButton${appliedSuggestionGroups.hiddenOrNarrow ? ' isActive' : ''}`}
                aria-pressed={appliedSuggestionGroups.hiddenOrNarrow}
                onClick={() => toggleByReasons(['hidden', 'narrow'])}
              >
                Ocultas o angostas
              </button>
            </InfoTooltip>
            <InfoTooltip content="Vuelve a las sugerencias detectadas al leer el archivo.">
              <button type="button" className="secondary" onClick={restoreAutomatic}>
                Restaurar detección automática
              </button>
            </InfoTooltip>
          </div>
        </div>
      </div>

      <div className="tableWrap columnTable">
        <table>
          <thead>
            <tr>
              <th>Activa</th>
              <th>Columna</th>
              {showHeaderColumn ? <th>Encabezado</th> : null}
              <th>Alias</th>
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
                {showHeaderColumn ? <td>{column.header || '-'}</td> : null}
                <td>
                  <input
                    aria-label={`Alias para columna ${column.columnLetter}`}
                    value={column.alias ?? ''}
                    onChange={(event) => updateAlias(column.columnIndex, event.target.value)}
                    placeholder={column.header || 'Alias visual'}
                  />
                </td>
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

export function activateAllColumns(columns: ColumnAnalysis[]) {
  return columns.map((column) => ({ ...column, ignored: false, ignoredReason: undefined }));
}

export function ignoreColumnsByAutomaticReasons(columns: ColumnAnalysis[], reasons: IgnoredReason[]) {
  return columns.map((column) =>
    column.autoIgnoredReason && reasons.includes(column.autoIgnoredReason)
      ? { ...column, ignored: true, ignoredReason: column.autoIgnoredReason }
      : column,
  );
}

export function toggleColumnsByAutomaticReasons(columns: ColumnAnalysis[], reasons: IgnoredReason[]) {
  const shouldActivateGroup = isAutomaticReasonGroupApplied(columns, reasons);

  return columns.map((column) => {
    if (!column.autoIgnoredReason || !reasons.includes(column.autoIgnoredReason)) {
      return column;
    }

    return shouldActivateGroup
      ? { ...column, ignored: false, ignoredReason: undefined }
      : { ...column, ignored: true, ignoredReason: column.autoIgnoredReason };
  });
}

export function restoreAutomaticColumnDetection(columns: ColumnAnalysis[]) {
  return columns.map((column) => ({
    ...column,
    ignored: column.autoIgnored,
    ignoredReason: column.autoIgnoredReason,
  }));
}

export function getAppliedSuggestionGroups(columns: ColumnAnalysis[]) {
  return {
    empty: isAutomaticReasonGroupApplied(columns, ['empty']),
    hiddenOrNarrow: isAutomaticReasonGroupApplied(columns, ['hidden', 'narrow']),
  };
}

function isAutomaticReasonGroupApplied(columns: ColumnAnalysis[], reasons: IgnoredReason[]) {
  const groupColumns = columns.filter((column) => column.autoIgnoredReason && reasons.includes(column.autoIgnoredReason));
  return groupColumns.length > 0 && groupColumns.every((column) => column.ignored);
}

function buildAutomaticReasonSummary(columns: ColumnAnalysis[]) {
  const counts = columns.reduce<Partial<Record<IgnoredReason, number>>>((nextCounts, column) => {
    if (!column.autoIgnoredReason || column.autoIgnoredReason === 'manual') {
      return nextCounts;
    }

    nextCounts[column.autoIgnoredReason] = (nextCounts[column.autoIgnoredReason] ?? 0) + 1;
    return nextCounts;
  }, {});

  const parts = automaticReasonOrder
    .map((reason) => {
      const count = counts[reason] ?? 0;
      const label = automaticReasonPluralLabels[reason];
      return count > 0 && label ? `${count} ${label}` : '';
    })
    .filter((part) => part !== '');

  return parts.length ? `Motivos automáticos: ${parts.join(', ')}.` : '';
}
