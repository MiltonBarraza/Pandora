import { useEffect, useState, type ReactNode } from 'react';
import type { ColumnAnalysis, IgnoredReason } from '../../types/import';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { TruncatedText } from '../ui/TruncatedText/TruncatedText';

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

export function ColumnVisibilityManager({ columns, onChange }: ColumnVisibilityManagerProps) {
  const [availableSearch, setAvailableSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
  const activeColumns = columns.filter((column) => !column.ignored);
  const ignoredColumns = columns.filter((column) => column.ignored);
  const visibleIgnoredColumns = filterColumnsBySearch(ignoredColumns, availableSearch);
  const visibleActiveColumns = filterColumnsBySearch(activeColumns, activeSearch);
  const selectedColumn = getSelectedColumn(columns, selectedColumnIndex);
  const activeCount = columns.filter((column) => !column.ignored).length;
  const ignoredCount = columns.length - activeCount;
  const automaticReasonSummary = buildAutomaticReasonSummary(columns);
  const appliedFilters = getAppliedFilterState(columns);

  useEffect(() => {
    setSelectedColumnIndex((currentIndex) => getSafeSelectedColumnIndex(columns, currentIndex));
  }, [columns]);

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

      <div className="columnTransferGrid">
        <ColumnTransferPanel
          title="Columnas disponibles"
          count={ignoredColumns.length}
          visibleCount={visibleIgnoredColumns.length}
          searchValue={availableSearch}
          searchLabel="Buscar columnas disponibles"
          searchPlaceholder="Buscar disponibles"
          onSearchChange={setAvailableSearch}
          onClearSearch={() => setAvailableSearch(clearColumnSearchValue())}
          emptyMessage="No hay columnas disponibles para activar."
          emptySearchMessage="No hay columnas disponibles que coincidan con la búsqueda."
        >
          {visibleIgnoredColumns.map((column) => (
            <ColumnTransferItem
              key={column.columnIndex}
              column={column}
              selected={column.columnIndex === selectedColumnIndex}
              actionLabel="Activar"
              actionAriaLabel={`Activar columna ${column.columnLetter}`}
              onSelect={() => setSelectedColumnIndex(column.columnIndex)}
              onAction={() => updateColumn(column.columnIndex, false)}
            />
          ))}
        </ColumnTransferPanel>

        <ColumnTransferPanel
          title="Columnas activas"
          count={activeColumns.length}
          visibleCount={visibleActiveColumns.length}
          searchValue={activeSearch}
          searchLabel="Buscar columnas activas"
          searchPlaceholder="Buscar activas"
          onSearchChange={setActiveSearch}
          onClearSearch={() => setActiveSearch(clearColumnSearchValue())}
          emptyMessage="No hay columnas activas. Activá columnas disponibles para verlas en la vista previa."
          emptySearchMessage="No hay columnas activas que coincidan con la búsqueda."
        >
          {visibleActiveColumns.map((column) => (
            <ColumnTransferItem
              key={column.columnIndex}
              column={column}
              selected={column.columnIndex === selectedColumnIndex}
              actionLabel="Quitar"
              actionAriaLabel={`Quitar columna ${column.columnLetter}`}
              aliasValue={column.alias ?? ''}
              onSelect={() => setSelectedColumnIndex(column.columnIndex)}
              onAliasChange={(alias) => updateAlias(column.columnIndex, alias)}
              onAction={() => updateColumn(column.columnIndex, true)}
            />
          ))}
        </ColumnTransferPanel>
      </div>

      <ColumnDetailPanel column={selectedColumn} />
    </div>
  );
}

type ColumnTransferPanelProps = {
  title: string;
  count: number;
  visibleCount: number;
  searchValue: string;
  searchLabel: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  emptyMessage: string;
  emptySearchMessage: string;
  children: ReactNode;
};

function ColumnTransferPanel({
  title,
  count,
  visibleCount,
  searchValue,
  searchLabel,
  searchPlaceholder,
  onSearchChange,
  onClearSearch,
  emptyMessage,
  emptySearchMessage,
  children,
}: ColumnTransferPanelProps) {
  const hasSearch = normalizeColumnSearch(searchValue) !== '';
  const emptyMessageToShow = getColumnTransferEmptyMessage({
    count,
    visibleCount,
    emptyMessage,
    emptySearchMessage,
  });

  return (
    <section className="columnTransferPanel" aria-label={title}>
      <div className="columnTransferPanelHeader">
        <h3>{title}</h3>
        <span>{hasSearch ? `${visibleCount}/${count}` : count}</span>
      </div>
      <div className="columnTransferSearch">
        <label>
          <span>{searchLabel}</span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </label>
        {hasSearch ? (
          <button type="button" className="secondary columnTransferClearSearch" onClick={onClearSearch}>
            Limpiar
          </button>
        ) : null}
      </div>
      {visibleCount > 0 ? (
        <div className="columnTransferList">{children}</div>
      ) : (
        <p className="columnTransferEmpty">{emptyMessageToShow}</p>
      )}
    </section>
  );
}

type ColumnTransferItemProps = {
  column: ColumnAnalysis;
  selected: boolean;
  actionLabel: string;
  actionAriaLabel: string;
  aliasValue?: string;
  onSelect: () => void;
  onAliasChange?: (alias: string) => void;
  onAction: () => void;
};

function ColumnTransferItem({
  column,
  selected,
  actionLabel,
  actionAriaLabel,
  aliasValue,
  onSelect,
  onAliasChange,
  onAction,
}: ColumnTransferItemProps) {
  const label = getColumnDisplayLabel(column);
  const reasonLabel = column.ignoredReason ? reasonLabels[column.ignoredReason] : undefined;
  const showAliasInput = onAliasChange !== undefined;

  return (
    <article className={`columnTransferItem${selected ? ' isSelected' : ''}`}>
      <button
        type="button"
        className="columnTransferSelectArea"
        aria-pressed={selected}
        aria-label={`Seleccionar columna ${column.columnLetter}`}
        onClick={onSelect}
      >
        <div className="columnTransferTitleRow">
          <strong>
            <TruncatedText text={label} />
          </strong>
          <span>{column.columnLetter}</span>
        </div>
        <div className="columnTransferMeta">
          {reasonLabel ? <span>Motivo: {reasonLabel}</span> : null}
          <span>{column.nonEmptyCount} datos</span>
        </div>
      </button>
      {showAliasInput ? (
        <label className="columnTransferAlias">
          <span>Alias</span>
          <input
            aria-label={`Alias para columna ${column.columnLetter}`}
            value={aliasValue}
            onChange={(event) => onAliasChange(event.target.value)}
            placeholder={column.header || 'Alias visual'}
          />
        </label>
      ) : null}
      <button
        type="button"
        className="secondary columnTransferAction"
        aria-label={actionAriaLabel}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </article>
  );
}

type ColumnDetailPanelProps = {
  column: ColumnAnalysis | null;
};

function ColumnDetailPanel({ column }: ColumnDetailPanelProps) {
  if (!column) {
    return (
      <section className="columnDetailPanel" aria-label="Detalle de columna">
        <p className="columnDetailEmpty">{getColumnDetailEmptyMessage()}</p>
      </section>
    );
  }

  const detail = getColumnDetail(column);

  return (
    <section className="columnDetailPanel" aria-label={`Detalle de columna ${column.columnLetter}`}>
      <div className="columnDetailHeader">
        <div>
          <h3><TruncatedText text={detail.label} tooltipThreshold={24} /></h3>
          <p>{detail.status}</p>
        </div>
        <span>{detail.columnLetter}</span>
      </div>
      <dl className="columnDetailGrid">
        <div>
          <dt>Encabezado</dt>
          <dd><TruncatedText text={detail.header} tooltipThreshold={24} /></dd>
        </div>
        <div>
          <dt>Alias</dt>
          <dd><TruncatedText text={detail.alias} tooltipThreshold={24} /></dd>
        </div>
        <div>
          <dt>Motivo automático</dt>
          <dd>{detail.automaticReason}</dd>
        </div>
        <div>
          <dt>Datos</dt>
          <dd>{detail.nonEmptyCount}</dd>
        </div>
      </dl>
      <div className="columnDetailExamples">
        <h4>Ejemplos</h4>
        {detail.examples.length > 0 ? (
          <ul>
            {detail.examples.map((example, index) => (
              <li key={`${example}-${index}`}>
                <TruncatedText text={example} tooltipThreshold={20} />
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay ejemplos disponibles.</p>
        )}
      </div>
    </section>
  );
}

export function getColumnDisplayLabel(column: Pick<ColumnAnalysis, 'alias' | 'header' | 'columnLetter'>) {
  return column.alias?.trim() || column.header?.trim() || column.columnLetter;
}

export function getSelectedColumn(columns: ColumnAnalysis[], selectedColumnIndex: number | null) {
  if (selectedColumnIndex === null) {
    return null;
  }

  return columns.find((column) => column.columnIndex === selectedColumnIndex) ?? null;
}

export function getSafeSelectedColumnIndex(columns: ColumnAnalysis[], selectedColumnIndex: number | null) {
  return getSelectedColumn(columns, selectedColumnIndex)?.columnIndex ?? null;
}

export function getColumnDetail(column: ColumnAnalysis) {
  return {
    label: getColumnDisplayLabel(column),
    columnLetter: column.columnLetter,
    header: column.header?.trim() || '-',
    alias: column.alias?.trim() || '-',
    status: column.ignored ? 'Disponible' : 'Activa',
    automaticReason: column.autoIgnoredReason ? reasonLabels[column.autoIgnoredReason] : '-',
    nonEmptyCount: String(column.nonEmptyCount),
    examples: column.sampleValues.filter((value) => value.trim() !== ''),
  };
}

export function getColumnDetailEmptyMessage() {
  return 'Seleccioná una columna para ver sus detalles y ejemplos.';
}

export function filterColumnsBySearch(columns: ColumnAnalysis[], search: string) {
  const query = normalizeColumnSearch(search);

  if (!query) {
    return columns;
  }

  return columns.filter((column) => columnMatchesSearch(column, query));
}

export function getColumnSearchText(column: ColumnAnalysis) {
  return getColumnSearchTerms(column, { includeReason: true }).join(' ');
}

export function columnMatchesSearch(column: ColumnAnalysis, normalizedQuery: string) {
  const terms = getColumnSearchTerms(column, { includeReason: normalizedQuery.length > 1 });
  return terms.some((term) => term.includes(normalizedQuery));
}

export function getColumnSearchTerms(column: ColumnAnalysis, { includeReason }: { includeReason: boolean }) {
  const terms = [
    column.alias,
    column.header,
    column.columnLetter,
    ...column.sampleValues,
    String(column.nonEmptyCount),
  ];

  if (includeReason) {
    terms.push(
      column.ignoredReason ? reasonLabels[column.ignoredReason] : '',
      column.autoIgnoredReason ? reasonLabels[column.autoIgnoredReason] : '',
    );
  }

  return terms
    .map((term) => normalizeColumnSearch(String(term ?? '')))
    .filter((term) => term !== '');
}

export function normalizeColumnSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function clearColumnSearchValue() {
  return '';
}

export function getColumnTransferEmptyMessage({
  count,
  visibleCount,
  emptyMessage,
  emptySearchMessage,
}: {
  count: number;
  visibleCount: number;
  emptyMessage: string;
  emptySearchMessage: string;
}) {
  return count === 0 || visibleCount > 0 ? emptyMessage : emptySearchMessage;
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
