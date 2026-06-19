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
const hiddenSuggestedReasons: IgnoredReason[] = ['hidden', 'narrow'];
type AppliedFilterState = {
  empty: boolean;
  hidden: boolean;
  customLabel?: string;
};

export function ColumnVisibilityManager({ columns, showHeaderColumn = true, onChange }: ColumnVisibilityManagerProps) {
  const activeCount = columns.filter((column) => !column.ignored).length;
  const ignoredCount = columns.length - activeCount;
  const automaticReasonSummary = buildAutomaticReasonSummary(columns);
  const appliedFilters = getAppliedFilterState(columns);

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
            {activeCount} columnas activas, {ignoredCount} ignoradas. Puedes activar columnas manualmente o usar filtros sugeridos.
          </p>
          {automaticReasonSummary ? <p className="muted">{automaticReasonSummary}</p> : null}
        </div>
        <div className="columnQuickActions">
          <div>
            <strong className="headingWithInfo">
              <span>Acciones rápidas</span>
              <InfoTooltip content="Usa filtros sugeridos por la detección o activa columnas manualmente." />
            </strong>
            <p className="muted">Los filtros solo cambian qué columnas quedan activas; no eliminan datos.</p>
            <div className="actions">
              <label className="checkboxField">
                <input
                  type="checkbox"
                  checked={appliedFilters.empty}
                  onChange={() => toggleByReasons(['empty'])}
                />
                Vacías sugeridas
              </label>
              <label className="checkboxField">
                <input
                  type="checkbox"
                  checked={appliedFilters.hidden}
                  onChange={() => toggleByReasons(hiddenSuggestedReasons)}
                />
                Ocultas sugeridas
              </label>
            </div>
          </div>
          <div className="actions columnQuickActionsButtons">
            <InfoTooltip content="Incluye todas las columnas detectadas en la receta.">
              <button type="button" className="secondary" onClick={showAll}>
                Activar todas
              </button>
            </InfoTooltip>
            <InfoTooltip content="Vuelve a las sugerencias detectadas al leer el archivo.">
              <button type="button" className="secondary" onClick={restoreAutomatic}>
                Restaurar filtros sugeridos
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
  const appliedFilters = getAppliedFilterState(columns);

  return {
    empty: appliedFilters.empty,
    hiddenOrNarrow: appliedFilters.hidden,
  };
}

function isAutomaticReasonGroupApplied(columns: ColumnAnalysis[], reasons: IgnoredReason[]) {
  const groupColumns = columns.filter((column) => column.autoIgnoredReason && reasons.includes(column.autoIgnoredReason));
  return groupColumns.length > 0 && groupColumns.every((column) => column.ignored);
}

export function getAppliedFilterState(columns: ColumnAnalysis[]): AppliedFilterState {
  const ignoredColumnIndexes = columns.filter((column) => column.ignored).map((column) => column.columnIndex);
  const emptyColumnIndexes = getSuggestedColumnIndexes(columns, ['empty']);
  const hiddenColumnIndexes = getSuggestedColumnIndexes(columns, hiddenSuggestedReasons);
  const suggestedIgnoredColumnIndexes = columns.filter((column) => column.autoIgnored).map((column) => column.columnIndex);

  if (uniqueNumbers(ignoredColumnIndexes).length === 0) {
    return { empty: false, hidden: false };
  }

  const empty = emptyColumnIndexes.length > 0 && containsEveryNumber(ignoredColumnIndexes, emptyColumnIndexes);
  const hidden = hiddenColumnIndexes.length > 0 && containsEveryNumber(ignoredColumnIndexes, hiddenColumnIndexes);
  const hasSomeEmptyIgnored = emptyColumnIndexes.some((columnIndex) => uniqueNumbers(ignoredColumnIndexes).includes(columnIndex));
  const hasSomeHiddenIgnored = hiddenColumnIndexes.some((columnIndex) => uniqueNumbers(ignoredColumnIndexes).includes(columnIndex));
  const manuallyIgnoredColumnIndexes = uniqueNumbers(ignoredColumnIndexes).filter((columnIndex) =>
    !uniqueNumbers(suggestedIgnoredColumnIndexes).includes(columnIndex),
  );
  const manuallyActivatedColumnIndexes = [
    ...(!empty && hasSomeEmptyIgnored ? emptyColumnIndexes : []),
    ...(!hidden && hasSomeHiddenIgnored ? hiddenColumnIndexes : []),
  ].filter((columnIndex) => !uniqueNumbers(ignoredColumnIndexes).includes(columnIndex));
  const customLabel = getCustomFilterLabel({
    ignoredCount: manuallyIgnoredColumnIndexes.length,
    activatedCount: manuallyActivatedColumnIndexes.length,
  });

  return { empty, hidden, customLabel };
}

export function getSuggestedColumnIndexes(columns: ColumnAnalysis[], reasons: IgnoredReason[]) {
  return columns
    .filter((column) => column.autoIgnoredReason && reasons.includes(column.autoIgnoredReason))
    .map((column) => column.columnIndex);
}

export function sameNumberSet(left: number[], right: number[]) {
  const leftSet = uniqueNumbers(left);
  const rightSet = uniqueNumbers(right);

  return leftSet.length === rightSet.length && leftSet.every((value) => rightSet.includes(value));
}

export function containsEveryNumber(source: number[], expected: number[]) {
  const sourceSet = uniqueNumbers(source);
  return uniqueNumbers(expected).every((value) => sourceSet.includes(value));
}

function getCustomFilterLabel({
  ignoredCount,
  activatedCount,
}: {
  ignoredCount: number;
  activatedCount: number;
}) {
  if (ignoredCount === 0 && activatedCount === 0) {
    return undefined;
  }

  if (ignoredCount > 0 && activatedCount > 0) {
    return `Personalizado: ${activatedCount} activadas, ${ignoredCount} ignoradas`;
  }

  if (ignoredCount > 0) {
    return `Personalizado: ${ignoredCount} ${ignoredCount === 1 ? 'ignorada' : 'ignoradas'} manualmente`;
  }

  return `Personalizado: ${activatedCount} ${activatedCount === 1 ? 'activada' : 'activadas'} manualmente`;
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)];
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
