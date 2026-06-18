import { AppearanceToolbar } from './components/AppearanceToolbar/AppearanceToolbar';
import { useAppearanceTheme } from './components/AppearanceToolbar/useAppearanceTheme';
import { ImportWizard } from './components/ImportWizard/ImportWizard';
import { IconsPreview } from './dev/IconsPreview';

export default function App() {
  const appearance = useAppearanceTheme();
  const appearanceToolbar = (
    <AppearanceToolbar
      preference={appearance.preference}
      resolvedTheme={appearance.resolvedTheme}
      onPreferenceChange={appearance.setPreference}
    />
  );

  if (window.location.pathname === '/icons-preview' || window.location.pathname === '/dev/icons') {
    return (
      <>
        {appearanceToolbar}
        <IconsPreview />
      </>
    );
  }

  return <ImportWizard appearanceToolbar={appearanceToolbar} />;
}
