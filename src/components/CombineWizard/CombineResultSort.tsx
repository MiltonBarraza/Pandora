import type { CombineOutputColumn, ResultSort } from '../../types/combine';
import { Dropdown } from '../ui/Dropdown/Dropdown';

type CombineResultSortProps = {
  outputColumns: CombineOutputColumn[];
  resultSort: ResultSort;
  onChange: (resultSort: ResultSort) => void;
};

export function CombineResultSort({ outputColumns, resultSort, onChange }: CombineResultSortProps) {
  return (
    <div className="combineResultSortPanel" aria-labelledby="combine-result-sort-title">
      <h3 id="combine-result-sort-title">Orden del resultado</h3>
      <div className="combineResultSortControls">
        <Dropdown
          label="Columna"
          value={resultSort.columnId ?? ''}
          placeholder="Sin ordenar"
          options={outputColumns.map((column) => ({
            value: column.id,
            label: column.name.trim() || 'Columna sin nombre',
          }))}
          onChange={(columnId) => onChange({ ...resultSort, columnId })}
        />
        <div className="segmentedControl combineResultSortDirection" aria-label="Dirección del orden">
          <label>
            <input
              type="radio"
              name="combine-result-sort-direction"
              checked={resultSort.direction === 'asc'}
              disabled={!resultSort.columnId}
              onChange={() => onChange({ ...resultSort, direction: 'asc' })}
            />
            Ascendente
          </label>
          <label>
            <input
              type="radio"
              name="combine-result-sort-direction"
              checked={resultSort.direction === 'desc'}
              disabled={!resultSort.columnId}
              onChange={() => onChange({ ...resultSort, direction: 'desc' })}
            />
            Descendente
          </label>
        </div>
        {resultSort.columnId ? (
          <button
            type="button"
            className="secondary compact combineResultSortClear"
            onClick={() => onChange({ columnId: null, direction: resultSort.direction })}
          >
            Sin ordenar
          </button>
        ) : null}
      </div>
      {!resultSort.columnId ? (
        <p className="muted combineResultSortHelper">
          Sin ordenar, las filas se combinan siguiendo el orden de los archivos cargados.
        </p>
      ) : null}
    </div>
  );
}
