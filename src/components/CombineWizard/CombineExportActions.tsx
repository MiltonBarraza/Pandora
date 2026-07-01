import { normalizeCombineColumnName } from '../../domain/combine/combineColumnMappings';
import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
  CombinedRow,
} from '../../types/combine';
import { ActionButton } from '../ui/ActionButton/ActionButton';

type CombineExportActionsProps = {
  sources: CombineSource[];
  outputColumns: CombineOutputColumn[];
  mappings: CombineColumnMapping[];
  combinedRows: CombinedRow[];
  outputFileName: string;
  onOutputFileNameChange: (fileName: string) => void;
};

export function CombineExportActions({
  sources,
  outputColumns,
  mappings,
  combinedRows,
  outputFileName,
  onOutputFileNameChange,
}: CombineExportActionsProps) {
  const disabledReason = getExportDisabledReason(sources, outputColumns, combinedRows);
  const hasEmptyNames = outputColumns.some((column) => column.name.trim() === '');
  const hasDuplicateNames = hasDuplicateColumnNames(outputColumns);
  const hasUnmappedColumns = hasUnmappedMappings(sources, outputColumns, mappings);

  const download = async () => {
    if (disabledReason) {
      return;
    }
    const { exportCombinedXlsx } = await import('../../domain/combine/exportCombinedXlsx');
    exportCombinedXlsx({ outputColumns, combinedRows, fileName: outputFileName });
  };

  return (
    <section className="panel">
      <h2>Exportar combinado</h2>
      <div className="combinePreviewSummary">
        <span><strong>{sources.length}</strong> {sources.length === 1 ? 'archivo combinado' : 'archivos combinados'}</span>
        <span><strong>{combinedRows.length}</strong> {combinedRows.length === 1 ? 'fila' : 'filas'} a exportar</span>
        <span><strong>{outputColumns.length}</strong> {outputColumns.length === 1 ? 'columna' : 'columnas'} a exportar</span>
      </div>

      {hasEmptyNames ? <p className="combineColumnWarning">Columnas sin nombre usarán “Columna sin nombre”.</p> : null}
      {hasDuplicateNames ? <p className="combineColumnWarning">Nombres duplicados se conservarán en el Excel.</p> : null}
      {hasUnmappedColumns ? (
        <p className="combineMappingNotice">Mappings sin asignar generarán celdas vacías.</p>
      ) : null}

      <div className="combineExportControls">
        <label className="combineExportFileName">
          <span>Nombre del archivo</span>
          <input
            value={outputFileName}
            placeholder="Archivo combinado"
            onChange={(event) => onOutputFileNameChange(event.target.value)}
          />
          <small className="muted">La extensión .xlsx se agrega automáticamente.</small>
        </label>
        <ActionButton action="download" disabled={Boolean(disabledReason)} onClick={() => void download()}>
          Descargar Excel combinado
        </ActionButton>
      </div>
      {disabledReason ? <p className="muted combineExportDisabledReason">{disabledReason}</p> : null}
    </section>
  );
}

function getExportDisabledReason(
  sources: CombineSource[],
  outputColumns: CombineOutputColumn[],
  combinedRows: CombinedRow[],
) {
  if (sources.length === 0) {
    return 'Cargá al menos un archivo para exportar.';
  }
  if (outputColumns.length === 0) {
    return 'Definí al menos una columna de salida para exportar.';
  }
  if (combinedRows.length === 0) {
    return 'No hay filas combinadas para exportar.';
  }
  return '';
}

function hasDuplicateColumnNames(outputColumns: CombineOutputColumn[]) {
  const names = outputColumns
    .map((column) => normalizeCombineColumnName(column.name))
    .filter(Boolean);
  return new Set(names).size !== names.length;
}

function hasUnmappedMappings(
  sources: CombineSource[],
  outputColumns: CombineOutputColumn[],
  mappings: CombineColumnMapping[],
) {
  const mappedPairs = new Set(
    mappings
      .filter((mapping) => Boolean(mapping.sourceColumnId))
      .map((mapping) => `${mapping.sourceId}\u0000${mapping.outputColumnId}`),
  );
  return sources.some((source) => outputColumns.some((column) => (
    !mappedPairs.has(`${source.id}\u0000${column.id}`)
  )));
}
