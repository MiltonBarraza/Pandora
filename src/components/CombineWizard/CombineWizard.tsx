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
  clearCombineDraft,
  loadCombineDraft,
  restoreCombineDraft,
  saveCombineDraft,
  type CombineDraft,
} from '../../domain/combine/combineDraft';
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
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';
import { CombinedRowsPreview } from './CombinedRowsPreview';
import { CombineExportActions } from './CombineExportActions';
import { CombineMappingsEditor } from './CombineMappingsEditor';
import { CombineOutputColumns } from './CombineOutputColumns';
import { CombineSettingsActions } from './CombineSettingsActions';
import { MultipleFileUploader } from './MultipleFileUploader';
import { showInfoToast } from '../../services/toastService';

type CombineWizardProps = {
  appearanceToolbar?: ReactNode;
  basketSources?: CombineSource[];
  onRemoveBasketSource?: (sourceId: string) => void;
  onLocalStatePresenceChange?: (hasState: boolean) => void;
};

const emptyBasketSources: CombineSource[] = [];
const combineDraftSaveDelayMs = 200;

export function CombineWizard({
  appearanceToolbar,
  basketSources = emptyBasketSources,
  onRemoveBasketSource,
  onLocalStatePresenceChange,
}: CombineWizardProps) {
  const [initialDraft] = useState(loadCombineDraft);
  const [restoredDraft] = useState(() => restoreCombineDraft(initialDraft, basketSources));
  const [loadedUploadedSources, setLoadedUploadedSources] = useState<LoadedCombineSource[]>([]);
  const [outputColumns, setOutputColumns] = useState<CombineOutputColumn[]>(restoredDraft.outputColumns);
  const [mappings, setMappings] = useState<CombineColumnMapping[]>(restoredDraft.mappings);
  const [outputFileName, setOutputFileName] = useState(restoredDraft.outputFileName);
  const [readErrors, setReadErrors] = useState<CombineReadError[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [readingFileCount, setReadingFileCount] = useState(0);
  const [changingSourceSheetId, setChangingSourceSheetId] = useState<string | null>(null);
  const [hasImportedSettings, setHasImportedSettings] = useState(false);
  const [columnAssignmentMode, setColumnAssignmentMode] = useState<ColumnAssignmentMode>(restoredDraft.columnAssignmentMode);
  const [pendingAssignmentMode, setPendingAssignmentMode] = useState<ColumnAssignmentMode | null>(null);
  const [sourceOrder, setSourceOrder] = useState<string[]>(restoredDraft.sourceOrder);
  const [resultSort, setResultSort] = useState<ResultSort>(restoredDraft.resultSort);
  const [sourceMetadataOptions, setSourceMetadataOptions] = useState<SourceMetadataOptions>(restoredDraft.sourceMetadataOptions);
  const [draggedSourceId, setDraggedSourceId] = useState<string | null>(null);
  const [dragOverSourceId, setDragOverSourceId] = useState<string | null>(null);
  const nextSourceIndexRef = useRef(0);
  const draftSaveTimeoutRef = useRef<number | null>(null);
  const pendingDraftRef = useRef<CombineDraft | null>(null);
  const savedDraftSignatureRef = useRef(initialDraft ? JSON.stringify(initialDraft) : null);
  const hasAutoInitializedOutputColumnsRef = useRef(restoredDraft.outputColumns.length > 0);
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
    setMappings((current) => {
      const next = reconcileCombineMappings({
        sources,
        outputColumns,
        previousMappings: current,
        assignmentMode: columnAssignmentMode,
      });
      return combineMappingsEqual(current, next) ? current : next;
    });
  }, [sources, outputColumns, columnAssignmentMode]);

  useEffect(() => {
    if (sources.length === 0) {
      hasAutoInitializedOutputColumnsRef.current = false;
      return;
    }

    if (
      uploadedSources.length > 0
      && outputColumns.length === 0
      && !hasAutoInitializedOutputColumnsRef.current
    ) {
      setOutputColumns(buildSuggestedCombineOutputColumns(sources, columnAssignmentMode));
      hasAutoInitializedOutputColumnsRef.current = true;
      return;
    }

    if (outputColumns.length > 0) {
      hasAutoInitializedOutputColumnsRef.current = true;
    }

    if (columnAssignmentMode !== 'position') {
      return;
    }
    setOutputColumns((current) => {
      const suggested = buildSuggestedCombineOutputColumns(sources, 'position', current);
      return combineOutputColumnsEqual(current, suggested) ? current : suggested;
    });
  }, [sources, columnAssignmentMode, outputColumns.length, uploadedSources.length]);

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

  const draftSnapshot = useMemo<CombineDraft | null>(() => {
    const hasSelectedNonDefaultSheet = loadedUploadedSources.some((loadedSource) => (
      loadedSource.kind === 'excel'
      && loadedSource.source.sheetName !== loadedSource.sheetNames[0]
    ));
    const hasDraftableState = outputColumns.length > 0
      || mappings.length > 0
      || outputFileName !== 'Archivo combinado'
      || columnAssignmentMode !== 'name'
      || sourceOrder.length > 0
      || resultSort.columnId !== null
      || sourceMetadataOptions.includeFileName
      || sourceMetadataOptions.includeSheetName
      || hasSelectedNonDefaultSheet;

    if (!hasDraftableState) {
      return null;
    }

    const canRestoreSourceOrder = sources.length > 0
      && sources.every((source) => basketSourceIds.has(source.id));
    return {
      schemaVersion: 1,
      columnAssignmentMode,
      outputColumns,
      mappings: mappings.filter((mapping) => basketSourceIds.has(mapping.sourceId)),
      sourceMetadataOptions,
      resultSort,
      outputFileName,
      sourceOrder: canRestoreSourceOrder ? sources.map((source) => source.id) : [],
      sourceIds: sources.map((source) => source.id),
      sourceSheets: loadedUploadedSources.flatMap((loadedSource) => (
        loadedSource.kind === 'excel' && loadedSource.source.sheetName
          ? [{ sourceId: loadedSource.source.id, sheetName: loadedSource.source.sheetName }]
          : []
      )),
    };
  }, [
    basketSourceIds,
    columnAssignmentMode,
    loadedUploadedSources,
    mappings,
    outputColumns,
    outputFileName,
    resultSort,
    sourceMetadataOptions,
    sourceOrder.length,
    sources,
  ]);

  useEffect(() => {
    if (!draftSnapshot) {
      cancelPendingDraftSave();
      savedDraftSignatureRef.current = null;
      clearCombineDraft();
      return;
    }

    const signature = JSON.stringify(draftSnapshot);
    if (signature === savedDraftSignatureRef.current) {
      return;
    }

    pendingDraftRef.current = draftSnapshot;
    if (draftSaveTimeoutRef.current !== null) {
      window.clearTimeout(draftSaveTimeoutRef.current);
    }
    draftSaveTimeoutRef.current = window.setTimeout(() => {
      const pendingDraft = pendingDraftRef.current;
      if (pendingDraft) {
        saveCombineDraft(pendingDraft);
        savedDraftSignatureRef.current = JSON.stringify(pendingDraft);
      }
      pendingDraftRef.current = null;
      draftSaveTimeoutRef.current = null;
    }, combineDraftSaveDelayMs);
  }, [draftSnapshot]);

  useEffect(() => {
    const flushPendingDraft = () => {
      if (draftSaveTimeoutRef.current !== null) {
        window.clearTimeout(draftSaveTimeoutRef.current);
        draftSaveTimeoutRef.current = null;
      }
      if (pendingDraftRef.current) {
        saveCombineDraft(pendingDraftRef.current);
        pendingDraftRef.current = null;
      }
    };
    window.addEventListener('pagehide', flushPendingDraft);
    return () => {
      window.removeEventListener('pagehide', flushPendingDraft);
      flushPendingDraft();
    };
  }, []);

  const cancelPendingDraftSave = () => {
    if (draftSaveTimeoutRef.current !== null) {
      window.clearTimeout(draftSaveTimeoutRef.current);
      draftSaveTimeoutRef.current = null;
    }
    pendingDraftRef.current = null;
  };

  const applySettings = (settings: AppliedCombineSettings) => {
    setHasImportedSettings(true);
    setOutputColumns(settings.outputColumns);
    setMappings(settings.mappings);
    setOutputFileName(settings.outputFileName);
    setColumnAssignmentMode(settings.columnAssignmentMode);
    setResultSort(settings.resultSort);
    setSourceMetadataOptions(settings.sourceMetadataOptions);
  };

  const clearTemporaryDraft = () => {
    cancelPendingDraftSave();
    savedDraftSignatureRef.current = null;
    clearCombineDraft();
    showInfoToast('Borrador temporal de Combinar archivos eliminado.');
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
  const exportOutputColumns = useMemo(() => [
    ...outputColumns,
    ...buildSourceMetadataColumns(sourceMetadataOptions),
  ], [outputColumns, sourceMetadataOptions]);
  const sortedCombinedRows = useMemo(
    () => sortCombinedRows(combinedRows, resultSort),
    [combinedRows, resultSort],
  );
  const exportCombinedRows = useMemo(
    () => addSourceMetadataToRows(sortedCombinedRows, sourceMetadataOptions),
    [sortedCombinedRows, sourceMetadataOptions],
  );

  useEffect(() => {
    if (resultSort.columnId && !outputColumns.some((column) => column.id === resultSort.columnId)) {
      setResultSort((current) => ({ ...current, columnId: null }));
    }
  }, [outputColumns, resultSort.columnId]);

  const loadFiles = async (files: File[]) => {
    if (isReading || files.length === 0) {
      return;
    }
    const pendingFiles = files.map((file) => ({
      file,
      sourceIndex: nextSourceIndexRef.current++,
    }));
    setIsReading(true);
    setReadingFileCount(files.length);
    await waitForProcessingPaint();

    try {
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
    } finally {
      setIsReading(false);
      setReadingFileCount(0);
    }
  };

  const changeUploadedSourceSheet = async (sourceId: string, nextSheetName: string) => {
    if (changingSourceSheetId) {
      return;
    }
    const loadedSource = loadedUploadedSourcesById.get(sourceId);
    if (loadedSource?.kind !== 'excel') {
      return;
    }
    if (loadedSource.source.sheetName === nextSheetName) {
      setReadErrors((current) => current.filter((error) => error.id !== `sheet:${sourceId}`));
      return;
    }

    setChangingSourceSheetId(sourceId);
    await waitForProcessingPaint();

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
    } finally {
      setChangingSourceSheetId(null);
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
          <MultipleFileUploader
            disabled={isReading}
            statusText={readingFileCount > 1 ? `Procesando ${readingFileCount} archivos...` : 'Procesando archivo...'}
            onFilesSelected={(files) => void loadFiles(files)}
          />

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
              <div className="combineSourceList">
                {sources.map((source) => {
                  const isBasketSource = basketSourceIds.has(source.id);
                  const originLabel = isBasketSource ? 'Desde sanitizador' : 'Manual';
                  const originTooltip = isBasketSource
                    ? 'Resultado enviado desde Sanitizar.'
                    : 'Archivo cargado directamente en Combinar.';
                  const loadedSource = basketSourceIds.has(source.id)
                    ? undefined
                    : loadedUploadedSourcesById.get(source.id);
                  const hasSheetSelector = loadedSource?.kind === 'excel'
                    && loadedSource.sheetNames.length > 1;
                  const isSourceSheetProcessing = changingSourceSheetId === source.id;

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
                            <OverflowTooltipText text={source.fileName} />
                          </strong>
                          <InfoTooltip content={originTooltip} placement="top">
                            <span className={`combineSourceBadge${isBasketSource ? '' : ' isManual'}`}>
                              {originLabel}
                            </span>
                          </InfoTooltip>
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
                            disabled={isSourceSheetProcessing}
                            onChange={(sheetName) => void changeUploadedSourceSheet(source.id, sheetName)}
                          />
                        ) : null}
                        {isSourceSheetProcessing ? (
                          <span className="processingIndicator combineSourceProcessing" role="status" aria-live="polite">
                            <span className="processingSpinner" aria-hidden="true" />
                            Procesando hoja...
                          </span>
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
                          draggable={!isSourceSheetProcessing}
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
        {sources.length > 0 ? (
          <>
            <CombineSettingsActions
              sources={sources}
              outputColumns={outputColumns}
              mappings={mappings}
              outputFileName={outputFileName}
              columnAssignmentMode={columnAssignmentMode}
              resultSort={resultSort}
              sourceMetadataOptions={sourceMetadataOptions}
              onClearDraft={clearTemporaryDraft}
              onIncompatibleSettings={() => {
                cancelPendingDraftSave();
                savedDraftSignatureRef.current = null;
                clearCombineDraft();
              }}
              onApplySettings={applySettings}
            />
            <CombineOutputColumns
              sources={sources}
              outputColumns={outputColumns}
              onChange={setOutputColumns}
              assignmentMode={columnAssignmentMode}
              onAssignmentModeChange={requestAssignmentMode}
            />
          </>
        ) : null}
        {sources.length > 0 && outputColumns.length > 0 ? (
          <>
            <CombineMappingsEditor
              sources={sources}
              outputColumns={outputColumns}
              mappings={mappings}
              assignmentMode={columnAssignmentMode}
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
            <CombinedRowsPreview
              sources={sources}
              outputColumns={outputColumns}
              mappings={mappings}
              rows={sortedCombinedRows}
              resultSort={resultSort}
              onResultSortChange={setResultSort}
            />
            <CombineExportActions
              sources={sources}
              outputColumns={exportOutputColumns}
              mappings={mappings}
              combinedRows={exportCombinedRows}
              outputFileName={outputFileName}
              onOutputFileNameChange={setOutputFileName}
              sourceMetadataOptions={sourceMetadataOptions}
              onSourceMetadataOptionsChange={setSourceMetadataOptions}
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

function combineMappingsEqual(left: CombineColumnMapping[], right: CombineColumnMapping[]) {
  return left.length === right.length && left.every((mapping, index) => (
    mapping.sourceId === right[index]?.sourceId
    && mapping.outputColumnId === right[index]?.outputColumnId
    && mapping.sourceColumnId === right[index]?.sourceColumnId
  ));
}

function waitForProcessingPaint() {
  return new Promise<void>((resolve) => {
    const schedule = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame
      : (callback: FrameRequestCallback) => window.setTimeout(callback, 16);
    schedule(() => resolve());
  });
}

function OverflowTooltipText({ text }: { text: string }) {
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) {
      return;
    }

    const updateOverflow = () => {
      setIsOverflowing(element.scrollWidth > element.clientWidth);
    };

    updateOverflow();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateOverflow);
      return () => window.removeEventListener('resize', updateOverflow);
    }

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);

  const content = <span ref={textRef} className="truncatedText">{text}</span>;

  return isOverflowing ? (
    <InfoTooltip content={text} className="truncatedTextTooltip">
      {content}
    </InfoTooltip>
  ) : content;
}
