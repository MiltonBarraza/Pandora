import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
} from '../../types/combine';
import { Dropdown } from '../ui/Dropdown/Dropdown';

type CombineMappingsEditorProps = {
  sources: CombineSource[];
  outputColumns: CombineOutputColumn[];
  mappings: CombineColumnMapping[];
  onMappingChange: (mapping: CombineColumnMapping) => void;
};

export function CombineMappingsEditor({
  sources,
  outputColumns,
  mappings,
  onMappingChange,
}: CombineMappingsEditorProps) {
  const mappingsByPair = new Map(
    mappings.map((mapping) => [mappingKey(mapping.sourceId, mapping.outputColumnId), mapping]),
  );
  const unmappedCount = sources.reduce((count, source) => (
    count + outputColumns.filter((outputColumn) => (
      !mappingsByPair.get(mappingKey(source.id, outputColumn.id))?.sourceColumnId
    )).length
  ), 0);

  return (
    <section className="panel">
      <h2>Mapeo de columnas</h2>
      {sources.length === 0 ? (
        <div className="emptyState combineMappingsEmpty">Cargá archivos para mapear columnas.</div>
      ) : outputColumns.length === 0 ? (
        <div className="emptyState combineMappingsEmpty">Definí columnas de salida para configurar el mapeo.</div>
      ) : (
        <>
          {unmappedCount > 0 ? (
            <p className="combineMappingNotice">
              Las columnas sin mapear se exportarán vacías para ese archivo.
            </p>
          ) : null}
          <div className="combineMappingSources">
            {sources.map((source) => (
              <section key={source.id} className="combineMappingSource">
                <div className="combineMappingSourceHeader">
                  <h3>{source.fileName}</h3>
                  <p className="muted">
                    {source.sheetName ? `Hoja: ${source.sheetName} · ` : ''}
                    {source.rows.length} {source.rows.length === 1 ? 'fila' : 'filas'} de datos
                  </p>
                </div>
                <div className="tableWrap combineMappingTableWrap">
                  <table className="combineMappingTable">
                    <thead>
                      <tr>
                        <th>Columna de salida</th>
                        <th>Columna del archivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outputColumns.map((outputColumn) => {
                        const mapping = mappingsByPair.get(mappingKey(source.id, outputColumn.id));
                        const sourceColumnId = mapping?.sourceColumnId ?? null;
                        return (
                          <tr key={outputColumn.id}>
                            <td>{outputColumn.name || 'Sin nombre'}</td>
                            <td>
                              <Dropdown
                                value={sourceColumnId ?? ''}
                                options={[
                                  { value: '', label: 'Sin mapear' },
                                  ...source.columns.map((column) => ({
                                    value: column.id,
                                    label: `${column.name} (columna ${column.index + 1})`,
                                  })),
                                ]}
                                scrollStrategy="lock"
                                onChange={(value) => onMappingChange({
                                  sourceId: source.id,
                                  outputColumnId: outputColumn.id,
                                  sourceColumnId: value || null,
                                })}
                              />
                              {!sourceColumnId ? <span className="muted combineUnmappedText">Sin mapear</span> : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function mappingKey(sourceId: string, outputColumnId: string) {
  return `${sourceId}\u0000${outputColumnId}`;
}
