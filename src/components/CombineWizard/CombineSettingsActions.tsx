import { useRef, useState } from 'react';
import {
  applyCombineSettingsSnapshot,
  createCombineSettingsSnapshot,
  parseCombineSettingsSnapshotJson,
  type AppliedCombineSettings,
  type CombineSettingsSnapshot,
} from '../../domain/combine/combineSettings';
import type { CombineColumnMapping, CombineOutputColumn, CombineSource } from '../../types/combine';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';

type CombineSettingsActionsProps = {
  sources: CombineSource[];
  outputColumns: CombineOutputColumn[];
  mappings: CombineColumnMapping[];
  outputFileName: string;
  onApplySettings: (settings: AppliedCombineSettings) => void;
};

export function CombineSettingsActions({
  sources,
  outputColumns,
  mappings,
  outputFileName,
  onApplySettings,
}: CombineSettingsActionsProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pendingSnapshot, setPendingSnapshot] = useState<CombineSettingsSnapshot | null>(null);
  const [importError, setImportError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  const exportSettings = () => {
    const snapshot = createCombineSettingsSnapshot({ sources, outputColumns, mappings, outputFileName });
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'configuracion-combine.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const applySnapshot = (snapshot: CombineSettingsSnapshot) => {
    const result = applyCombineSettingsSnapshot({ snapshot, sources });
    onApplySettings(result);
    setWarnings(result.warnings);
    setImportError('');
    setPendingSnapshot(null);
  };

  const importSettings = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImportError('No se pudo leer el archivo de configuración.');
      setWarnings([]);
      return;
    }
    const parsed = parseCombineSettingsSnapshotJson(text);
    if (!parsed.ok) {
      setImportError(parsed.error);
      setWarnings([]);
      return;
    }

    setImportError('');
    if (outputColumns.length > 0 || mappings.length > 0) {
      setPendingSnapshot(parsed.snapshot);
      return;
    }
    applySnapshot(parsed.snapshot);
  };

  return (
    <section className="panel">
      <ConfirmDialog
        open={Boolean(pendingSnapshot)}
        title="Importar configuración"
        message="Se reemplazarán las columnas de salida y los mapeos actuales."
        cancelLabel="Cancelar"
        confirmLabel="Importar configuración"
        onCancel={() => setPendingSnapshot(null)}
        onConfirm={() => pendingSnapshot && applySnapshot(pendingSnapshot)}
      />
      <h2>Configuración</h2>
      <p className="muted combineSettingsDescription">
        Guardá o restaurá columnas, mapeos y nombre de salida. Los datos de archivos no se incluyen.
      </p>
      <input
        ref={inputRef}
        className="combineSettingsFileInput"
        type="file"
        accept="application/json,.json"
        tabIndex={-1}
        onChange={(event) => {
          void importSettings(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <div className="actions">
        <ActionButton action="export" onClick={exportSettings}>Exportar configuración</ActionButton>
        <ActionButton action="import" variant="secondary" onClick={() => inputRef.current?.click()}>
          Importar configuración
        </ActionButton>
      </div>
      {importError ? <p className="errorText combineSettingsMessage">{importError}</p> : null}
      {warnings.map((warning) => (
        <p key={warning} className="combineColumnWarning combineSettingsMessage">{warning}</p>
      ))}
    </section>
  );
}
