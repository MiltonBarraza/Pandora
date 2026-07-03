import type { CombineOutputColumn, CombineResultSort } from '../../types/combine';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

type CombineResultSortControlsProps = {
  outputColumns: CombineOutputColumn[];
  resultSort: CombineResultSort;
  onChange: (resultSort: CombineResultSort) => void;
};

const noSortValue = '__no-sort__';

export function CombineResultSortControls({
  outputColumns,
  resultSort,
  onChange,
}: CombineResultSortControlsProps) {
  const hasSortColumn = Boolean(resultSort.sortColumnId);
  const sortOptions = [
    { value: noSortValue, label: 'Sin ordenar' },
    ...outputColumns.map((column, index) => ({
      value: column.id,
      label: column.name.trim() || `Columna ${index + 1}`,
    })),
  ];

  return (
    <section className="panel combineFlowPanel combineResultSortPanel">
      <div className="combineResultSortCopy">
        <h2 className="headingWithInfo">
          <span>Ordenar resultado final</span>
          <InfoTooltip
            ariaLabel="Información sobre ordenar resultado final"
            placement="right"
            content="Ordená las filas combinadas por una columna antes de previsualizar o exportar."
          />
        </h2>
        <p className="muted">Ordená las filas combinadas por una columna antes de previsualizar o exportar.</p>
      </div>
      <div className="combineResultSortControls">
        <Dropdown
          className="compact combineResultSortColumn"
          label="Ordenar por"
          value={resultSort.sortColumnId ?? noSortValue}
          options={sortOptions}
          onChange={(value) => onChange({
            ...resultSort,
            sortColumnId: value === noSortValue ? null : value,
          })}
        />
        <fieldset className="combineResultSortDirection">
          <legend>Dirección</legend>
          <div className="segmentedControl">
            <label>
              <input
                type="radio"
                name="combine-result-sort-direction"
                disabled={!hasSortColumn}
                checked={resultSort.sortDirection === 'asc'}
                onChange={() => onChange({ ...resultSort, sortDirection: 'asc' })}
              />
              Ascendente
            </label>
            <label>
              <input
                type="radio"
                name="combine-result-sort-direction"
                disabled={!hasSortColumn}
                checked={resultSort.sortDirection === 'desc'}
                onChange={() => onChange({ ...resultSort, sortDirection: 'desc' })}
              />
              Descendente
            </label>
          </div>
        </fieldset>
      </div>
    </section>
  );
}
