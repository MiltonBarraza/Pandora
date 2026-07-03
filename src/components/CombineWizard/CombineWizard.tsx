import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildCombinedRows } from '../../domain/combine/buildCombinedRows';
import { mergeCombineSources, removeCombineSourceFromCollections } from '../../domain/combine/combineBasket';
import { reapplyCombineMappings } from '../../domain/combine/combineColumnMappings';
import type { AppliedCombineSettings } from '../../domain/combine/combineSettings';
import { readCombineSource } from '../../domain/combine/readCombineSource';
import { reconcileCombineMappings } from '../../domain/combine/reconcileCombineMappings';
import type { CombineColumnMapping, CombineOutputColumn, CombineSource } from '../../types/combine';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { CombinedRowsPreview } from './CombinedRowsPreview';
import { CombineExportActions } from './CombineExportActions';
import { CombineMappingsEditor } from './CombineMappingsEditor';
import { CombineOutputColumns } from './CombineOutputColumns';
import { CombineSettingsActions } from './CombineSettingsActions';
import { MultipleFileUploader } from './MultipleFileUploader';

type CombineWizardProps = {
  appearanceToolbar?: ReactNode;
  basketSources?: CombineSource[];
  onRemoveBasketSource?: (sourceId: string) => void;
  onLocalStatePresenceChange?: (hasState: boolean) => void;
};

export function CombineWizard({
  appearanceToolbar,
  basketSources = [],
  onRemoveBasketSource,
  onLocalStatePresenceChange,
}: CombineWizardProps) {
  const [uploadedSources, setUploadedSources] = useState<CombineSource[]>([]);
  const [outputColumns, setOutputColumns] = useState<CombineOutputColumn[]>([]);
  const [mappings, setMappings] = useState<CombineColumnMapping[]>([]);
  const [outputFileName, setOutputFileName] = useState('Archivo combinado');
  const [readErrors, setReadErrors] = useState<CombineReadError[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [hasImportedSettings, setHasImportedSettings] = useState(false);
  const nextSourceIndexRef = useRef(0);
  const sources = useMemo(
    () => mergeCombineSources(basketSources, uploadedSources),
    [basketSources, uploadedSources],
  );
  const basketSourceIds = useMemo(
    () => new Set(basketSources.map((source) => source.id)),
    [basketSources],
  );

  useEffect(() => {
    setMappings((current) => reconcileCombineMappings({
      sources,
      outputColumns,
      previousMappings: current,
    }));
  }, [sources, outputColumns]);

  useEffect(() => {
    onLocalStatePresenceChange?.(
      uploadedSources.length > 0
        || outputColumns.length > 0
        || mappings.length > 0
        || outputFileName !== 'Archivo combinado'
        || hasImportedSettings,
    );
  }, [
    uploadedSources.length,
    outputColumns.length,
    mappings.length,
    outputFileName,
    hasImportedSettings,
    onLocalStatePresenceChange,
  ]);

  const applySettings = (settings: AppliedCombineSettings) => {
    setHasImportedSettings(true);
    setOutputColumns(settings.outputColumns);
    setMappings(settings.mappings);
    setOutputFileName(settings.outputFileName);
  };

  const combinedRows = useMemo(() => buildCombinedRows({
    sources,
    outputColumns,
    mappings,
  }), [sources, outputColumns, mappings]);

  const loadFiles = async (files: File[]) => {
    const pendingFiles = files.map((file) => ({
      file,
      sourceIndex: nextSourceIndexRef.current++,
    }));
    setIsReading(true);

    const results = await Promise.all(pendingFiles.map(async ({ file, sourceIndex }) => {
      try {
        return { source: await readCombineSource(file, sourceIndex) };
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

    setUploadedSources((current) => [
      ...current,
      ...results.flatMap((result) => result.source ? [result.source] : []),
    ]);
    setReadErrors((current) => [
      ...current,
      ...results.flatMap((result) => result.error ? [result.error] : []),
    ]);
    setIsReading(false);
  };

  const removeSource = (sourceId: string) => {
    const result = removeCombineSourceFromCollections({
      sourceId,
      basketSources,
      uploadedSources,
    });
    setUploadedSources(result.uploadedSources);
    if (result.removedBasketSourceId) {
      onRemoveBasketSource?.(result.removedBasketSourceId);
    }
  };

  return (
    <main className="appShell combineWizard">
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
              content="Cargá archivos o usá resultados guardados desde el sanitizador. Excel: se usa la primera hoja. Encabezado: se toma la primera fila no vacía. CSV: se interpreta como tabla única."
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
              <div className="combineSourceList">
                {sources.map((source) => (
                  <article key={source.id} className="combineSourceItem">
                    <div>
                      <strong>{source.fileName}</strong>
                      <span className={`combineSourceBadge${basketSourceIds.has(source.id) ? '' : ' isManual'}`}>
                        {basketSourceIds.has(source.id) ? 'Desde sanitizador' : 'Manual'}
                      </span>
                      <p className="muted combineSourceMeta">
                        {source.sheetName ? `Hoja usada: ${source.sheetName} · ` : ''}
                        {source.columns.length} {source.columns.length === 1 ? 'columna' : 'columnas'} ·{' '}
                        {source.rows.length} {source.rows.length === 1 ? 'fila' : 'filas'} de datos
                      </p>
                    </div>
                    <DeleteButton
                      title={`Remover ${source.fileName}`}
                      onClick={() => removeSource(source.id)}
                    />
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </section>
        <CombineSettingsActions
          sources={sources}
          outputColumns={outputColumns}
          mappings={mappings}
          outputFileName={outputFileName}
          onApplySettings={applySettings}
        />
        <CombineOutputColumns
          sources={sources}
          outputColumns={outputColumns}
          onChange={setOutputColumns}
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
              onReapplyMappings={() => setMappings(reapplyCombineMappings(sources, outputColumns))}
            />
            <CombinedRowsPreview
              sources={sources}
              outputColumns={outputColumns}
              mappings={mappings}
              rows={combinedRows}
            />
            <CombineExportActions
              sources={sources}
              outputColumns={outputColumns}
              mappings={mappings}
              combinedRows={combinedRows}
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
