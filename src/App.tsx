import { useState, type ReactNode } from 'react';
import { AppearanceToolbar } from './components/AppearanceToolbar/AppearanceToolbar';
import { useAppearanceTheme } from './components/AppearanceToolbar/useAppearanceTheme';
import { CombineWizard } from './components/CombineWizard/CombineWizard';
import { ImportWizard } from './components/ImportWizard/ImportWizard';
import { ActionButton } from './components/ui/ActionButton/ActionButton';

type AppTool = 'sanitize' | 'combine';

export default function App() {
  const [selectedTool, setSelectedTool] = useState<AppTool | null>(null);
  const [combineHasState, setCombineHasState] = useState(false);
  const appearance = useAppearanceTheme();
  const requestToolChange = () => {
    if (!selectedTool) {
      return;
    }

    if (
      selectedTool === 'combine'
      && combineHasState
      && !window.confirm('Si cambiás de herramienta, se perderá el estado actual de Combinar archivos.')
    ) {
      return;
    }

    setCombineHasState(false);
    setSelectedTool(selectedTool === 'combine' ? 'sanitize' : 'combine');
  };
  const appearanceToolbar = (
    <AppearanceToolbar
      preference={appearance.preference}
      resolvedTheme={appearance.resolvedTheme}
      onPreferenceChange={appearance.setPreference}
      extraActions={selectedTool ? (
        <button type="button" className="appearanceToggleOption appToolSwitchOption" onClick={requestToolChange}>
          Cambiar herramienta
        </button>
      ) : null}
    />
  );

  if (selectedTool === 'sanitize') {
    return <ImportWizard appearanceToolbar={appearanceToolbar} />;
  }

  if (selectedTool === 'combine') {
    return (
      <CombineWizard
        appearanceToolbar={appearanceToolbar}
        onStatePresenceChange={setCombineHasState}
      />
    );
  }

  return <ToolSelector appearanceToolbar={appearanceToolbar} onSelectTool={setSelectedTool} />;
}

function ToolSelector({
  appearanceToolbar,
  onSelectTool,
}: {
  appearanceToolbar: ReactNode;
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
              Combinar archivos
            </ActionButton>
          </div>
        </section>
      </div>
    </main>
  );
}
