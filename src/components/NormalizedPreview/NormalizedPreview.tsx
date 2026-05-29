import { useState } from 'react';
import {
  describeIgnoreRule,
  matchesIgnoreRule,
  rowContainsText,
} from '../../domain/import/applyIgnoreRules';
import type { IgnoreRule, NormalizedRow, OutputCategory, RowOverrides } from '../../types/import';

type NormalizedPreviewProps = {
  rows: NormalizedRow[];
  categories: OutputCategory[];
  rowOverrides: RowOverrides;
  onRowOverridesChange: (overrides: RowOverrides) => void;
};

const massOperators: Array<{ value: IgnoreRule['operator']; label: string; needsValue: boolean }> = [
  { value: 'isEmpty', label: 'esta vacio', needsValue: false },
  { value: 'isNotEmpty', label: 'no esta vacio', needsValue: false },
  { value: 'contains', label: 'contiene', needsValue: true },
  { value: 'notContains', label: 'no contiene', needsValue: true },
  { value: 'equals', label: 'es igual a', needsValue: true },
  { value: 'startsWith', label: 'empieza con', needsValue: true },
  { value: 'endsWith', label: 'termina con', needsValue: true },
];

export function NormalizedPreview({ rows, categories, rowOverrides, onRowOverridesChange }: NormalizedPreviewProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [ignoreText, setIgnoreText] = useState('');
  const [massRule, setMassRule] = useState<IgnoreRule>({
    id: 'mass-action',
    categoryId: categories[0]?.id ?? '',
    operator: 'isEmpty',
    value: '',
  });
  const orderedCategories = [...categories].filter((category) => category.exportable).sort((a, b) => a.order - b.order);
  const allCategories = [...categories].sort((a, b) => a.order - b.order);
  const includedRows = rows.filter((row) => row.status === 'included');
  const ignoredRows = rows.filter((row) => row.status === 'ignored');
  const errorRows = rows.filter((row) => row.status === 'error');
  const selectedOperator = massOperators.find((operator) => operator.value === massRule.operator);

  const updateOverride = (rowNumber: number, include: boolean) => {
    onRowOverridesChange({
      ...rowOverrides,
      [rowNumber]: include
        ? { status: 'included', reason: 'Incluida manualmente' }
        : { status: 'ignored', reason: 'Ignorada manualmente' },
    });
  };

  const mergeIgnoredRows = (targetRows: NormalizedRow[], reason: string) => {
    onRowOverridesChange({
      ...rowOverrides,
      ...Object.fromEntries(targetRows.map((row) => [row.rowNumber, { status: 'ignored', reason }])),
    });
  };

  const includeAll = () => {
    onRowOverridesChange(Object.fromEntries(rows.map((row) => [row.rowNumber, { status: 'included', reason: 'Incluida manualmente' }])));
    setSelectedRows(new Set());
  };

  const ignoreSelected = () => {
    mergeIgnoredRows(
      rows.filter((row) => selectedRows.has(row.rowNumber)),
      'Ignorada manualmente',
    );
    setSelectedRows(new Set());
  };

  const ignoreErrors = () => {
    mergeIgnoredRows(errorRows, 'Ignorada manualmente: tenia error');
  };

  const ignoreRowsWithText = () => {
    mergeIgnoredRows(
      rows.filter((row) => rowContainsText(row, ignoreText)),
      `Ignorada manualmente: contiene "${ignoreText}"`,
    );
  };

  const applyMassRule = () => {
    const rule = {
      ...massRule,
      categoryId: massRule.categoryId || allCategories[0]?.id || '',
    };
    mergeIgnoredRows(
      rows.filter((row) => matchesIgnoreRule(row, rule)),
      describeIgnoreRule(rule, categories),
    );
  };

  return (
    <div className="previewBlocks">
      <div className="stats">
        <div>
          <strong>{rows.length}</strong>
          <span>procesadas</span>
        </div>
        <div>
          <strong>{includedRows.length}</strong>
          <span>incluidas</span>
        </div>
        <div>
          <strong>{ignoredRows.length}</strong>
          <span>ignoradas</span>
        </div>
        <div>
          <strong>{errorRows.length}</strong>
          <span>con error</span>
        </div>
      </div>

      <div className="panel slim">
        <div className="sectionHeader massActionsHeader">
          <div>
            <h3>Acciones masivas</h3>
            <p>Acciones puntuales: afectan solo a las filas visibles/procesadas en esta sesion.</p>
          </div>
          <div className="actions compactActions">
            <button type="button" className="secondary" onClick={includeAll}>Incluir todas</button>
            <button type="button" className="secondary" disabled={selectedRows.size === 0} onClick={ignoreSelected}>Ignorar seleccionadas</button>
            <button type="button" className="secondary" onClick={ignoreErrors}>Ignorar filas con error</button>
          </div>
        </div>

        <div className="massRuleGrid">
          <label className="field compact">
            <span>Categoria</span>
            <select value={massRule.categoryId} onChange={(event) => setMassRule({ ...massRule, categoryId: event.target.value })}>
              {allCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="field compact">
            <span>Condicion</span>
            <select
              value={massRule.operator}
              onChange={(event) => setMassRule({ ...massRule, operator: event.target.value as IgnoreRule['operator'], value: '' })}
            >
              {massOperators.map((operator) => (
                <option key={operator.value} value={operator.value}>{operator.label}</option>
              ))}
            </select>
          </label>
          {selectedOperator?.needsValue ? (
            <label className="field compact">
              <span>Valor</span>
              <input value={massRule.value ?? ''} onChange={(event) => setMassRule({ ...massRule, value: event.target.value })} />
            </label>
          ) : null}
          <button type="button" onClick={applyMassRule}>
            Aplicar accion
          </button>
        </div>

        <div className="inlineForm">
          <input value={ignoreText} onChange={(event) => setIgnoreText(event.target.value)} placeholder="Texto a ignorar en cualquier categoria" />
          <button type="button" className="secondary" disabled={!ignoreText.trim()} onClick={ignoreRowsWithText}>Ignorar filas con texto</button>
        </div>
      </div>

      <RowsTable
        rows={rows}
        categories={orderedCategories}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onIncludeChange={updateOverride}
      />
    </div>
  );
}

function RowsTable({
  rows,
  categories,
  selectedRows,
  setSelectedRows,
  onIncludeChange,
}: {
  rows: NormalizedRow[];
  categories: OutputCategory[];
  selectedRows: Set<number>;
  setSelectedRows: (rows: Set<number>) => void;
  onIncludeChange: (rowNumber: number, include: boolean) => void;
}) {
  const toggleSelected = (rowNumber: number, selected: boolean) => {
    const next = new Set(selectedRows);
    if (selected) {
      next.add(rowNumber);
    } else {
      next.delete(rowNumber);
    }
    setSelectedRows(next);
  };

  return (
    <section className="panel slim">
      <h3>Vista normalizada</h3>
      <div className="tableWrap small">
        <table>
          <thead>
            <tr>
              <th>Seleccionar</th>
              <th>Incluir</th>
              <th>Estado</th>
              <th>Fila</th>
              {categories.map((category) => (
                <th key={category.id}>{category.name}</th>
              ))}
              <th>Motivo/Error</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={categories.length + 5}>Sin filas para mostrar</td>
              </tr>
            ) : (
              rows.slice(0, 200).map((row) => (
                <tr key={row.rowNumber} className={row.status === 'ignored' ? 'mutedRow' : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.rowNumber)}
                      onChange={(event) => toggleSelected(row.rowNumber, event.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.status === 'included'}
                      onChange={(event) => onIncludeChange(row.rowNumber, event.target.checked)}
                    />
                  </td>
                  <td>{statusLabel(row)}</td>
                  <td>{row.rowNumber}</td>
                  {categories.map((category) => (
                    <td key={category.id}>{row.values[category.id] ?? ''}</td>
                  ))}
                  <td className={row.status === 'error' ? 'errorText' : undefined}>{row.ignoredReason || row.error || ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function statusLabel(row: NormalizedRow) {
  if (row.status === 'ignored') {
    return 'Ignorada';
  }

  if (row.status === 'error') {
    return 'Con error';
  }

  return 'Incluida';
}
