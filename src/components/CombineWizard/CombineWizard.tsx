import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { buildCombinedRows } from '../../domain/combine/buildCombinedRows';
import { mergeCombineSources, removeCombineSourceFromCollections } from '../../domain/combine/combineBasket';
import {
  buildInitialCombineMappings,
  buildSuggestedCombineOutputColumns,
  reapplyCombineMappings,
} from '../../domain/combine/combineColumnMappings';
import type { AppliedCombineSettings } from '../../domain/combine/combineSettings';
import {
  createCombineSourceFromWorkbookSheet,
  readLoadedCombineSource,
} from '../../domain/combine/readCombineSource';
import { reconcileMappingsAfterCombineSheetChange } from '../../domain/combine/reconcileMappingsAfterCombineSheetChange';
import { reconcileCombineMappings } from '../../domain/combine/reconcileCombineMappings';
import { sortCombinedRows } from '../../domain/combine/sortCombinedRows';
import {
  addSourceMetadataToRows,
  buildSourceMetadataColumns,
} from '../../domain/combine/sourceMetadata';
import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
  ColumnAssignmentMode,
  LoadedCombineSource,
  ResultSort,
  SourceMetadataOptions,
} from '../../types/combine';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { AppIcon } from '../ui/AppIcon/AppIcon';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { TruncatedText } from '../ui/TruncatedText/TruncatedText';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';
import { CombinedRowsPreview } from './CombinedRowsPreview';
import { CombineExportActions } from './CombineExportActions';
import { CombineMappingsEditor } from './CombineMappingsEditor';
import { CombineOutputColumns } from './CombineOutputColumns';
import { CombineResultSort } from './CombineResultSort';
import { CombineSettingsActions } from './CombineSettingsActions';
import { CombineSourceMetadata } from './CombineSourceMetadata';
import { MultipleFileUploader } from './MultipleFileUploader';

type CombineWizardProps = {
  appearanceToolbar?: ReactNode;
  basketSources?: CombineSource[];
  onRemoveBasketSource?: (sourceId: string) => void;
  onLocalStatePresenceChange?: (hasState: boolean) => void;
};

const emptyBasketSources: CombineSource[] = [];

export function CombineWizard({
  appearanceToolbar,
  basketSources = emptyBasketSources,
  onRemoveBasketSource,
  onLocalStatePresenceChange,
}: CombineWizardProps) {
  const [loadedUploadedSources, setLoadedUploadedSources] = useState<LoadedCombineSource[]>([]);
  const [outputColumns, setOutputColumns] = useState<CombineOutputColumn[]>([]);
  const [mappings, setMappings] = useState<CombineColumnMapping[]>([]);
  const [outputFileName, setOutputFileName] = useState('Archivo combinado');
  const [readErrors, setReadErrors] = useState<CombineReadError[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [hasImportedSettings, setHasImportedSettings] = useState(false);
  const [columnAssignmentMode, setColumnAssignmentMode] = useState<ColumnAssignmentMode>('name');
  const [pendingAssignmentMode, setPendingAssignmentMode] = useState<ColumnAssignmentMode | null>(null);
  const [sourceOrder, setSourceOrder] = useState<string[]>([]);
  const [resultSort, setResultSort] = useState<ResultSort>({ columnId: null, direction: 'asc' });
  const [sourceMetadataOptions, setSourceMetadataOptions] = useState<SourceMetadataOptions>({
    includeFileName: false,
    includeSheetName: false,
  });
  const [draggedSourceId, setDraggedSourceId] = useState<string | null>(null);
  const [dragOverSourceId, setDragOverSourceId] = useState<string | null>(null);
  const nextSourceIndexRef = useRef(0);
  const uploadedSources = useMemo(
    () => loadedUploadedSources.map((loadedSource) => loadedSource.source),
    [loadedUploadedSources],
  );
  const mergedSources = useMemo(
    () => mergeCombineSources(basketSources, uploadedSources),
    [basketSources, uploadedSources],
  );
  const sources = useMemo(
    () => applyCombineSourceOrder(mergedSources, sourceOrder),
    [mergedSources, sourceOrder],
  );
  const basketSourceIds = useMemo(
    () => new Set(basketSources.map((source) => source.id)),
    [basketSources],
  );
  const loadedUploadedSourcesById = useMemo(
    () => new Map(loadedUploadedSources.map((loadedSource) => [loadedSource.source.id, loadedSource])),
    [loadedUploadedSources],
  );

  useEffect(() => {
    setMappings((current) => reconcileCombineMappings({
      sources,
      outputColumns,
      previousMappings: current,
      assignmentMode: columnAssignmentMode,
    }));
  }, [sources, outputColumns, columnAssignmentMode]);

  useEffect(() => {
    if (columnAssignmentMode !== 'position' || sources.length === 0) {
      return;
    }
    setOutputColumns((current) => {
      const suggested = buildSuggestedCombineOutputColumns(sources, 'position', current);
      return combineOutputColumnsEqual(current, suggested) ? current : suggested;
    });
  }, [sources, columnAssignmentMode]);

  useEffect(() => {
    onLocalStatePresenceChange?.(
      loadedUploadedSources.length > 0
        || outputColumns.length > 0
        || mappings.length > 0
        || outputFileName !== 'Archivo combinado'
        || hasImportedSettings
        || columnAssignmentMode !== 'name'
        || sourceOrder.length > 0
        || resultSort.columnId !== null
        || sourceMetadataOptions.includeFileName
        || sourceMetadataOptions.includeSheetName,
    );
  }, [
    loadedUploadedSources.length,
    outputColumns.length,
    mappings.length,
    outputFileName,
    hasImportedSettings,
    columnAssignmentMode,
    sourceOrder.length,
    resultSort.columnId,
    sourceMetadataOptions.includeFileName,
    sourceMetadataOptions.includeSheetName,
    onLocalStatePresenceChange,
  ]);

  const applySettings = (settings: AppliedCombineSettings) => {
    setHasImportedSettings(true);
    setOutputColumns(settings.outputColumns);
    setMappings(settings.mappings);
    setOutputFileName(settings.outputFileName);
    setColumnAssignmentMode(settings.columnAssignmentMode);
    setResultSort(settings.resultSort);
    setSourceMetadataOptions(settings.sourceMetadataOptions);
  };

  const applyAssignmentMode = (nextMode: ColumnAssignmentMode) => {
    const nextOutputColumns = buildSuggestedCombineOutputColumns(
      sources,
      nextMode,
      outputColumns,
    );
    setColumnAssignmentMode(nextMode);
    setOutputColumns(nextOutputColumns);
    setMappings(buildInitialCombineMappings(sources, nextOutputColumns, nextMode));
    setPendingAssignmentMode(null);
  };

  const requestAssignmentMode = (nextMode: ColumnAssignmentMode) => {
    if (nextMode === columnAssignmentMode) {
      return;
    }
    if (outputColumns.length > 0) {
      setPendingAssignmentMode(nextMode);
      return;
    }
    applyAssignmentMode(nextMode);
  };

  const combinedRows = useMemo(() => buildCombinedRows({
    sources,
    outputColumns,
    mappings,
  }), [sources, outputColumns, mappings]);
  const effectiveOutputColumns = useMemo(() => [
    ...outputColumns,
    ...buildSourceMetadataColumns(sourceMetadataOptions),
  ], [outputColumns, sourceMetadataOptions]);
  const combinedRowsWithMetadata = useMemo(
    () => addSourceMetadataToRows(combinedRows, sourceMetadataOptions),
    [combinedRows, sourceMetadataOptions],
  );
  const sortedCombinedRows = useMemo(
    () => sortCombinedRows(combinedRowsWithMetadata, resultSort),
    [combinedRowsWithMetadata, resultSort],
  );

  useEffect(() => {
    if (resultSort.columnId && !effectiveOutputColumns.some((column) => column.id === resultSort.columnId)) {
      setResultSort((current) => ({ ...current, columnId: null }));
    }
  }, [effectiveOutputColumns, resultSort.columnId]);

  const loadFiles = async (files: File[]) => {
    const pendingFiles = files.map((file) => ({
      file,
      sourceIndex: nextSourceIndexRef.current++,
    }));
    setIsReading(true);

    const results = await Promise.all(pendingFiles.map(async ({ file, sourceIndex }) => {
      try {
        return { loadedSource: await readLoadedCombineSource(file, sourceIndex) };
      } catch (error) {
        return {
          error: {
            id: `error:${sourceIndex}`,
            fileName: file.name,
            message: error instanceof Error ? error.message : 'No se pudo leer el archivo.',
          },
        };
      }
    }));

    setLoadedUploadedSources((current) => [
      ...current,
      ...results.flatMap((result) => result.loadedSource ? [result.loadedSource] : []),
    ]);
    setReadErrors((current) => [
      ...current,
      ...results.flatMap((result) => result.error ? [result.error] : []),
    ]);
    setIsReading(false);
  };

  const changeUploadedSourceSheet = (sourceId: string, nextSheetName: string) => {
    const loadedSource = loadedUploadedSourcesById.get(sourceId);
    if (loadedSource?.kind !== 'excel') {
      return;
    }
    if (loadedSource.source.sheetName === nextSheetName) {
      setReadErrors((current) => current.filter((error) => error.id !== `sheet:${sourceId}`));
      return;
    }

    try {
      const previousSource = loadedSource.source;
      const nextSource = createCombineSourceFromWorkbookSheet({
        workbook: loadedSource.workbook,
        fileName: previousSource.fileName,
        sourceId,
        sheetName: nextSheetName,
      });

      setLoadedUploadedSources((current) => current.map((item) => (
        item.source.id === sourceId ? { ...item, source: nextSource } : item
      )));
      setMappings((current) => reconcileMappingsAfterCombineSheetChange({
        sourceId,
        outputColumns,
        previousMappings: current,
        previousSourceColumns: previousSource.columns,
        nextSourceColumns: nextSource.columns,
        assignmentMode: columnAssignmentMode,
      }));
      setReadErrors((current) => current.filter((error) => error.id !== `sheet:${sourceId}`));
    } catch (error) {
      setReadErrors((current) => [
        ...current.filter((item) => item.id !== `sheet:${sourceId}`),
        {
          id: `sheet:${sourceId}`,
          fileName: loadedSource.source.fileName,
          message: error instanceof Error
            ? `No se pudo usar la hoja "${nextSheetName}". ${error.message}`
            : `No se pudo usar la hoja "${nextSheetName}".`,
        },
      ]);
    }
  };

  const removeSource = (sourceId: string) => {
    const result = removeCombineSourceFromCollections({
      sourceId,
      basketSources,
      uploadedSources,
    });
    const remainingUploadedSourceIds = new Set(result.uploadedSources.map((source) => source.id));
    setLoadedUploadedSources((current) => current.filter((loadedSource) => (
      remainingUploadedSourceIds.has(loadedSource.source.id)
    )));
    setReadErrors((current) => current.filter((error) => error.id !== `sheet:${sourceId}`));
    setSourceOrder((current) => {
      const remaining = current.filter((id) => id !== sourceId);
      return remaining.length > 1 ? remaining : [];
    });
    if (result.removedBasketSourceId) {
      onRemoveBasketSource?.(result.removedBasketSourceId);
    }
  };

  const reorderSources = (fromIndex: number, toIndex: number) => {
    const reordered = reorderCombineSources(sources, fromIndex, toIndex);
    if (reordered === sources) {
      return;
    }
    setSourceOrder(reordered.map((source) => source.id));
  };

  const startSourceDrag = (sourceId: string, event: DragEvent<HTMLElement>) => {
    setDraggedSourceId(sourceId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', sourceId);
  };

  const dropSource = (targetSourceId: string, event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain') || draggedSourceId;
    const fromIndex = sources.findIndex((source) => source.id === sourceId);
    const toIndex = sources.findIndex((source) => source.id === targetSourceId);
    reorderSources(fromIndex, toIndex);
    setDraggedSourceId(null);
    setDragOverSourceId(null);
  };

  return (
    <main className="appShell combineWizard">
      <ConfirmDialog
        open={pendingAssignmentMode !== null}
        title="Cambiar modo de asignación"
        message="Se recalcularán las columnas de salida y sus asignaciones sugeridas. Los cambios manuales actuales pueden reemplazarse."
        cancelLabel="Cancelar"
        confirmLabel="Cambiar modo"
        onCancel={() => setPendingAssignmentMode(null)}
        onConfirm={() => pendingAssignmentMode && applyAssignmentMode(pendingAssignmentMode)}
      />
      {appearanceToolbar}
      <header className="hero combineHero">
        <div>
          <p className="eyebrow">PANDORA</p>
          <h1>Combiná varios archivos en una sola planilla</h1>
          <p>Cargá tus archivos, organizá las columnas y generá un único Excel.</p>
        </div>
      </header>

      <div className="wizard">
        <section className="panel combineFlowPanel combineSourcesPanel">
          <h2 className="headingWithInfo">
            <span>1. Archivos</span>
            <InfoTooltip
              ariaLabel="Información sobre los archivos para combinar"
              placement="right"
              content="Cargá archivos o usá resultados guardados desde el sanitizador. En Excel se usa una hoja por archivo. Si el archivo tiene varias hojas, podés elegir cuál usar. Encabezado: se toma la primera fila no vacía. CSV: se interpreta como tabla única."
            />
          </h2>
          <MultipleFileUploader disabled={isReading} onFilesSelected={(files) => void loadFiles(files)} />

          {basketSources.length > 0 ? (
            <p className="combineBasketNotice">
              Los resultados guardados para combinar son temporales y se pierden al recargar la página.
            </p>
          ) : null}

          {readErrors.length > 0 ? (
            <div className="combineReadErrors" aria-live="polite">
              {readErrors.map((error) => (
                <p key={error.id} className="errorText">
                  <strong>{error.fileName}:</strong> {error.message}
                </p>
              ))}
            </div>
          ) : null}

          {sources.length > 0 ? (
            <>
              <div className="combineSourcesHeader">
                <h3>Archivos cargados</h3>
                <span
                  className="combineSourcesCount"
                  aria-label={`${sources.length} ${sources.length === 1 ? 'archivo cargado' : 'archivos cargados'}`}
                >
                  {sources.length}
                </span>
              </div>
              <p className="muted combineSourcesOrderHint">
                Ordená las fuentes para definir cómo se unirán en el archivo final.
              </p>
              <div className="combineSourceList">
                {sources.map((source) => {
                  const loadedSource = basketSourceIds.has(source.id)
                    ? undefined
                    : loadedUploadedSourcesById.get(source.id);
                  const hasSheetSelector = loadedSource?.kind === 'excel'
                    && loadedSource.sheetNames.length > 1;

                  return (
                    <article
                      key={source.id}
                      className={`combineSourceItem${draggedSourceId === source.id ? ' isDragging' : ''}${dragOverSourceId === source.id && draggedSourceId !== source.id ? ' isDragTarget' : ''}`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        setDragOverSourceId(source.id);
                      }}
                      onDragLeave={() => setDragOverSourceId((current) => current === source.id ? null : current)}
                      onDrop={(event) => dropSource(source.id, event)}
                      onDragEnd={() => {
                        setDraggedSourceId(null);
                        setDragOverSourceId(null);
                      }}
                    >
                      <div className="combineSourceMain">
                        <div className="combineSourceIdentity">
                          <strong className="combineSourceFileName">
                            <TruncatedText text={source.fileName} tooltipThreshold={24} />
                          </strong>
                          <span className={`combineSourceBadge${basketSourceIds.has(source.id) ? '' : ' isManual'}`}>
                            {basketSourceIds.has(source.id) ? 'Desde sanitizador' : 'Manual'}
                          </span>
                        </div>
                        {hasSheetSelector ? (
                          <Dropdown
                            className="compact combineSourceSheetSelector"
                            label="Hoja usada"
                            value={source.sheetName ?? ''}
                            options={loadedSource.sheetNames.map((sheetName) => ({
                              value: sheetName,
                              label: sheetName,
                            }))}
                            onChange={(sheetName) => changeUploadedSourceSheet(source.id, sheetName)}
                          />
                        ) : null}
                        <p className="muted combineSourceMeta">
                          {!hasSheetSelector && source.sheetName ? `Hoja usada: ${source.sheetName} · ` : ''}
                          {source.columns.length} {source.columns.length === 1 ? 'columna' : 'columnas'} ·{' '}
                          {source.rows.length} {source.rows.length === 1 ? 'fila' : 'filas'} de datos
                        </p>
                      </div>
                      <div className="combineSourceActions">
                        <span
                          className="dragHandle combineSourceDragHandle"
                          draggable
                          aria-hidden="true"
                          onDragStart={(event) => startSourceDrag(source.id, event)}
                          onDragEnd={() => {
                            setDraggedSourceId(null);
                            setDragOverSourceId(null);
                          }}
                        >
                          <AppIcon name="reorder" size={18} />
                        </span>
                        <InfoTooltip content="Remover" placement="left">
                          <DeleteButton
                            title={`Remover ${source.fileName}`}
                            onClick={() => removeSource(source.id)}
                          />
                        </InfoTooltip>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>
        <CombineSettingsActions
          sources={sources}
          outputColumns={outputColumns}
          mappings={mappings}
          outputFileName={outputFileName}
          columnAssignmentMode={columnAssignmentMode}
          resultSort={resultSort}
          sourceMetadataOptions={sourceMetadataOptions}
          onApplySettings={applySettings}
        />
        <CombineOutputColumns
          sources={sources}
          outputColumns={outputColumns}
          onChange={setOutputColumns}
          assignmentMode={columnAssignmentMode}
          onAssignmentModeChange={requestAssignmentMode}
        />
        {sources.length > 0 && outputColumns.length > 0 ? (
          <>
            <CombineMappingsEditor
              sources={sources}
              outputColumns={outputColumns}
              mappings={mappings}
              onMappingChange={(nextMapping) => setMappings((current) => reconcileCombineMappings({
                sources,
                outputColumns,
                previousMappings: [
                  ...current.filter((mapping) => !(
                    mapping.sourceId === nextMapping.sourceId
                    && mapping.outputColumnId === nextMapping.outputColumnId
                  )),
                  nextMapping,
                ],
              }))}
              onReapplyMappings={() => setMappings(reapplyCombineMappings(
                sources,
                outputColumns,
                columnAssignmentMode,
              ))}
            />
            <CombineSourceMetadata
              options={sourceMetadataOptions}
              onChange={setSourceMetadataOptions}
            />
            <CombineResultSort
              outputColumns={effectiveOutputColumns}
              resultSort={resultSort}
              onChange={setResultSort}
            />
            <CombinedRowsPreview
              sources={sources}
              outputColumns={effectiveOutputColumns}
              mappings={mappings}
              rows={sortedCombinedRows}
            />
            <CombineExportActions
              sources={sources}
              outputColumns={effectiveOutputColumns}
              mappings={mappings}
              combinedRows={sortedCombinedRows}
              outputFileName={outputFileName}
              onOutputFileNameChange={setOutputFileName}
            />
          </>
        ) : null}
      </div>
    </main>
  );
}

type CombineReadError = {
  id: string;
  fileName: string;
  message: string;
};

export function applyCombineSourceOrder(sources: CombineSource[], sourceOrder: string[]) {
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const orderedSourceIds = new Set(sourceOrder);
  return [
    ...sourceOrder.flatMap((sourceId) => {
      const source = sourcesById.get(sourceId);
      return source ? [source] : [];
    }),
    ...sources.filter((source) => !orderedSourceIds.has(source.id)),
  ];
}

export function reorderCombineSources(sources: CombineSource[], fromIndex: number, toIndex: number) {
  if (
    fromIndex === toIndex
    || fromIndex < 0
    || toIndex < 0
    || fromIndex >= sources.length
    || toIndex >= sources.length
  ) {
    return sources;
  }

  const reordered = [...sources];
  const [movedSource] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, movedSource);
  return reordered;
}

function combineOutputColumnsEqual(left: CombineOutputColumn[], right: CombineOutputColumn[]) {
  return left.length === right.length && left.every((column, index) => (
    column.id === right[index]?.id && column.name === right[index]?.name
  ));
}
