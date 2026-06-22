import { useEffect, useState, type ReactNode } from 'react';
import type { ColumnAnalysis, IgnoredReason } from '../../types/import';
import { SortableList } from '../SortableList/SortableList';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { TruncatedText } from '../ui/TruncatedText/TruncatedText';

type ColumnVisibilityManagerProps = {
  columns: ColumnAnalysis[];
  showHeaderColumn?: boolean;
  activeColumnOrder?: number[];
  onActiveColumnOrderChange?: (columnOrder: number[]) => void;
  onChange: (columns: ColumnAnalysis[]) => void;
};

const reasonLabels: Record<IgnoredReason, string> = {
  hidden: 'Oculta',
  narrow: 'Oculta',
  empty: 'Sin datos',
  lowData: 'Pocos datos',
  manual: 'Manual',
};

const hiddenSuggestedReasons: IgnoredReason[] = ['hidden', 'narrow'];
type AppliedFilterState = {
  empty: boolean;
  hidden: boolean;
  customLabel?: string;
};

export function ColumnVisibilityManager({ columns, activeColumnOrder, onActiveColumnOrderChange, onChange }: ColumnVisibilityManagerProps) {
  const [availableSearch, setAvailableSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
  const [localActiveColumnOrder, setLocalActiveColumnOrder] = useState<number[]>([]);
  const activeColumns = columns.filter((column) => !column.ignored);
  const ignoredColumns = columns.filter((column) => column.ignored);
  const effectiveActiveColumnOrder = activeColumnOrder ?? localActiveColumnOrder;
  const orderedActiveColumns = getOrderedActiveColumns(activeColumns, effectiveActiveColumnOrder);
  const visibleIgnoredColumns = filterColumnsBySearch(ignoredColumns, availableSearch);
  const visibleActiveColumns = filterColumnsBySearch(orderedActiveColumns, activeSearch);
  const visibleActiveSortableColumns = visibleActiveColumns.map((column) => ({
    ...column,
    id: getActiveColumnDragId(column.columnIndex),
  }));
  const appliedFilters = getAppliedFilterState(columns);

  useEffect(() => {
    setSelectedColumnIndex((currentIndex) => getSafeSelectedColumnIndex(columns, currentIndex));
  }, [columns]);

  useEffect(() => {
    const nextOrder = syncActiveColumnOrder(effectiveActiveColumnOrder, activeColumns);
    if (!sameNumberOrder(nextOrder, effectiveActiveColumnOrder)) {
      updateActiveColumnOrder(nextOrder);
    }
  }, [columns, effectiveActiveColumnOrder]);

  const updateActiveColumnOrder = (nextOrder: number[]) => {
    if (onActiveColumnOrderChange) {
      onActiveColumnOrderChange(nextOrder);
      return;
    }

    setLocalActiveColumnOrder(nextOrder);
  };

  const updateColumn = (columnIndex: number, ignored: boolean) => {
    onChange(
      columns.map((column) =>
        column.columnIndex === columnIndex
          ? setColumnVisibility(column, ignored)
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

  const hideAll = () => {
    onChange(deactivateAllColumns(columns));
  };

  const toggleByReasons = (reasons: IgnoredReason[]) => {
    onChange(toggleColumnsByAutomaticReasons(columns, reasons));
  };

  const restoreAutomatic = () => {
    onChange(restoreAutomaticColumnDetection(columns));
  };

  const reorderVisibleActiveColumns = (items: Array<ColumnAnalysis & { id: string }>) => {
    updateActiveColumnOrder(reorderActiveColumnOrder(
      syncActiveColumnOrder(effectiveActiveColumnOrder, activeColumns),
      visibleActiveSortableColumns.map((column) => column.columnIndex),
      items.map((column) => column.columnIndex),
    ));
  };

  return (
    <div className="columnDetection">
      <div className="columnDetectionHeader">
        <div className="columnQuickActions">
          <div>
            <strong className="headingWithInfo">
              <span>Acciones rápidas</span>
              <InfoTooltip content="Ocultá automáticamente columnas sin datos u ocultas por detección. Podés volver a activarlas manualmente cuando quieras." />
            </strong>
            <div className="actions">
              <label className="checkboxField">
                <input
                  type="checkbox"
                  checked={appliedFilters.empty}
                  onChange={() => toggleByReasons(['empty'])}
                />
                Sin datos
              </label>
              <label className="checkboxField">
                <input
                  type="checkbox"
                  checked={appliedFilters.hidden}
                  onChange={() => toggleByReasons(hiddenSuggestedReasons)}
                />
                Ocultas
              </label>
            </div>
          </div>
          <div className="actions columnQuickActionsButtons">
            <InfoTooltip content="Incluye todas las columnas detectadas en la receta.">
              <button type="button" className="secondary" onClick={showAll}>
                Activar todas
              </button>
            </InfoTooltip>
            <InfoTooltip content="Mueve todas las columnas activas a disponibles.">
              <button type="button" className="secondary" onClick={hideAll} disabled={!hasActiveColumns(columns)}>
                Quitar todas
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
          <SortableList
            items={visibleActiveSortableColumns}
            onChange={reorderVisibleActiveColumns}
            renderItem={(column, dragHandle) => (
              <ColumnTransferItem
                key={column.columnIndex}
                column={column}
                selected={column.columnIndex === selectedColumnIndex}
                actionLabel="Quitar"
                actionAriaLabel={`Quitar columna ${column.columnLetter}`}
                aliasValue={column.alias ?? ''}
                onSelect={() => setSelectedColumnIndex(column.columnIndex)}
                onAliasChange={(alias) => updateAlias(column.columnIndex, alias)}
                showExamples
                dragHandle={dragHandle}
                onAction={() => updateColumn(column.columnIndex, true)}
              />
            )}
          />
        </ColumnTransferPanel>
      </div>

    </div>
  );
}

export function getColumnReasonLabel(reason: IgnoredReason) {
  return reasonLabels[reason];
}

export function getColumnVisibleReasonLabels(column: ColumnAnalysis) {
  const currentReasons = getColumnCurrentIgnoredReasons(column);
  const reasons = currentReasons.length > 0 ? currentReasons : getColumnAutomaticReasons(column);

  return uniqueStrings(uniqueReasons(reasons)
    .filter((reason) => reason !== 'manual')
    .map((reason) => getColumnReasonLabel(reason)));
}

export function shouldShowColumnDataCount(column: Pick<ColumnAnalysis, 'nonEmptyCount'>, visibleReasonLabels: string[]) {
  return column.nonEmptyCount > 0 || !visibleReasonLabels.includes('Sin datos');
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
        <h3>{title} <span>({hasSearch ? `${visibleCount}/${count}` : count})</span></h3>
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
  showExamples?: boolean;
  dragHandle?: ReactNode;
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
  showExamples = false,
  dragHandle,
  onSelect,
  onAliasChange,
  onAction,
}: ColumnTransferItemProps) {
  const showAliasInput = onAliasChange !== undefined;
  const label = showAliasInput ? getColumnIdentityLabel(column) : getColumnDisplayLabel(column);
  const availableDetails = showAliasInput ? [] : getAvailableColumnDetails(column);
  const reasonLabels = getColumnVisibleReasonLabels(column);

  return (
    <article className={`columnTransferItem${selected ? ' isSelected' : ''}${showAliasInput ? ' hasAlias' : ''}`}>
      <button
        type="button"
        className="columnTransferSelectArea"
        aria-pressed={selected}
        aria-label={`Seleccionar columna ${column.columnLetter}`}
        onClick={onSelect}
      >
        <div className="columnTransferTitleRow">
          <strong>
            <TruncatedText text={showAliasInput ? label : `Columna: ${column.columnLetter}`} />
          </strong>
        </div>
        {availableDetails.map((detail) => (
          <div key={detail.label} className="columnTransferDetailRow">
            <span>{detail.label}</span>
            <TruncatedText text={detail.value} />
          </div>
        ))}
        <div className="columnTransferMeta">
          {reasonLabels.map((reasonLabel) => (
            <span key={reasonLabel} className="columnReasonChip">{reasonLabel}</span>
          ))}
          {shouldShowColumnDataCount(column, reasonLabels) ? <span>{column.nonEmptyCount} datos</span> : null}
        </div>
      </button>
      {showAliasInput ? (
        <label className="columnTransferAlias">
          <span>Alias visual</span>
          <input
            aria-label={`Alias para columna ${column.columnLetter}`}
            value={aliasValue}
            onChange={(event) => onAliasChange(event.target.value)}
            placeholder="Sin alias"
          />
        </label>
      ) : null}
      <div className="columnTransferActions">
        {showExamples ? (
          <InfoTooltip content={getColumnExamplesTooltipContent(column)} className="columnExamplesTooltip">
            <button type="button" className="secondary columnTransferExampleAction">
              Ver ejemplos
            </button>
          </InfoTooltip>
        ) : null}
        <button
          type="button"
          className="secondary columnTransferAction"
          aria-label={actionAriaLabel}
          onClick={onAction}
        >
          {actionLabel}
        </button>
        {dragHandle}
      </div>
    </article>
  );
}

export function getColumnDisplayLabel(column: Pick<ColumnAnalysis, 'alias' | 'header' | 'columnLetter'>) {
  return column.alias?.trim() || column.header?.trim() || column.columnLetter;
}

export function getColumnBaseDisplayLabel(column: Pick<ColumnAnalysis, 'header' | 'columnLetter'>) {
  return column.header?.trim() || column.columnLetter;
}

export function getColumnIdentityLabel(column: Pick<ColumnAnalysis, 'header' | 'columnLetter'>) {
  const header = column.header?.trim();
  return header ? `Columna: ${column.columnLetter} · ${header}` : `Columna: ${column.columnLetter}`;
}

export function getAvailableColumnDetails(column: Pick<ColumnAnalysis, 'alias' | 'header'>) {
  const alias = column.alias?.trim();
  const header = column.header?.trim();

  if (alias) {
    return [{ label: 'Alias:', value: alias }];
  }

  if (header) {
    return [{ label: 'Encabezado:', value: header }];
  }

  return [];
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

export function getOrderedActiveColumns(columns: ColumnAnalysis[], activeColumnOrder: number[]) {
  const orderIndex = new Map(activeColumnOrder.map((columnIndex, index) => [columnIndex, index]));
  return [...columns].sort((left, right) => {
    const leftOrder = orderIndex.get(left.columnIndex) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = orderIndex.get(right.columnIndex) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.columnIndex - right.columnIndex;
  });
}

export function syncActiveColumnOrder(currentOrder: number[], activeColumns: Pick<ColumnAnalysis, 'columnIndex'>[]) {
  const activeColumnIndexes = activeColumns.map((column) => column.columnIndex);
  const activeColumnIndexSet = new Set(activeColumnIndexes);
  const keptOrder = currentOrder.filter((columnIndex) => activeColumnIndexSet.has(columnIndex));
  const appendedOrder = activeColumnIndexes.filter((columnIndex) => !keptOrder.includes(columnIndex));
  return [...keptOrder, ...appendedOrder];
}

export function reorderActiveColumnOrder(currentOrder: number[], visibleColumnIndexes: number[], reorderedVisibleColumnIndexes: number[]) {
  const reorderedQueue = [...reorderedVisibleColumnIndexes];
  const visibleSet = new Set(visibleColumnIndexes);
  return currentOrder.map((columnIndex) => (
    visibleSet.has(columnIndex)
      ? reorderedQueue.shift() ?? columnIndex
      : columnIndex
  ));
}

export function getActiveColumnDragId(columnIndex: number) {
  return `active-column-${columnIndex}`;
}

export function sameNumberOrder(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function getColumnExamples(column: Pick<ColumnAnalysis, 'sampleValues'>, limit = 10) {
  return column.sampleValues
    .map((value) => value.trim())
    .filter((value) => value !== '')
    .slice(0, limit);
}

export function getColumnExamplesTooltipContent(column: Pick<ColumnAnalysis, 'sampleValues'>, limit = 10) {
  const examples = getColumnExamples(column, limit);
  return examples.length > 0 ? examples.join('\n') : 'Sin ejemplos disponibles.';
}

export function shouldRenderColumnDetailPanel() {
  return false;
}

export function filterColumnsBySearch(columns: ColumnAnalysis[], search: string) {
  const query = normalizeColumnSearch(search);

  if (!query) {
    return columns;
  }

  return columns.filter((column) => columnMatchesSearch(column, query));
}

export function getColumnSearchText(column: ColumnAnalysis) {
  return getColumnSearchTerms(column).join(' ');
}

export function columnMatchesSearch(column: ColumnAnalysis, normalizedQuery: string) {
  return getColumnSearchTerms(column).some((term) => term.includes(normalizedQuery));
}

export function getColumnSearchTerms(column: ColumnAnalysis) {
  const alias = column.alias?.trim();
  const header = column.header?.trim();
  const visibleIdentifier = alias || header || column.columnLetter;

  return [visibleIdentifier]
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
  return columns.map((column) => ({ ...column, ignored: false, ignoredReason: undefined, ignoredReasons: undefined }));
}

export function deactivateAllColumns(columns: ColumnAnalysis[]) {
  return columns.map((column) => setColumnVisibility(column, true));
}

export function hasActiveColumns(columns: ColumnAnalysis[]) {
  return columns.some((column) => !column.ignored);
}

export function setColumnVisibility(column: ColumnAnalysis, ignored: boolean) {
  if (!ignored) {
    return { ...column, ignored: false, ignoredReason: undefined, ignoredReasons: undefined };
  }

  const automaticReasons = getColumnAutomaticReasons(column);
  return automaticReasons.length > 0
    ? setColumnIgnoredByReasons(column, automaticReasons)
    : { ...column, ignored: true, ignoredReason: 'manual' as const, ignoredReasons: ['manual' as const] };
}

export function ignoreColumnsByAutomaticReasons(columns: ColumnAnalysis[], reasons: IgnoredReason[]) {
  return columns.map((column) => {
    const matchingReasons = getColumnAutomaticReasons(column).filter((reason) => reasons.includes(reason));
    return matchingReasons.length > 0 ? setColumnIgnoredByReasons(column, matchingReasons) : column;
  });
}

export function toggleColumnsByAutomaticReasons(columns: ColumnAnalysis[], reasons: IgnoredReason[]) {
  const appliedFilters = getAppliedFilterState(columns);
  const nextAppliedFilters = {
    empty: reasons.includes('empty') ? !appliedFilters.empty : appliedFilters.empty,
    hidden: reasons.some((reason) => hiddenSuggestedReasons.includes(reason)) ? !appliedFilters.hidden : appliedFilters.hidden,
  };

  return columns.map((column) => {
    const automaticReasons = getColumnAutomaticReasons(column);
    if (!automaticReasons.some((reason) => reasons.includes(reason))) {
      return column;
    }

    const nextIgnoredReasons = getAppliedAutomaticReasonsForColumn(column, nextAppliedFilters);
    if (nextIgnoredReasons.length > 0) {
      return setColumnIgnoredByReasons(column, nextIgnoredReasons);
    }

    return { ...column, ignored: false, ignoredReason: undefined, ignoredReasons: undefined };
  });
}

export function restoreAutomaticColumnDetection(columns: ColumnAnalysis[]) {
  const allFiltersApplied = { empty: true, hidden: true };

  return columns.map((column) => ({
    ...column,
    ...setColumnAutomaticVisibility(column, allFiltersApplied),
  }));
}

export function getAppliedSuggestionGroups(columns: ColumnAnalysis[]) {
  const appliedFilters = getAppliedFilterState(columns);

  return {
    empty: appliedFilters.empty,
    hiddenOrNarrow: appliedFilters.hidden,
  };
}

export function getAppliedFilterState(columns: ColumnAnalysis[]): AppliedFilterState {
  const ignoredColumnIndexes = columns
    .filter((column) => column.ignored)
    .map((column) => column.columnIndex);
  const emptyColumnIndexes = getSuggestedColumnIndexes(columns, ['empty']);
  const hiddenColumnIndexes = getSuggestedColumnIndexes(columns, hiddenSuggestedReasons);
  const suggestedIgnoredColumnIndexes = columns.filter((column) => column.autoIgnored).map((column) => column.columnIndex);

  if (uniqueNumbers(ignoredColumnIndexes).length === 0) {
    return { empty: false, hidden: false };
  }

  const empty = isAutomaticReasonGroupApplied(columns, ['empty']);
  const hidden = isAutomaticReasonGroupApplied(columns, hiddenSuggestedReasons);
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
    activatedCount: uniqueNumbers(manuallyActivatedColumnIndexes).length,
  });

  return { empty, hidden, customLabel };
}

export function getSuggestedColumnIndexes(columns: ColumnAnalysis[], reasons: IgnoredReason[]) {
  return columns
    .filter((column) => getColumnAutomaticReasons(column).some((reason) => reasons.includes(reason)))
    .map((column) => column.columnIndex);
}

function isAutomaticReasonGroupApplied(columns: ColumnAnalysis[], reasons: IgnoredReason[]) {
  const groupColumns = columns.filter((column) => getColumnAutomaticReasons(column).some((reason) => reasons.includes(reason)));
  return groupColumns.length > 0 && groupColumns.every((column) =>
    getColumnCurrentIgnoredReasons(column).some((reason) => reasons.includes(reason)),
  );
}

function setColumnAutomaticVisibility(
  column: ColumnAnalysis,
  appliedFilters: Pick<AppliedFilterState, 'empty' | 'hidden'>,
) {
  const ignoredReasons = getAppliedAutomaticReasonsForColumn(column, appliedFilters);
  return ignoredReasons.length > 0
    ? setColumnIgnoredByReasons(column, ignoredReasons)
    : { ...column, ignored: false, ignoredReason: undefined, ignoredReasons: undefined };
}

function getAppliedAutomaticReasonsForColumn(
  column: ColumnAnalysis,
  appliedFilters: Pick<AppliedFilterState, 'empty' | 'hidden'>,
) {
  const automaticReasons = getColumnAutomaticReasons(column);
  return automaticReasons.filter((reason) =>
    (reason === 'empty' && appliedFilters.empty)
    || (hiddenSuggestedReasons.includes(reason) && appliedFilters.hidden)
    || reason === 'lowData',
  );
}

function setColumnIgnoredByReasons(column: ColumnAnalysis, reasons: IgnoredReason[]) {
  const ignoredReasons = uniqueReasons(reasons);
  return {
    ...column,
    ignored: ignoredReasons.length > 0,
    ignoredReason: ignoredReasons[0],
    ignoredReasons,
  };
}

export function getColumnAutomaticReasons(column: ColumnAnalysis) {
  const savedReasons = uniqueReasons(column.autoIgnoredReasons ?? []);
  if (savedReasons.length > 0) {
    return savedReasons;
  }

  const inferredReasons: IgnoredReason[] = [];
  if (column.autoIgnoredReason) {
    inferredReasons.push(column.autoIgnoredReason);
  }
  if (column.isHidden) {
    inferredReasons.push('hidden');
  }
  if (column.isNarrow) {
    inferredReasons.push('narrow');
  }
  if (column.isEmpty) {
    inferredReasons.push('empty');
  }
  return uniqueReasons(inferredReasons);
}

export function getColumnCurrentIgnoredReasons(column: ColumnAnalysis) {
  if (!column.ignored) {
    return [];
  }

  const savedReasons = uniqueReasons(column.ignoredReasons ?? []);
  if (savedReasons.length > 0) {
    return savedReasons;
  }

  return column.ignoredReason ? [column.ignoredReason] : [];
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

function uniqueReasons(values: IgnoredReason[]) {
  return [...new Set(values)];
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}
