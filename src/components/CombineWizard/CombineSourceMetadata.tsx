import type { SourceMetadataOptions } from '../../types/combine';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

type CombineSourceMetadataProps = {
  options: SourceMetadataOptions;
  onChange: (options: SourceMetadataOptions) => void;
};

export function CombineSourceMetadata({ options, onChange }: CombineSourceMetadataProps) {
  return (
    <div className="combineSourceMetadataPanel">
      <h3 className="headingWithInfo combineSourceMetadataHeader">
        <span>Datos de origen</span>
        <InfoTooltip
          content="Agregá columnas para identificar de qué archivo u hoja proviene cada fila combinada."
          placement="top"
          ariaLabel="Información sobre datos de origen"
        />
      </h3>
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
    </div>
  );
}
