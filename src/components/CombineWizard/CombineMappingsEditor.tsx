import type {
  ColumnAssignmentMode,
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
} from '../../types/combine';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

type CombineMappingsEditorProps = {
  sources: CombineSource[];
  outputColumns: CombineOutputColumn[];
  mappings: CombineColumnMapping[];
  assignmentMode: ColumnAssignmentMode;
  onMappingChange: (mapping: CombineColumnMapping) => void;
  onReapplyMappings: () => void;
};

export function CombineMappingsEditor({
  sources,
  outputColumns,
  mappings,
  assignmentMode,
  onMappingChange,
  onReapplyMappings,
}: CombineMappingsEditorProps) {
  const [isReapplyConfirmationOpen, setIsReapplyConfirmationOpen] = useState(false);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const mappingsByPair = new Map(
    mappings.map((mapping) => [mappingKey(mapping.sourceId, mapping.outputColumnId), mapping]),
  );
  const reapplyHelp = assignmentMode === 'position'
    ? 'Se reemplazarán las asignaciones actuales usando la posición de las columnas en cada fuente.'
    : 'Se reemplazarán las asignaciones actuales comparando nombres sin distinguir mayúsculas, tildes ni espacios extra.';
  const tooltipHelp = assignmentMode === 'position'
    ? 'Vuelve a asignar columnas automáticamente por posición dentro de cada fuente.'
    : 'Vuelve a asignar columnas automáticamente cuando sus nombres coinciden ignorando mayúsculas, tildes y espacios extra.';

  useEffect(() => {
    setExpandedSourceId((current) => (
      current && sources.some((source) => source.id === current)
        ? current
        : sources[0]?.id ?? null
    ));
  }, [sources]);

  return (
    <section className="panel combineFlowPanel combineMappingsPanel wizardSectionEnter">
      <ConfirmDialog
        open={isReapplyConfirmationOpen}
        title="Reasignar columnas"
        message={reapplyHelp}
        cancelLabel="Cancelar"
        confirmLabel="Reasignar columnas"
        onCancel={() => setIsReapplyConfirmationOpen(false)}
        onConfirm={() => {
          setIsReapplyConfirmationOpen(false);
          onReapplyMappings();
        }}
      />
      <h2 className="headingWithInfo">
        <span>3. Asignar columnas</span>
        <InfoTooltip
          ariaLabel="Información sobre la asignación de columnas"
          placement="right"
          content="Compara nombres ignorando mayúsculas, tildes y espacios extra. No usa sinónimos ni coincidencias aproximadas."
        />
      </h2>
      <div className="combineMappingsToolbar">
        <p className="muted">Indicá qué columna de cada archivo corresponde a cada columna de salida.</p>
        {sources.length > 0 && outputColumns.length > 0 ? (
          <InfoTooltip
            placement="bottom"
            content={tooltipHelp}
          >
            <ActionButton
              action="configure"
              variant="secondary"
              onClick={() => setIsReapplyConfirmationOpen(true)}
            >
              Reasignar columnas
            </ActionButton>
          </InfoTooltip>
        ) : null}
      </div>
      {sources.length === 0 ? (
        <div className="emptyState combineMappingsEmpty">Cargá archivos para asignar columnas.</div>
      ) : outputColumns.length === 0 ? (
        <div className="emptyState combineMappingsEmpty">Definí columnas de salida para configurar la asignación.</div>
      ) : (
        <div className="combineMappingSources">
            {sources.map((source) => {
              const isExpanded = expandedSourceId === source.id;
              const mappedCount = outputColumns.filter((outputColumn) => (
                Boolean(mappingsByPair.get(mappingKey(source.id, outputColumn.id))?.sourceColumnId)
              )).length;
              const contentId = `combine-mapping-${source.id}`;
              return (
                <section key={source.id} className={`combineMappingSource${isExpanded ? ' isExpanded' : ''}`}>
                  <button
                    type="button"
                    className="combineMappingSourceToggle"
                    aria-expanded={isExpanded}
                    aria-controls={contentId}
                    onClick={() => setExpandedSourceId(isExpanded ? null : source.id)}
                  >
                    <span className="combineMappingSourceIdentity">
                      <strong>{source.fileName}</strong>
                      <small className="muted">
                        {source.sheetName ? `Hoja: ${source.sheetName} · ` : ''}
                        {source.rows.length} {source.rows.length === 1 ? 'fila' : 'filas'}
                      </small>
                    </span>
                    <span className="combineMappingSourceProgress">
                      <span>{mappedCount}/{outputColumns.length} columnas asignadas</span>
                      <span className="combineMappingChevron" aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
                    </span>
                  </button>
                  <div
                    id={contentId}
                    className={`combineMappingSourceContent${isExpanded ? '' : ' isCollapsed'}`}
                    aria-hidden={!isExpanded}
                  >
                    <div className="combineMappingSourceContentInner">
                      <div className="tableWrap combineMappingTableWrap">
                        <table className="combineMappingTable">
                          <thead>
                            <tr>
                              <th>Columna de salida</th>
                              <th aria-label="Estado de asignación" />
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
                                  <td className="combineMappingStatusCell">
                                    {!sourceColumnId ? (
                                      <InfoTooltip
                                        content="Las columnas sin asignar generarán celdas vacías."
                                        placement="top"
                                      >
                                        <span className="combineUnmappedChip">Sin asignar</span>
                                      </InfoTooltip>
                                    ) : null}
                                  </td>
                                  <td className="combineMappingControlCell">
                                    <Dropdown
                                      value={sourceColumnId ?? ''}
                                      options={[
                                        { value: '', label: 'Sin asignar' },
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
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
      )}
    </section>
  );
}

function mappingKey(sourceId: string, outputColumnId: string) {
  return `${sourceId}\u0000${outputColumnId}`;
}
