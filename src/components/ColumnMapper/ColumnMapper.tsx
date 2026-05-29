import { columnLabel } from '../../domain/import/normalizeHeaders';
import type { ColumnMapping, OutputCategory, RawRow } from '../../types/import';

type ColumnMapperProps = {
  headerRow?: RawRow;
  maxColumns: number;
  activeColumns: number[];
  mapping: ColumnMapping;
  categories: OutputCategory[];
  onChange: (mapping: ColumnMapping) => void;
};

export function ColumnMapper({ headerRow, maxColumns, activeColumns, mapping, categories, onChange }: ColumnMapperProps) {
  const orderedCategories = [...categories].sort((a, b) => a.order - b.order);
  const columns = activeColumns.length ? activeColumns : Array.from({ length: maxColumns }, (_, index) => index);

  return (
    <div className="mapperGrid">
      {columns.map((index) => (
        <label className="field compact" key={index}>
          <span>{columnLabel(index, headerRow)}</span>
          <select
            value={mapping[index] ?? 'ignore'}
            onChange={(event) => onChange({ ...mapping, [index]: event.target.value })}
          >
            <option value="ignore">Ignorar</option>
            {orderedCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
