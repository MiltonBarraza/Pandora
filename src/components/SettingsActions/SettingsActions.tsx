import { useRef, useState } from 'react';
import { compareSettingsToCurrentSnapshot } from '../../domain/import/settingsCompatibility';
import { createSourceSnapshot, exportSettingsFromWizardState } from '../../domain/import/settingsSnapshot';
import { downloadImportSettingsFile, parseImportSettingsJson } from '../../services/settingsFileService';
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
};

type ImportResult = {
  settings: ExportedImportSettings;
  compatibility: SettingsCompatibilityResult;
};

const statusLabels: Record<SettingsCompatibilityResult['status'], string> = {
  compatible: 'Compatible',
  warning: 'Con advertencias',
  needsRemap: 'Requiere revision',
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
      setError('Primero carga un Excel y selecciona una hoja para exportar settings.');
      return;
    }

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
        return;
      }

      if (!currentSnapshot) {
        setError('Primero carga un Excel y selecciona una hoja para validar estos settings.');
        return;
      }

      setImportResult({
        settings: parsed.settings,
        compatibility: compareSettingsToCurrentSnapshot(parsed.settings, currentSnapshot),
      });
    } catch {
      setError('No se pudo leer el archivo de settings.');
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
      setError('Estos settings necesitan remapeo de columnas antes de aplicarse.');
      return;
    }

    if (compatibility.status === 'blocked') {
      setError('Estos settings no se pueden aplicar a este archivo.');
      return;
    }

    if (compatibility.status === 'warning' && !window.confirm('Estos settings tienen advertencias. ¿Querés aplicarlos igual?')) {
      return;
    }

    const result = onApplySettings(settings, compatibility);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError('');
    setSuccessMessage('Settings aplicados correctamente.');
  };

  return (
    <div className="settingsActions">
      <div className="sectionHeader">
        <p>Guarda o valida una configuracion reutilizable para archivos similares.</p>
        <div className="actions compactActions">
          <button type="button" className="secondary" onClick={exportSettings}>Exportar settings</button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>Importar settings</button>
          {importResult || error ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setImportResult(null);
                setError('');
                setSuccessMessage('');
              }}
            >
              Limpiar
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        className="hiddenFileInput"
        type="file"
        accept="application/json,.json"
        onChange={(event) => void importSettingsFile(event.target.files?.[0])}
      />

      {!canCompareSettings ? (
        <p className="muted">Primero carga un Excel y selecciona una hoja para validar settings importados.</p>
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
        <SummaryItem label="Debiles" value={result.summary.weakMatches} />
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
        <button type="button" onClick={onApply}>Aplicar settings</button>
      </div>
    );
  }

  if (status === 'warning') {
    return (
      <div className="actions">
        <button type="button" onClick={onApply}>Aplicar settings con advertencias</button>
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
