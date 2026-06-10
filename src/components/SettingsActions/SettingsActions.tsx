import { useRef, useState } from 'react';
import { compareSettingsToCurrentSnapshot } from '../../domain/import/settingsCompatibility';
import { createSourceSnapshot, exportSettingsFromWizardState } from '../../domain/import/settingsSnapshot';
import { downloadImportSettingsFile, parseImportSettingsJson } from '../../services/settingsFileService';
import { showErrorToast, showInfoToast, showSuccessToast } from '../../services/toastService';
import type {
  ColumnAnalysis,
  ExportedImportSettings,
  FileNameSettings,
  IgnoreRule,
  OutputColumn,
  RawRow,
  SettingsCompatibilityResult,
  SourceSnapshot,
} from '../../types/import';
import { ActionButton, ButtonGroup } from '../ui/ActionButton/ActionButton';

type SettingsActionsProps = {
  fileType: 'spreadsheet' | 'csv' | '';
  selectedSheet: string;
  sheetNames: string[];
  rows: RawRow[];
  headerRowIndex: number | null;
  startRowIndex: number;
  showRawPreviewFromDataStart: boolean;
  showAllRawPreviewColumns: boolean;
  columnAnalysis: ColumnAnalysis[];
  inputColumnAliases: Record<string, string>;
  inputIgnoreRules: IgnoreRule[];
  outputColumns: OutputColumn[];
  outputIgnoreRules: IgnoreRule[];
  fileNameSettings: FileNameSettings;
  onApplySettings: (settings: ExportedImportSettings, compatibility: SettingsCompatibilityResult) => { ok: true } | { ok: false; error: string };
  onSettingsImported?: () => void;
};

type ImportResult = {
  settings: ExportedImportSettings;
  compatibility: SettingsCompatibilityResult;
};

const statusLabels: Record<SettingsCompatibilityResult['status'], string> = {
  compatible: 'Compatible',
  warning: 'Con advertencias',
  needsRemap: 'Requiere revisión',
  blocked: 'Bloqueado',
};

export function SettingsActions({
  fileType,
  selectedSheet,
  sheetNames,
  rows,
  headerRowIndex,
  startRowIndex,
  showRawPreviewFromDataStart,
  showAllRawPreviewColumns,
  columnAnalysis,
  inputColumnAliases,
  inputIgnoreRules,
  outputColumns,
  outputIgnoreRules,
  fileNameSettings,
  onApplySettings,
  onSettingsImported,
}: SettingsActionsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const currentSnapshot = buildCurrentSnapshot({
    fileType,
    selectedSheet,
    sheetNames,
    rows,
    headerRowIndex,
    startRowIndex,
    columnAnalysis,
  });
  const canCompareSettings = Boolean(currentSnapshot);

  const exportSettings = () => {
    setError('');
    setSuccessMessage('');

    if (!currentSnapshot || fileType === '') {
      const message = 'Primero carga un Excel y selecciona una hoja para guardar configuraciones.';
      setError(message);
      showErrorToast(message);
      return;
    }

    try {
      downloadImportSettingsFile(exportSettingsFromWizardState({
        name: selectedSheet || undefined,
        fileType,
        selectedSheet,
        sheetNames,
        rows,
        headerRowIndex,
        startRowIndex,
        showRawPreviewFromDataStart,
        showAllRawPreviewColumns,
        columnAnalysis,
        inputColumnAliases,
        inputIgnoreRules,
        outputColumns,
        outputIgnoreRules,
        fileNameSettings,
      }));
      showSuccessToast('Configuración guardada correctamente.');
    } catch {
      const message = 'No se pudo guardar la configuración.';
      setError(message);
      showErrorToast(message);
    }
  };

  const importSettingsFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setError('');
    setSuccessMessage('');
    setImportResult(null);

    try {
      const text = await file.text();
      const parsed = parseImportSettingsJson(text);
      if (!parsed.ok) {
        setError(parsed.error);
        showErrorToast('No se pudo cargar el archivo de configuración.');
        return;
      }

      if (!currentSnapshot) {
        const message = 'Primero carga un Excel y selecciona una hoja para validar esta configuración.';
        setError(message);
        showErrorToast(message);
        return;
      }

      const compatibility = compareSettingsToCurrentSnapshot(parsed.settings, currentSnapshot);
      setImportResult({
        settings: parsed.settings,
        compatibility,
      });
      onSettingsImported?.();
      showImportedSettingsToast(compatibility.status);
    } catch {
      const message = 'No se pudo leer el archivo de settings.';
      setError(message);
      showErrorToast(message);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const applyImportedSettings = () => {
    if (!importResult) {
      return;
    }

    const { compatibility, settings } = importResult;
    if (compatibility.status === 'needsRemap') {
      const message = 'Estos settings necesitan remapeo de columnas antes de aplicarse.';
      setError(message);
      showInfoToast(message);
      return;
    }

    if (compatibility.status === 'blocked') {
      const message = 'La configuración no es compatible con este archivo.';
      setError(message);
      showErrorToast(message);
      return;
    }

    if (compatibility.status === 'warning' && !window.confirm('Estos settings tienen advertencias. ¿Querés aplicarlos igual?')) {
      return;
    }

    const result = onApplySettings(settings, compatibility);
    if (!result.ok) {
      setError(result.error);
      showErrorToast(result.error);
      return;
    }

    setError('');
    setSuccessMessage('Settings aplicados correctamente.');
    showSuccessToast(compatibility.status === 'warning' ? 'Configuración aplicada con advertencias.' : 'Configuración aplicada.');
  };

  return (
    <div className="settingsActions">
      <div className="sectionHeader">
        <div className="settingsActionsIntro">
          <h3>Guardar o cargar configuración</h3>
          <p>Ahorra tiempo guardando o cargando una configuración para usarla nuevamente en archivos similares.</p>
        </div>
        <ButtonGroup className="actions compactActions">
          <ActionButton action="export" variant="secondary" onClick={exportSettings}>Guardar</ActionButton>
          <ActionButton action="import" onClick={() => fileInputRef.current?.click()}>Cargar</ActionButton>
          {importResult || error ? (
            <ActionButton
              action="clear"
              variant="secondary"
              onClick={() => {
                setImportResult(null);
                setError('');
                setSuccessMessage('');
              }}
            >
              Limpiar
            </ActionButton>
          ) : null}
        </ButtonGroup>
      </div>

      <input
        ref={fileInputRef}
        className="hiddenFileInput"
        type="file"
        accept="application/json,.json"
        onChange={(event) => void importSettingsFile(event.target.files?.[0])}
      />

      {!canCompareSettings ? (
        <p className="muted">Primero carga un Excel y selecciona una hoja para validar configuraciones importadas.</p>
      ) : null}
      {error ? <p className="errorText">{error}</p> : null}
      {successMessage ? <p className="successText">{successMessage}</p> : null}
      {importResult ? (
        <>
          <SettingsCompatibilitySummary result={importResult.compatibility} />
          <SettingsApplyActions status={importResult.compatibility.status} onApply={applyImportedSettings} />
        </>
      ) : null}
    </div>
  );
}
function showImportedSettingsToast(status: SettingsCompatibilityResult['status']) {
  if (status === 'compatible') {
    showSuccessToast('Settings importados correctamente.');
    return;
  }

  if (status === 'warning') {
    showInfoToast('Settings importados con advertencias.');
    return;
  }

  if (status === 'needsRemap') {
    showInfoToast('Settings importados. Se requiere revisar el mapeo de columnas.');
    return;
  }

  showErrorToast('La configuración no es compatible con este archivo.');
}

function SettingsCompatibilitySummary({ result }: { result: SettingsCompatibilityResult }) {
  return (
    <div className={`settingsCompatibilitySummary ${result.status}`}>
      <div className="settingsCompatibilityHeader">
        <strong>{statusLabels[result.status]}</strong>
        <span>Hoja esperada: {result.sheet.expectedSheet || '-'}</span>
        <span>Hoja actual: {result.sheet.currentSheet || '-'}</span>
      </div>

      <div className="settingsCompatibilityGrid">
        <SummaryItem label="Exactas" value={result.summary.exactMatches} />
        <SummaryItem label="Fuertes" value={result.summary.strongMatches} />
        <SummaryItem label="Medias" value={result.summary.mediumMatches} />
        <SummaryItem label="Débiles" value={result.summary.weakMatches} />
        <SummaryItem label="Faltantes usadas" value={result.summary.usedMissingColumns} />
        <SummaryItem label="Faltantes no usadas" value={result.summary.unusedMissingColumns} />
        <SummaryItem label="Nuevas" value={result.summary.addedColumns} />
      </div>

      {result.messages.length > 0 ? (
        <ul className="settingsCompatibilityMessages">
          {result.messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">No se detectaron diferencias relevantes.</p>
      )}
    </div>
  );
}

function SettingsApplyActions({ status, onApply }: { status: SettingsCompatibilityResult['status']; onApply: () => void }) {
  if (status === 'compatible') {
    return (
      <div className="actions">
        <ActionButton action="done" onClick={onApply}>Aplicar settings</ActionButton>
      </div>
    );
  }

  if (status === 'warning') {
    return (
      <div className="actions">
        <ActionButton action="warning" onClick={onApply}>Aplicar settings con advertencias</ActionButton>
      </div>
    );
  }

  if (status === 'needsRemap') {
    return <p className="muted">Estos settings necesitan remapeo de columnas antes de aplicarse.</p>;
  }

  return <p className="muted">Estos settings no se pueden aplicar a este archivo.</p>;
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildCurrentSnapshot({
  fileType,
  selectedSheet,
  sheetNames,
  rows,
  headerRowIndex,
  startRowIndex,
  columnAnalysis,
}: Pick<SettingsActionsProps, 'fileType' | 'selectedSheet' | 'sheetNames' | 'rows' | 'headerRowIndex' | 'startRowIndex' | 'columnAnalysis'>): SourceSnapshot | null {
  if (fileType === '') {
    return null;
  }

  if (fileType === 'spreadsheet' && !selectedSheet) {
    return null;
  }

  if (columnAnalysis.length === 0) {
    return null;
  }

  return createSourceSnapshot({
    fileType,
    sheetName: selectedSheet || undefined,
    sheetNames,
    rows,
    headerRowIndex,
    startRowIndex,
    columnAnalysis,
  });
}
