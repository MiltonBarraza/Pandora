import type { CSSProperties } from 'react';
import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
  CombinedRow,
} from '../../types/combine';
import { TruncatedText } from '../ui/TruncatedText/TruncatedText';

const previewRowLimit = 30;

type CombinedRowsPreviewProps = {
  sources: CombineSource[];
  outputColumns: CombineOutputColumn[];
  mappings: CombineColumnMapping[];
  rows: CombinedRow[];
};

type CombinedPreviewTableStyle = CSSProperties & {
  '--combine-preview-column-count': string;
};

export function CombinedRowsPreview({
  sources,
  outputColumns,
  mappings,
  rows,
}: CombinedRowsPreviewProps) {
  const previewRows = rows.slice(0, previewRowLimit);
  const showSheetColumn = sources.some((source) => Boolean(source.sheetName));
  const { unmappedMappingCount, affectedCellCount } = getUnmappedSummary(sources, outputColumns, mappings);

  return (
    <section className="panel">
      <h2>Vista previa combinada</h2>
      <p className="combinePreviewOverview">
        <strong>{sources.length}</strong> {sources.length === 1 ? 'fuente' : 'fuentes'} ·{' '}
        <strong>{rows.length}</strong> {rows.length === 1 ? 'fila' : 'filas'} ·{' '}
        <strong>{outputColumns.length}</strong> {outputColumns.length === 1 ? 'columna' : 'columnas'}
      </p>

      {unmappedMappingCount > 0 ? (
        <p className="combineMappingNotice">
          Las columnas sin mapear generarán celdas vacías.
          {affectedCellCount > 0 ? ` Esto afecta ${affectedCellCount} ${affectedCellCount === 1 ? 'celda' : 'celdas'} en el resultado actual.` : ''}
        </p>
      ) : null}

      {sources.length === 0 ? (
        <div className="emptyState combinePreviewEmpty">Cargá archivos para generar la vista previa.</div>
      ) : outputColumns.length === 0 ? (
        <div className="emptyState combinePreviewEmpty">Definí columnas de salida para generar la vista previa.</div>
      ) : rows.length === 0 ? (
        <div className="emptyState combinePreviewEmpty">No hay filas combinadas para mostrar.</div>
      ) : (
        <>
          <p className="muted combinePreviewLimit">
            {rows.length > previewRowLimit
              ? `Mostrando las primeras ${previewRowLimit} de ${rows.length} filas combinadas.`
              : `Mostrando ${rows.length} ${rows.length === 1 ? 'fila combinada' : 'filas combinadas'}.`}
          </p>
          <div className="tableWrap combinePreviewTableWrap">
            <table
              className="combinePreviewTable"
              style={{ '--combine-preview-column-count': String(outputColumns.length) } as CombinedPreviewTableStyle}
            >
              <colgroup>
                <col className="combinePreviewTraceColumn" />
                {showSheetColumn ? <col className="combinePreviewTraceColumn" /> : null}
                {outputColumns.map((column) => <col key={column.id} className="combinePreviewDataColumn" />)}
              </colgroup>
              <thead>
                <tr>
                  <th>Archivo</th>
                  {showSheetColumn ? <th>Hoja</th> : null}
                  {outputColumns.map((column) => (
                    <th key={column.id}>
                      <TruncatedText text={column.name.trim() || 'Columna sin nombre'} tooltipThreshold={14} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.id}>
                    <td><TruncatedText text={row.sourceFileName} tooltipThreshold={24} /></td>
                    {showSheetColumn ? (
                      <td><TruncatedText text={row.sourceSheetName ?? ''} tooltipThreshold={24} /></td>
                    ) : null}
                    {outputColumns.map((column) => (
                      <td key={column.id}>
                        <TruncatedText text={row.values[column.id] ?? ''} tooltipThreshold={24} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function getUnmappedSummary(
  sources: CombineSource[],
  outputColumns: CombineOutputColumn[],
  mappings: CombineColumnMapping[],
) {
  const mappingsByPair = new Map(
    mappings.map((mapping) => [`${mapping.sourceId}\u0000${mapping.outputColumnId}`, mapping]),
  );
  let unmappedMappingCount = 0;
  let affectedCellCount = 0;

  sources.forEach((source) => {
    outputColumns.forEach((outputColumn) => {
      const mapping = mappingsByPair.get(`${source.id}\u0000${outputColumn.id}`);
      if (!mapping?.sourceColumnId) {
        unmappedMappingCount += 1;
        affectedCellCount += source.rows.length;
      }
    });
  });

  return { unmappedMappingCount, affectedCellCount };
}
