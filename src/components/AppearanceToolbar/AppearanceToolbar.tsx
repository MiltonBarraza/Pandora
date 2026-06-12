import type { AppearancePreference, ResolvedAppearanceTheme } from './useAppearanceTheme';

type AppearanceToolbarProps = {
  preference: AppearancePreference;
  resolvedTheme: ResolvedAppearanceTheme;
  onPreferenceChange: (preference: AppearancePreference) => void;
};

const appearanceOptions: Array<{ value: AppearancePreference; label: string }> = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

export function AppearanceToolbar({ preference, resolvedTheme, onPreferenceChange }: AppearanceToolbarProps) {
  return (
    <div className="appTopToolbar" aria-label="Apariencia">
      <span className="appTopToolbarLabel">Apariencia</span>
      <div className="appearanceToggle" role="group" aria-label={`Apariencia actual: ${getAppearanceLabel(preference, resolvedTheme)}`}>
        {appearanceOptions.map((option) => {
          const isActive = preference === 'system' ? resolvedTheme === option.value : preference === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={`appearanceToggleOption${isActive ? ' isActive' : ''}`}
              aria-pressed={isActive}
              onClick={() => onPreferenceChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getAppearanceLabel(preference: AppearancePreference, resolvedTheme: ResolvedAppearanceTheme) {
  if (preference === 'system') {
    return `Sistema (${resolvedTheme === 'dark' ? 'oscuro' : 'claro'})`;
  }

  return preference === 'dark' ? 'Oscuro' : 'Claro';
}
