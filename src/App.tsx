import { AppearanceToolbar } from './components/AppearanceToolbar/AppearanceToolbar';
import { useAppearanceTheme } from './components/AppearanceToolbar/useAppearanceTheme';
import { ImportWizard } from './components/ImportWizard/ImportWizard';

export default function App() {
  const appearance = useAppearanceTheme();
  const appearanceToolbar = (
    <AppearanceToolbar
      preference={appearance.preference}
      resolvedTheme={appearance.resolvedTheme}
      onPreferenceChange={appearance.setPreference}
    />
  );

  return <ImportWizard appearanceToolbar={appearanceToolbar} />;
}
