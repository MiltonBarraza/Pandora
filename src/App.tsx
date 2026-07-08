import { lazy, Suspense, useState, type ReactNode } from 'react';
import { addProcessedResultToCombineBasket } from './domain/combine/combineBasket';
import { showSuccessToast } from './services/toastService';
import type { CombineSource } from './types/combine';
import type { ProcessedExportResult } from './types/processedExport';
import { AppearanceToolbar } from './components/AppearanceToolbar/AppearanceToolbar';
import { useAppearanceTheme } from './components/AppearanceToolbar/useAppearanceTheme';
import { AppIcon } from './components/ui/AppIcon/AppIcon';
import { ConfirmDialog } from './components/ui/ConfirmDialog/ConfirmDialog';
import { useBeforeUnloadWarning } from './hooks/useBeforeUnloadWarning';
import { useInternalReloadGuard } from './hooks/useInternalReloadGuard';

type AppTool = 'sanitize' | 'combine';

const ImportWizard = lazy(() => import('./components/ImportWizard/ImportWizard').then((module) => ({
  default: module.ImportWizard,
})));
const CombineWizard = lazy(() => import('./components/CombineWizard/CombineWizard').then((module) => ({
  default: module.CombineWizard,
})));

export default function App() {
  const [selectedTool, setSelectedTool] = useState<AppTool | null>(null);
  const [combineHasLocalState, setCombineHasLocalState] = useState(false);
  const [sanitizerHasState, setSanitizerHasState] = useState(false);
  const [combineBasketSources, setCombineBasketSources] = useState<CombineSource[]>([]);
  const [pendingToolChange, setPendingToolChange] = useState<AppTool | null>(null);
  const [isReloadConfirmationOpen, setIsReloadConfirmationOpen] = useState(false);
  const [isBeforeUnloadSuppressed, setIsBeforeUnloadSuppressed] = useState(false);
  const appearance = useAppearanceTheme();
  const hasReloadStateToProtect = combineBasketSources.length > 0
    || combineHasLocalState
    || sanitizerHasState;
  useBeforeUnloadWarning(
    hasReloadStateToProtect && !isBeforeUnloadSuppressed,
  );
  useInternalReloadGuard(hasReloadStateToProtect, () => setIsReloadConfirmationOpen(true));
  const saveProcessedResult = (result: ProcessedExportResult) => {
    setCombineBasketSources((current) => addProcessedResultToCombineBasket(current, result));
    showSuccessToast('Resultado guardado para combinar.');
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
        ? 'Vas a salir de Preparar archivo. El archivo cargado y la configuración actual se perderán. Los resultados ya guardados para combinar se conservarán hasta que recargues la página. ¿Querés continuar?'
        : 'Vas a salir de Combinar archivos. Los archivos subidos manualmente y la configuración local se perderán. Los resultados guardados desde Preparar archivo se conservarán hasta que recargues la página. ¿Querés continuar?'}
      confirmLabel="Continuar"
      onCancel={() => setPendingToolChange(null)}
      onConfirm={() => pendingToolChange && changeTool(pendingToolChange)}
    />
  );
  const reloadConfirmation = (
    <ConfirmDialog
      open={isReloadConfirmationOpen}
      title="Confirmar recarga"
      message="Si recargás la página, se perderán los datos temporales sin guardar. ¿Querés continuar?"
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
            ? 'Ir a Preparar archivo'
            : `Ir a Combinar${combineBasketSources.length > 0 ? ` (${getSavedSourceCountLabel(combineBasketSources.length)})` : ''}`}
        </button>
      ) : null}
    />
  );

  if (selectedTool === 'sanitize') {
    return (
      <>
        <Suspense fallback={<ToolLoadingFallback appearanceToolbar={appearanceToolbar} tool={selectedTool} />}>
          <ImportWizard
            appearanceToolbar={appearanceToolbar}
            onSaveProcessedResult={saveProcessedResult}
            onStatePresenceChange={setSanitizerHasState}
            externalReloadGuardActive={hasReloadStateToProtect}
            suppressBeforeUnloadWarning={isBeforeUnloadSuppressed}
          />
        </Suspense>
        {toolChangeConfirmation}
        {reloadConfirmation}
      </>
    );
  }

  if (selectedTool === 'combine') {
    return (
      <>
        <Suspense fallback={<ToolLoadingFallback appearanceToolbar={appearanceToolbar} tool={selectedTool} />}>
          <CombineWizard
            appearanceToolbar={appearanceToolbar}
            basketSources={combineBasketSources}
            onRemoveBasketSource={(sourceId) => setCombineBasketSources((current) => (
              current.filter((source) => source.id !== sourceId)
            ))}
            onLocalStatePresenceChange={setCombineHasLocalState}
          />
        </Suspense>
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

export function ToolLoadingFallback({
  appearanceToolbar,
  tool = 'sanitize',
}: {
  appearanceToolbar: ReactNode;
  tool?: AppTool;
}) {
  const hero = getToolHeroContent(tool);

  return (
    <main className={`appShell${tool === 'combine' ? ' combineWizard' : ''}`}>
      {appearanceToolbar}
      <header className={`hero${tool === 'combine' ? ' combineHero' : ''}`}>
        <div>
          <p className="eyebrow">PANDORA</p>
          <h1>{hero.title}</h1>
          <p>{hero.description}</p>
        </div>
      </header>

      <div className="wizard toolLoadingWizard">
        <section className="panel toolLoadingPanel">
          <span className="processingSpinner" aria-hidden="true" />
          <p role="status">Cargando herramienta…</p>
        </section>
      </div>
    </main>
  );
}

function getToolHeroContent(tool: AppTool) {
  if (tool === 'combine') {
    return {
      title: 'Combiná varios archivos en una sola planilla',
      description: 'Cargá tus archivos, organizá las columnas y generá un único Excel.',
    };
  }

  return {
    title: 'Limpia, transforma y guarda tus planillas',
    description: 'Cargá un Excel, configurá columnas, aplicá transformaciones y descargá un archivo limpio sin tocar fórmulas ni código.',
  };
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
    <main className="appShell toolSelectorPage">
      {appearanceToolbar}
      <header className="hero">
        <div>
          <p className="eyebrow">PANDORA</p>
          <h1>Trabajá tus planillas en un solo lugar</h1>
          <p>Elegí la herramienta que necesitás para empezar.</p>
        </div>
      </header>

      <div className="wizard">
        <section className="panel toolSelectorPanel">
          <h2>¿Qué querés hacer?</h2>
          <div className="toolChoiceGrid">
            <button
              type="button"
              className="toolChoiceCard"
              aria-label="Preparar archivo"
              onClick={() => onSelectTool('sanitize')}
            >
              <span className="toolChoiceIcon" aria-hidden="true"><AppIcon name="edit" size={26} /></span>
              <span className="toolChoiceCopy">
                <strong>Preparar archivo</strong>
                <span>Limpiá una planilla, configurá columnas, aplicá transformaciones y descargá un archivo final.</span>
              </span>
            </button>
            <button
              type="button"
              className="toolChoiceCard"
              aria-label="Combinar archivos"
              onClick={() => onSelectTool('combine')}
            >
              <span className="toolChoiceIcon" aria-hidden="true"><AppIcon name="duplicate" size={26} /></span>
              <span className="toolChoiceCopy">
                <strong>Combinar archivos{basketSourceCount > 0 ? ` (${getSavedSourceCountLabel(basketSourceCount)})` : ''}</strong>
                <span>Uní archivos o resultados preparados en una única hoja de salida.</span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function getSavedSourceCountLabel(count: number) {
  return `${count} ${count === 1 ? 'guardado' : 'guardados'}`;
}
