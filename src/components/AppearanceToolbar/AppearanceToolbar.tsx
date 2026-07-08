import { useEffect, useId, useRef, useState } from 'react';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { AppIcon } from '../ui/AppIcon/AppIcon';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import type { CombineSource } from '../../types/combine';
import type { AppearancePreference, ResolvedAppearanceTheme } from './useAppearanceTheme';

type ToolbarTool = 'sanitize' | 'combine';

type AppearanceToolbarProps = {
  preference: AppearancePreference;
  resolvedTheme: ResolvedAppearanceTheme;
  activeTool: ToolbarTool | null;
  combineBasketSources: CombineSource[];
  onPreferenceChange: (preference: AppearancePreference) => void;
  onToolSelect: (tool: ToolbarTool) => void;
};

const toolOptions: Array<{ value: ToolbarTool; label: string }> = [
  { value: 'sanitize', label: 'Preparar archivo' },
  { value: 'combine', label: 'Combinar archivos' },
];

const appearanceOptions: Array<{
  value: Extract<AppearancePreference, 'light' | 'dark'>;
  label: string;
  ariaLabel: string;
  icon: 'sun' | 'moon';
}> = [
  { value: 'light', label: 'Claro', ariaLabel: 'Activar modo claro', icon: 'sun' },
  { value: 'dark', label: 'Oscuro', ariaLabel: 'Activar modo oscuro', icon: 'moon' },
];

export function AppearanceToolbar({
  preference,
  resolvedTheme,
  activeTool,
  combineBasketSources,
  onPreferenceChange,
  onToolSelect,
}: AppearanceToolbarProps) {
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const [isBasketPopoverOpen, setIsBasketPopoverOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const toolMenuId = useId();
  const basketPopoverId = useId();
  const basketSourceCount = combineBasketSources.length;
  const hasBasketSources = basketSourceCount > 0;

  useEffect(() => {
    if (!isToolMenuOpen && !isBasketPopoverOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !toolbarRef.current?.contains(target)) {
        setIsToolMenuOpen(false);
        setIsBasketPopoverOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsToolMenuOpen(false);
        setIsBasketPopoverOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBasketPopoverOpen, isToolMenuOpen]);

  return (
    <div ref={toolbarRef} className="appTopToolbar" aria-label="Herramientas y apariencia">
      <div className="appToolbarGroup appToolbarToolsGroup">
        <div className="appToolMenu">
          <button
            type="button"
            className={`appToolMenuTrigger${isToolMenuOpen ? ' isOpen' : ''}`}
            aria-haspopup="menu"
            aria-expanded={isToolMenuOpen}
            aria-controls={isToolMenuOpen ? toolMenuId : undefined}
            onClick={() => {
              setIsBasketPopoverOpen(false);
              setIsToolMenuOpen((current) => !current);
            }}
          >
            <span>Herramientas</span>
            <AppIcon name="chevronDown" size={15} aria-hidden="true" focusable="false" />
          </button>

          {isToolMenuOpen ? (
            <div id={toolMenuId} className="appToolMenuPopover" role="menu" aria-label="Herramientas">
              {toolOptions.map((option) => {
                const isActive = activeTool === option.value;
                const showCombineCount = option.value === 'combine' && hasBasketSources;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitem"
                    className={`appToolMenuOption${isActive ? ' isActive' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      setIsToolMenuOpen(false);
                      if (!isActive) {
                        onToolSelect(option.value);
                      }
                    }}
                  >
                    <span>{option.label}</span>
                    <span className="appToolMenuOptionMeta">
                      {showCombineCount ? <span>{getAvailableShortLabel(basketSourceCount)}</span> : null}
                      {isActive ? <AppIcon name="done" size={15} aria-hidden="true" focusable="false" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {hasBasketSources ? (
          <>
            <span className="appToolBasketBadge" aria-label={getAvailableAriaLabel(basketSourceCount)}>
              {basketSourceCount}
            </span>
            <InfoTooltip content="Ver archivos disponibles">
              <ActionButton
                variant="icon"
                size="sm"
                action="preview"
                className={`appToolBasketButton${isBasketPopoverOpen ? ' isActive' : ''}`}
                aria-label="Ver archivos disponibles para combinar"
                aria-expanded={isBasketPopoverOpen}
                aria-controls={isBasketPopoverOpen ? basketPopoverId : undefined}
                onClick={() => {
                  setIsToolMenuOpen(false);
                  setIsBasketPopoverOpen((current) => !current);
                }}
              />
            </InfoTooltip>
            {isBasketPopoverOpen ? (
              <section
                id={basketPopoverId}
                className="appToolBasketPopover"
                role="dialog"
                aria-label="Archivos disponibles para combinar"
              >
                <h2>Archivos disponibles para combinar</h2>
                <ul>
                  {combineBasketSources.map((source) => (
                    <li key={source.id}>
                      <strong>{source.fileName || 'Archivo preparado'}</strong>
                      <span>
                        Hoja: {source.sheetName?.trim() || 'Sin hoja'} · {getRowCountLabel(source.rows.length)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="appToolbarGroup appearanceToggle" role="group" aria-label={`Apariencia actual: ${getAppearanceLabel(preference, resolvedTheme)}`}>
        {appearanceOptions.map((option) => {
          const isActive = preference === 'system' ? resolvedTheme === option.value : preference === option.value;

          return (
            <InfoTooltip key={option.value} content={option.label}>
              <ActionButton
                variant="icon"
                size="sm"
                className={`appearanceIconButton${isActive ? ' isActive' : ''}`}
                aria-label={option.ariaLabel}
                aria-pressed={isActive}
                icon={(props) => <AppIcon {...props} name={option.icon} />}
                onClick={() => onPreferenceChange(option.value)}
              />
            </InfoTooltip>
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

function getAvailableShortLabel(count: number) {
  return `${count} ${count === 1 ? 'disponible' : 'disponibles'}`;
}

function getAvailableAriaLabel(count: number) {
  return `${count} ${count === 1 ? 'archivo disponible' : 'archivos disponibles'} para combinar`;
}

function getRowCountLabel(count: number) {
  return `${count} ${count === 1 ? 'fila' : 'filas'}`;
}
