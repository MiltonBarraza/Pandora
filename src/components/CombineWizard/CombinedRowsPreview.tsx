import { memo, useMemo, type CSSProperties } from 'react';
import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
  CombinedRow,
  ResultSort,
} from '../../types/combine';
import { TruncatedText } from '../ui/TruncatedText/TruncatedText';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { isSourceMetadataColumn } from '../../domain/combine/sourceMetadata';
import { CombineResultSort } from './CombineResultSort';

const previewRowLimit = 30;

type CombinedRowsPreviewProps = {
  sources: CombineSource[];
  outputColumns: CombineOutputColumn[];
  mappings: CombineColumnMapping[];
  rows: CombinedRow[];
  resultSort: ResultSort;
  onResultSortChange: (resultSort: ResultSort) => void;
};

type CombinedPreviewTableStyle = CSSProperties & {
  '--combine-preview-column-count': string;
};

export const CombinedRowsPreview = memo(function CombinedRowsPreview({
  sources,
  outputColumns,
  mappings,
  rows,
  resultSort,
  onResultSortChange,
}: CombinedRowsPreviewProps) {
  const previewRows = useMemo(() => rows.slice(0, previewRowLimit), [rows]);
  const showSheetColumn = useMemo(
    () => sources.some((source) => Boolean(source.sheetName)),
    [sources],
  );
  const { unmappedColumnCount, unmappedMappingCount, affectedCellCount } = useMemo(
    () => getUnmappedSummary(sources, outputColumns, mappings),
    [sources, outputColumns, mappings],
  );

  return (
    <section className="panel combineFlowPanel combinePreviewPanel wizardSectionEnter">
      <h2>4. Vista previa</h2>
      <div className="combinePreviewSummary summaryMetricList" aria-label="Resumen de vista previa">
        <span className="summaryMetricGroupLabel">Resumen:</span>
        <span className="combinePreviewSummaryChip summaryMetricChip">
          <span>Archivos</span>
          <strong>{sources.length}</strong>
        </span>
        <span className="combinePreviewSummaryChip summaryMetricChip">
          <span>Filas</span>
          <strong>{rows.length}</strong>
        </span>
        <span className="combinePreviewSummaryChip summaryMetricChip">
          <span>Columnas</span>
          <strong>{outputColumns.length}</strong>
        </span>
        {unmappedMappingCount > 0 ? (
          <InfoTooltip content={buildUnmappedTooltip(unmappedColumnCount, affectedCellCount)} placement="top">
            <span className="combineUnmappedChip">Sin asignar</span>
          </InfoTooltip>
        ) : null}
      </div>
      <CombineResultSort
        outputColumns={outputColumns}
        resultSort={resultSort}
        onChange={onResultSortChange}
      />

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
});

function buildUnmappedTooltip(unmappedColumnCount: number, affectedCellCount: number) {
  const columnSummary = `${unmappedColumnCount} ${unmappedColumnCount === 1 ? 'columna sin asignar' : 'columnas sin asignar'}.`;
  const base = `${columnSummary} Las columnas sin asignar generarán celdas vacías.`;
  if (affectedCellCount <= 0) {
    return base;
  }
  return `${base} Afecta ${affectedCellCount} ${affectedCellCount === 1 ? 'celda' : 'celdas'}.`;
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
  const unmappedOutputColumnIds = new Set<string>();
  const mappedOutputColumns = outputColumns.filter((column) => !isSourceMetadataColumn(column.id));

  sources.forEach((source) => {
    mappedOutputColumns.forEach((outputColumn) => {
      const mapping = mappingsByPair.get(`${source.id}\u0000${outputColumn.id}`);
      if (!mapping?.sourceColumnId) {
        unmappedMappingCount += 1;
        unmappedOutputColumnIds.add(outputColumn.id);
        affectedCellCount += source.rows.length;
      }
    });
  });

  return { unmappedColumnCount: unmappedOutputColumnIds.size, unmappedMappingCount, affectedCellCount };
}
