import { useState, type ReactNode } from 'react';
import { addProcessedResultToCombineBasket } from './domain/combine/combineBasket';
import { buildCombinedRows } from './domain/combine/buildCombinedRows';
import {
  addProcessedResultToMultiSheetBatch,
  createCombinePayloadFromMultiSheetBatch,
  createEmptyMultiSheetBatch,
  removeSheetFromMultiSheetBatch,
} from './domain/multiSheet/multiSheetBatch';
import { showErrorToast, showSuccessToast } from './services/toastService';
import type { CombineSource } from './types/combine';
import type { ProcessedExportResult } from './types/processedExport';
import { AppearanceToolbar } from './components/AppearanceToolbar/AppearanceToolbar';
import { useAppearanceTheme } from './components/AppearanceToolbar/useAppearanceTheme';
import { CombineWizard } from './components/CombineWizard/CombineWizard';
import { ImportWizard } from './components/ImportWizard/ImportWizard';
import { MultiSheetBatchPanel } from './components/MultiSheetBatchPanel/MultiSheetBatchPanel';
import { ActionButton } from './components/ui/ActionButton/ActionButton';
import { ConfirmDialog } from './components/ui/ConfirmDialog/ConfirmDialog';
import { useBeforeUnloadWarning } from './hooks/useBeforeUnloadWarning';
import { useInternalReloadGuard } from './hooks/useInternalReloadGuard';

type AppTool = 'sanitize' | 'combine';

export default function App() {
  const [selectedTool, setSelectedTool] = useState<AppTool | null>(null);
  const [combineHasLocalState, setCombineHasLocalState] = useState(false);
  const [sanitizerHasState, setSanitizerHasState] = useState(false);
  const [combineBasketSources, setCombineBasketSources] = useState<CombineSource[]>([]);
  const [multiSheetBatch, setMultiSheetBatch] = useState(() => (
    createEmptyMultiSheetBatch('multi-sheet-batch')
  ));
  const [pendingToolChange, setPendingToolChange] = useState<AppTool | null>(null);
  const [isReloadConfirmationOpen, setIsReloadConfirmationOpen] = useState(false);
  const [isBeforeUnloadSuppressed, setIsBeforeUnloadSuppressed] = useState(false);
  const appearance = useAppearanceTheme();
  const hasReloadStateToProtect = combineBasketSources.length > 0
    || combineHasLocalState
    || sanitizerHasState
    || multiSheetBatch.sheets.length > 0;
  useBeforeUnloadWarning(
    hasReloadStateToProtect && !isBeforeUnloadSuppressed,
  );
  useInternalReloadGuard(hasReloadStateToProtect, () => setIsReloadConfirmationOpen(true));
  const saveProcessedResult = (result: ProcessedExportResult) => {
    setCombineBasketSources((current) => addProcessedResultToCombineBasket(current, result));
    showSuccessToast('Resultado guardado para combinar.');
  };
  const saveToMultiSheetBatch = (result: ProcessedExportResult) => {
    const added = addProcessedResultToMultiSheetBatch(multiSheetBatch, result);
    if (!added.ok) {
      showErrorToast(added.errors.join(' '));
      return;
    }

    setMultiSheetBatch(added.batch);
    showSuccessToast('Hoja guardada en el lote multi-hoja.');
  };
  const clearMultiSheetBatch = () => {
    setMultiSheetBatch(createEmptyMultiSheetBatch(multiSheetBatch.id));
  };
  const exportMultiSheetBatch = async () => {
    if (multiSheetBatch.sheets.length === 0) {
      return;
    }

    const payload = createCombinePayloadFromMultiSheetBatch(multiSheetBatch);
    const combinedRows = buildCombinedRows(payload);
    const { exportCombinedXlsx } = await import('./domain/combine/exportCombinedXlsx');
    exportCombinedXlsx({
      outputColumns: payload.outputColumns,
      combinedRows,
      fileName: buildMultiSheetExportFileName(multiSheetBatch.fileName),
    });
  };
  const requestToolChange = () => {
    if (!selectedTool) {
      return;
    }

    const nextTool = selectedTool === 'combine' ? 'sanitize' : 'combine';
    if (selectedTool === 'sanitize' && sanitizerHasState) {
      setPendingToolChange(nextTool);
      return;
    }

    if (selectedTool === 'combine' && combineHasLocalState) {
      setPendingToolChange(nextTool);
      return;
    }

    changeTool(nextTool);
  };
  const changeTool = (nextTool: AppTool) => {
    setCombineHasLocalState(false);
    setSanitizerHasState(false);
    setPendingToolChange(null);
    setSelectedTool(nextTool);
  };
  const toolChangeConfirmation = (
    <ConfirmDialog
      open={pendingToolChange !== null}
      title="Confirmar cambio de herramienta"
      message={selectedTool === 'sanitize'
        ? 'Vas a salir del sanitizador. El archivo cargado y la configuración actual se perderán. Los resultados ya guardados para combinar se conservarán hasta que recargues la página. ¿Querés continuar?'
        : 'Vas a salir de Combinar archivos. Las fuentes subidas manualmente y la configuración local se perderán. Los resultados guardados desde el sanitizador se conservarán hasta que recargues la página. ¿Querés continuar?'}
      confirmLabel="Continuar"
      onCancel={() => setPendingToolChange(null)}
      onConfirm={() => pendingToolChange && changeTool(pendingToolChange)}
    />
  );
  const reloadConfirmation = (
    <ConfirmDialog
      open={isReloadConfirmationOpen}
      title="Confirmar recarga"
      message="Si recargás la página, se perderán el lote multi-hoja y los demás datos temporales sin guardar. ¿Querés continuar?"
      confirmLabel="Recargar página"
      variant="danger"
      onCancel={() => setIsReloadConfirmationOpen(false)}
      onConfirm={() => {
        setIsReloadConfirmationOpen(false);
        setIsBeforeUnloadSuppressed(true);
        window.setTimeout(() => window.location.reload(), 0);
      }}
    />
  );
  const appearanceToolbar = (
    <AppearanceToolbar
      preference={appearance.preference}
      resolvedTheme={appearance.resolvedTheme}
      onPreferenceChange={appearance.setPreference}
      extraActions={selectedTool ? (
        <button type="button" className="appearanceToggleOption appToolSwitchOption" onClick={requestToolChange}>
          {selectedTool === 'combine'
            ? 'Ir a Sanitizar'
            : `Ir a Combinar${combineBasketSources.length > 0 ? ` (${getSavedSourceCountLabel(combineBasketSources.length)})` : ''}`}
        </button>
      ) : null}
    />
  );

  if (selectedTool === 'sanitize') {
    return (
      <>
        <ImportWizard
          appearanceToolbar={appearanceToolbar}
          multiSheetBatchPanel={({
            onSaveCurrentSheet,
            saveCurrentSheetDisabled,
            saveCurrentSheetDisabledReason,
          }) => (
            <MultiSheetBatchPanel
              batch={multiSheetBatch}
              onSaveCurrentSheet={onSaveCurrentSheet}
              saveCurrentSheetDisabled={saveCurrentSheetDisabled}
              saveCurrentSheetDisabledReason={saveCurrentSheetDisabledReason}
              onRemoveSheet={(sheetId) => setMultiSheetBatch((current) => (
                removeSheetFromMultiSheetBatch(current, sheetId)
              ))}
              onClear={clearMultiSheetBatch}
              onExport={() => void exportMultiSheetBatch()}
            />
          )}
          onSaveProcessedResult={saveProcessedResult}
          onSaveToMultiSheetBatch={saveToMultiSheetBatch}
          onStatePresenceChange={setSanitizerHasState}
          externalReloadGuardActive={hasReloadStateToProtect}
          suppressBeforeUnloadWarning={isBeforeUnloadSuppressed}
        />
        {toolChangeConfirmation}
        {reloadConfirmation}
      </>
    );
  }

  if (selectedTool === 'combine') {
    return (
      <>
        <CombineWizard
          appearanceToolbar={appearanceToolbar}
          basketSources={combineBasketSources}
          onRemoveBasketSource={(sourceId) => setCombineBasketSources((current) => (
            current.filter((source) => source.id !== sourceId)
          ))}
          onLocalStatePresenceChange={setCombineHasLocalState}
        />
        {toolChangeConfirmation}
        {reloadConfirmation}
      </>
    );
  }

  return (
    <>
      <ToolSelector
        appearanceToolbar={appearanceToolbar}
        basketSourceCount={combineBasketSources.length}
        onSelectTool={setSelectedTool}
      />
      {reloadConfirmation}
    </>
  );
}

function ToolSelector({
  appearanceToolbar,
  basketSourceCount,
  onSelectTool,
}: {
  appearanceToolbar: ReactNode;
  basketSourceCount: number;
  onSelectTool: (tool: AppTool) => void;
}) {
  return (
    <main className="appShell">
      {appearanceToolbar}
      <header className="hero">
        <div>
          <p className="eyebrow">PANDORA</p>
          <h1>Trabajá tus planillas en un solo lugar</h1>
          <p>Elegí la herramienta que necesitás para empezar.</p>
        </div>
      </header>

      <div className="wizard">
        <section className="panel">
          <h2>Elegir herramienta</h2>
          <div className="actions">
            <ActionButton action="edit" onClick={() => onSelectTool('sanitize')}>
              Sanitizar archivo
            </ActionButton>
            <ActionButton action="duplicate" variant="secondary" onClick={() => onSelectTool('combine')}>
              Combinar archivos{basketSourceCount > 0 ? ` (${getSavedSourceCountLabel(basketSourceCount)})` : ''}
            </ActionButton>
          </div>
        </section>
      </div>
    </main>
  );
}

function getSavedSourceCountLabel(count: number) {
  return `${count} ${count === 1 ? 'guardado' : 'guardados'}`;
}

export function buildMultiSheetExportFileName(sourceFileName?: string) {
  const baseName = sourceFileName?.trim().replace(/(\.xlsx)+$/i, '').trim();
  return baseName ? `${baseName}-multi-hoja` : 'lote-multi-hoja';
}
