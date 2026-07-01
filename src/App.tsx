import { useState, type ReactNode } from 'react';
import { addProcessedResultToCombineBasket } from './domain/combine/combineBasket';
import { showSuccessToast } from './services/toastService';
import type { CombineSource } from './types/combine';
import type { ProcessedExportResult } from './types/processedExport';
import { AppearanceToolbar } from './components/AppearanceToolbar/AppearanceToolbar';
import { useAppearanceTheme } from './components/AppearanceToolbar/useAppearanceTheme';
import { CombineWizard } from './components/CombineWizard/CombineWizard';
import { ImportWizard } from './components/ImportWizard/ImportWizard';
import { ActionButton } from './components/ui/ActionButton/ActionButton';

type AppTool = 'sanitize' | 'combine';

export default function App() {
  const [selectedTool, setSelectedTool] = useState<AppTool | null>(null);
  const [combineHasLocalState, setCombineHasLocalState] = useState(false);
  const [combineBasketSources, setCombineBasketSources] = useState<CombineSource[]>([]);
  const appearance = useAppearanceTheme();
  const saveProcessedResult = (result: ProcessedExportResult) => {
    setCombineBasketSources((current) => addProcessedResultToCombineBasket(current, result));
    showSuccessToast('Resultado guardado para combinar.');
  };
  const requestToolChange = () => {
    if (!selectedTool) {
      return;
    }

    if (
      selectedTool === 'combine'
      && combineHasLocalState
      && !window.confirm(
        'Vas a salir de Combinar archivos. Las fuentes subidas manualmente y la configuración local se perderán. Los resultados guardados desde el sanitizador se conservarán hasta que recargues la página.',
      )
    ) {
      return;
    }

    setCombineHasLocalState(false);
    setSelectedTool(selectedTool === 'combine' ? 'sanitize' : 'combine');
  };
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
      <ImportWizard
        appearanceToolbar={appearanceToolbar}
        onSaveProcessedResult={saveProcessedResult}
      />
    );
  }

  if (selectedTool === 'combine') {
    return (
      <CombineWizard
        appearanceToolbar={appearanceToolbar}
        basketSources={combineBasketSources}
        onRemoveBasketSource={(sourceId) => setCombineBasketSources((current) => (
          current.filter((source) => source.id !== sourceId)
        ))}
        onLocalStatePresenceChange={setCombineHasLocalState}
      />
    );
  }

  return (
    <ToolSelector
      appearanceToolbar={appearanceToolbar}
      basketSourceCount={combineBasketSources.length}
      onSelectTool={setSelectedTool}
    />
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
