import { useRef, useState, type ReactNode } from 'react';
import { readCombineSource } from '../../domain/combine/readCombineSource';
import type { CombineOutputColumn, CombineSource } from '../../types/combine';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { CombineOutputColumns } from './CombineOutputColumns';
import { MultipleFileUploader } from './MultipleFileUploader';

type CombineWizardProps = {
  appearanceToolbar?: ReactNode;
};

export function CombineWizard({ appearanceToolbar }: CombineWizardProps) {
  const [sources, setSources] = useState<CombineSource[]>([]);
  const [outputColumns, setOutputColumns] = useState<CombineOutputColumn[]>([]);
  const [readErrors, setReadErrors] = useState<CombineReadError[]>([]);
  const [isReading, setIsReading] = useState(false);
  const nextSourceIndexRef = useRef(0);

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

    setSources((current) => [
      ...current,
      ...results.flatMap((result) => result.source ? [result.source] : []),
    ]);
    setReadErrors((current) => [
      ...current,
      ...results.flatMap((result) => result.error ? [result.error] : []),
    ]);
    setIsReading(false);
  };

  return (
    <main className="appShell">
      {appearanceToolbar}
      <header className="hero">
        <div>
          <p className="eyebrow">PANDORA</p>
          <h1>Combiná varios archivos en una sola planilla</h1>
          <p>Cargá tus archivos, organizá las columnas y generá un único Excel.</p>
        </div>
      </header>

      <div className="wizard">
        <section className="panel">
          <h2>Combinar archivos</h2>
          <p className="muted">Cargá los archivos que querés reunir. Por ahora se usa la primera hoja de cada Excel.</p>
          <MultipleFileUploader disabled={isReading} onFilesSelected={(files) => void loadFiles(files)} />

          {readErrors.length > 0 ? (
            <div className="combineReadErrors" aria-live="polite">
              {readErrors.map((error) => (
                <p key={error.id} className="errorText">
                  <strong>{error.fileName}:</strong> {error.message}
                </p>
              ))}
            </div>
          ) : null}

          <div className="combineSourcesHeader">
            <h3>Fuentes cargadas</h3>
            <span className="muted">{sources.length} {sources.length === 1 ? 'archivo' : 'archivos'}</span>
          </div>
          {sources.length === 0 ? (
            <div className="emptyState combineSourcesEmpty">Todavía no hay archivos cargados.</div>
          ) : (
            <div className="combineSourceList">
              {sources.map((source) => (
                <article key={source.id} className="combineSourceItem">
                  <div>
                    <strong>{source.fileName}</strong>
                    <p className="muted combineSourceMeta">
                      {source.sheetName ? `Hoja: ${source.sheetName} · ` : ''}
                      {source.columns.length} {source.columns.length === 1 ? 'columna' : 'columnas'} ·{' '}
                      {source.rows.length} {source.rows.length === 1 ? 'fila' : 'filas'} de datos
                    </p>
                  </div>
                  <DeleteButton
                    title={`Remover ${source.fileName}`}
                    onClick={() => setSources((current) => current.filter((item) => item.id !== source.id))}
                  />
                </article>
              ))}
            </div>
          )}
        </section>
        <CombineOutputColumns
          sources={sources}
          outputColumns={outputColumns}
          onChange={setOutputColumns}
        />
      </div>
    </main>
  );
}

type CombineReadError = {
  id: string;
  fileName: string;
  message: string;
};
