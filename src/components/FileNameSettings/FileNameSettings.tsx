import { buildAuditFileBaseName, buildOutputFileBaseName } from '../../domain/import/downloadNames';
import type { FileNameSettings as FileNameSettingsType } from '../../types/import';

type FileNameSettingsProps = {
  settings: FileNameSettingsType;
  sourceFileName: string;
  sheetName: string;
  onChange: (settings: FileNameSettingsType) => void;
};

export function FileNameSettings({ settings, sourceFileName, sheetName, onChange }: FileNameSettingsProps) {
  const outputName = buildOutputFileBaseName({ settings, sourceFileName, sheetName });
  const auditName = buildAuditFileBaseName(outputName);

  const update = (patch: Partial<FileNameSettingsType>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <div className="manager">
      <div className="segmentedControl">
        <label>
          <input
            type="radio"
            name="file-name-mode"
            checked={settings.mode === 'default'}
            onChange={() => update({ mode: 'default' })}
          />
          Nombre predeterminado
        </label>
        <label>
          <input
            type="radio"
            name="file-name-mode"
            checked={settings.mode === 'custom'}
            onChange={() => update({ mode: 'custom' })}
          />
          Nombre personalizado
        </label>
      </div>

      {settings.mode === 'custom' ? (
        <label className="field">
          <span>Nombre base</span>
          <input
            value={settings.customName}
            onChange={(event) => update({ customName: event.target.value })}
            placeholder="Lista limpia ECM Enero"
          />
        </label>
      ) : (
        <>
          <label className="field">
            <span>Texto base</span>
            <input value={settings.baseText} onChange={(event) => update({ baseText: event.target.value })} />
          </label>
          <div className="presetBar">
            <label className="checkboxField">
              <input
                type="checkbox"
                checked={settings.includeBaseText}
                onChange={(event) => update({ includeBaseText: event.target.checked })}
              />
              Incluir texto base
            </label>
            <label className="checkboxField">
              <input
                type="checkbox"
                checked={settings.includeOriginalName}
                onChange={(event) => update({ includeOriginalName: event.target.checked })}
              />
              Incluir nombre original
            </label>
            <label className="checkboxField">
              <input
                type="checkbox"
                checked={settings.includeSheetName}
                onChange={(event) => update({ includeSheetName: event.target.checked })}
              />
              Incluir hoja seleccionada
            </label>
            <label className="checkboxField">
              <input
                type="checkbox"
                checked={settings.includeDate}
                onChange={(event) => update({
                  includeDate: event.target.checked,
                  ...(!event.target.checked ? { includeTime: false } : {}),
                })}
              />
              Incluir fecha actual
            </label>
            <label className="checkboxField">
              <input
                type="checkbox"
                checked={settings.includeDate && Boolean(settings.includeTime)}
                disabled={!settings.includeDate}
                onChange={(event) => update({ includeTime: event.target.checked })}
              />
              Incluir hora actual
            </label>
          </div>
        </>
      )}

      <div className="filenamePreview">
        <strong>Nombre final</strong>
        <span>{outputName}</span>
        <small>Formatos disponibles: .xlsx y .csv</small>
        <small>Auditoría: {auditName}.xlsx</small>
      </div>
    </div>
  );
}
