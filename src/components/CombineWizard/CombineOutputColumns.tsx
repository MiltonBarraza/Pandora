import { normalizeCombineColumnName } from '../../domain/combine/combineColumnMappings';
import type { CombineOutputColumn, CombineSource } from '../../types/combine';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { ActionButton } from '../ui/ActionButton/ActionButton';

type CombineOutputColumnsProps = {
  sources: CombineSource[];
  outputColumns: CombineOutputColumn[];
  onChange: (columns: CombineOutputColumn[]) => void;
};

export function CombineOutputColumns({
  sources,
  outputColumns,
  onChange,
}: CombineOutputColumnsProps) {
  const hasEmptyNames = outputColumns.some((column) => column.name.trim() === '');
  const hasDuplicateNames = getDuplicateNormalizedNames(outputColumns).length > 0;

  const addColumn = () => {
    onChange([
      ...outputColumns,
      { id: crypto.randomUUID(), name: 'Nueva columna' },
    ]);
  };

  const initializeFromFirstSource = () => {
    const firstSource = sources[0];
    if (!firstSource) {
      return;
    }

    onChange(firstSource.columns.map((column) => ({
      id: crypto.randomUUID(),
      name: column.name,
    })));
  };

  return (
    <section className="panel">
      <div className="combineOutputColumnsHeader">
        <div>
          <h2>Columnas de salida</h2>
          <p className="muted">Definí las columnas que tendrá el archivo combinado.</p>
        </div>
        {outputColumns.length > 0 ? (
          <ActionButton action="add" onClick={addColumn}>Agregar columna</ActionButton>
        ) : null}
      </div>

      {hasEmptyNames ? <p className="combineColumnWarning">Hay columnas de salida sin nombre.</p> : null}
      {hasDuplicateNames ? <p className="combineColumnWarning">Hay nombres de columnas de salida duplicados.</p> : null}

      {outputColumns.length === 0 ? (
        <div className="emptyState combineOutputColumnsEmpty">
          <p>Todavía no definiste columnas de salida.</p>
          <div className="actions">
            {sources.length > 0 ? (
              <ActionButton action="duplicate" onClick={initializeFromFirstSource}>
                Usar columnas del primer archivo
              </ActionButton>
            ) : null}
            <ActionButton action="add" variant={sources.length > 0 ? 'secondary' : 'primary'} onClick={addColumn}>
              Agregar columna
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className="combineOutputColumnList">
          {outputColumns.map((column, index) => (
            <div key={column.id} className="combineOutputColumnItem">
              <label>
                <span>Columna {index + 1}</span>
                <input
                  value={column.name}
                  aria-label={`Nombre de columna de salida ${index + 1}`}
                  onChange={(event) => onChange(outputColumns.map((item) => (
                    item.id === column.id ? { ...item, name: event.target.value } : item
                  )))}
                />
              </label>
              <DeleteButton
                title={`Eliminar columna ${column.name || index + 1}`}
                onClick={() => onChange(outputColumns.filter((item) => item.id !== column.id))}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function getDuplicateNormalizedNames(outputColumns: CombineOutputColumn[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  outputColumns.forEach((column) => {
    const normalizedName = normalizeCombineColumnName(column.name);
    if (!normalizedName) {
      return;
    }
    if (seen.has(normalizedName)) {
      duplicates.add(normalizedName);
    }
    seen.add(normalizedName);
  });

  return [...duplicates];
}
