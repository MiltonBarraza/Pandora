import type { SourceMetadataOptions } from '../../types/combine';

type CombineSourceMetadataProps = {
  options: SourceMetadataOptions;
  onChange: (options: SourceMetadataOptions) => void;
};

export function CombineSourceMetadata({ options, onChange }: CombineSourceMetadataProps) {
  return (
    <section className="panel combineFlowPanel combineSourceMetadataPanel">
      <h2>5. Datos de origen</h2>
      <p className="muted">
        Agregá columnas para identificar de qué archivo u hoja proviene cada fila combinada.
      </p>
      <div className="presetBar combineSourceMetadataOptions">
        <label className="checkboxField">
          <input
            type="checkbox"
            checked={options.includeFileName}
            onChange={(event) => onChange({ ...options, includeFileName: event.target.checked })}
          />
          Incluir Archivo origen
        </label>
        <label className="checkboxField">
          <input
            type="checkbox"
            checked={options.includeSheetName}
            onChange={(event) => onChange({ ...options, includeSheetName: event.target.checked })}
          />
          Incluir Hoja origen
        </label>
      </div>
    </section>
  );
}
