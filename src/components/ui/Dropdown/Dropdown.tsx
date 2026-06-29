import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDocumentScrollLock } from '../../../hooks/useDocumentScrollLock';
import './Dropdown.css';

export type DropdownOption<T extends string = string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type DropdownProps<T extends string = string> = {
  value: T | '';
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  label?: string;
  labelInfo?: ReactNode;
  disabled?: boolean;
  className?: string;
  scrollStrategy?: 'close' | 'lock';
  searchable?: boolean;
  searchPlaceholder?: string;
  noMatchesText?: string;
};

type MenuPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

type DropdownBoundaryRect = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;
const MAX_UPWARD_MENU_HEIGHT = 220;
const MIN_SPACE_TO_OPEN_DOWN = 160;

export function Dropdown<T extends string = string>({
  value,
  options,
  onChange,
  placeholder = 'Seleccionar',
  label,
  labelInfo,
  disabled = false,
  className = '',
  scrollStrategy = 'close',
  searchable = false,
  searchPlaceholder = 'Buscar…',
  noMatchesText = 'No hay coincidencias.',
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const searchableInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const listboxId = useId();
  const labelId = useId();
  const visibleOptions = searchable ? filterDropdownOptions(options, searchQuery) : options;
  const selectedOption = options.find((option) => option.value === value);
  const portalTarget = getDropdownPortalTarget(rootRef.current, document.body);

  useDocumentScrollLock(isOpen && scrollStrategy === 'lock');

  const close = () => {
    setIsOpen(false);
    setMenuPosition(null);
    setSearchQuery('');
  };

  const open = (initialQuery = '') => {
    if (disabled) {
      return;
    }

    const anchor = searchable ? searchableInputRef.current : buttonRef.current;
    if (!anchor) {
      return;
    }

    const initialOptions = searchable ? filterDropdownOptions(options, initialQuery) : options;
    setSearchQuery(initialQuery);
    setActiveIndex(getInitialDropdownIndex(initialOptions, initialOptions.findIndex((option) => option.value === value)));
    setMenuPosition(getDropdownMenuPosition(
      anchor.getBoundingClientRect(),
      window.innerWidth,
      window.innerHeight,
      getDropdownPreferredMenuHeight(options.length),
      getDropdownBoundaryRect(rootRef.current, window.innerWidth, window.innerHeight),
    ));
    setIsOpen(true);
  };

  const selectOption = (option: DropdownOption<T>) => {
    if (option.disabled) {
      return;
    }

    onChange(option.value);
    close();
    (searchable ? searchableInputRef.current : buttonRef.current)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      close();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        open();
        return;
      }

      setActiveIndex((current) => getNextDropdownIndex(options, current, event.key === 'ArrowDown' ? 1 : -1));
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && isOpen) {
      event.preventDefault();
      const option = visibleOptions[activeIndex];
      if (option) {
        selectOption(option);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePosition = () => {
      const anchor = searchable ? searchableInputRef.current : buttonRef.current;
      if (anchor) {
        setMenuPosition(getDropdownMenuPosition(
          anchor.getBoundingClientRect(),
          window.innerWidth,
          window.innerHeight,
          getDropdownPreferredMenuHeight(options.length),
          getDropdownBoundaryRect(rootRef.current, window.innerWidth, window.innerHeight),
        ));
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        close();
      }
    };
    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        (searchable ? searchableInputRef.current : buttonRef.current)?.focus();
      }
    };
    const handleScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }

      close();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleDocumentKeyDown);
    window.addEventListener('resize', updatePosition);
    if (scrollStrategy === 'close') {
      window.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
      window.removeEventListener('resize', updatePosition);
      if (scrollStrategy === 'close') {
        window.removeEventListener('scroll', handleScroll, true);
      }
    };
  }, [isOpen, options.length, searchable, scrollStrategy]);

  const menu = (
    <div
      ref={menuRef}
      id={listboxId}
      role="listbox"
      className="dropdownMenu"
      style={menuPosition as CSSProperties}
      aria-labelledby={label ? labelId : undefined}
    >
      {visibleOptions.length === 0 ? <div className="dropdownEmpty">{getDropdownEmptyMessage(searchable, noMatchesText)}</div> : null}
      {visibleOptions.map((option, index) => (
        <button
          id={`${listboxId}-option-${index}`}
          key={option.value}
          type="button"
          role="option"
          className={`dropdownOption${index === activeIndex ? ' isActive' : ''}${option.value === value ? ' isSelected' : ''}`}
          title={getDropdownOptionNativeTitle()}
          disabled={option.disabled}
          aria-selected={option.value === value}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => selectOption(option)}
        >
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div ref={rootRef} className={`dropdownField${className ? ` ${className}` : ''}`}>
      {label ? (
        <span className="dropdownLabel labelWithInfo">
          <span id={labelId}>{label}</span>
          {labelInfo}
        </span>
      ) : null}
      {searchable ? (
        <div className={`dropdownSearchableControl${disabled ? ' dropdownSearchableControl-disabled' : ''}`}>
          <input
            ref={searchableInputRef}
            type="text"
            role="combobox"
            className="dropdownSearchableInput"
            disabled={disabled}
            aria-labelledby={label ? labelId : undefined}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-controls={isOpen ? listboxId : undefined}
            aria-expanded={isOpen}
            aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
            placeholder={searchPlaceholder || placeholder}
            value={isOpen ? searchQuery : selectedOption?.label ?? ''}
            onFocus={(event) => {
              if (!isOpen) {
                open(selectedOption?.label ?? '');
              }
              event.currentTarget.select();
            }}
            onClick={(event) => event.currentTarget.select()}
            onChange={(event) => {
              const nextQuery = event.target.value;
              const nextOptions = filterDropdownOptions(options, nextQuery);
              if (!isOpen) {
                open(nextQuery);
                return;
              }
              setSearchQuery(nextQuery);
              setActiveIndex(getInitialDropdownIndex(nextOptions, -1));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                close();
                return;
              }

              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                if (!isOpen) {
                  open(selectedOption?.label ?? '');
                  return;
                }
                setActiveIndex((current) => getNextDropdownIndex(visibleOptions, current, event.key === 'ArrowDown' ? 1 : -1));
                return;
              }

              if (event.key === 'Enter') {
                event.preventDefault();
                if (!isOpen) {
                  open(selectedOption?.label ?? '');
                  return;
                }
                const option = visibleOptions[activeIndex];
                if (option) {
                  selectOption(option);
                }
              }
            }}
          />
          <span className="dropdownChevron" aria-hidden="true">▾</span>
        </div>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          className="dropdownTrigger"
          disabled={disabled}
          aria-labelledby={label ? labelId : undefined}
          aria-haspopup="listbox"
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          onClick={() => (isOpen ? close() : open())}
          onKeyDown={handleKeyDown}
        >
          <span className={selectedOption ? 'dropdownValue' : 'dropdownValue dropdownPlaceholder'}>
            {selectedOption?.label ?? placeholder}
          </span>
          <span className="dropdownChevron" aria-hidden="true">▾</span>
        </button>
      )}
      {isOpen && menuPosition
        ? createPortal(menu, portalTarget)
        : null}
    </div>
  );
}

export function getDropdownPortalTarget(root: HTMLElement | null, fallback: HTMLElement) {
  return root?.closest('dialog') ?? fallback;
}

export function getDropdownBoundaryElement(root: HTMLElement | null) {
  const dialog = root?.closest('dialog');
  if (!dialog) {
    return null;
  }

  const modalBody = dialog.querySelector<HTMLElement>('.modalBody');
  if (root && modalBody?.contains(root)) {
    return modalBody;
  }

  return dialog as HTMLElement;
}

export function getDropdownBoundaryRect(root: HTMLElement | null, viewportWidth: number, viewportHeight: number): DropdownBoundaryRect {
  const boundaryElement = getDropdownBoundaryElement(root);

  if (boundaryElement) {
    return boundaryElement.getBoundingClientRect();
  }

  return {
    left: 0,
    top: 0,
    right: viewportWidth,
    bottom: viewportHeight,
  };
}

export function getDropdownOptionNativeTitle() {
  return undefined;
}

export function filterDropdownOptions<T extends string>(options: DropdownOption<T>[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedQuery));
}

export function getDropdownEmptyMessage(searchable: boolean, noMatchesText = 'No hay coincidencias.') {
  return searchable ? noMatchesText : 'Sin opciones';
}

export function getInitialDropdownIndex(options: DropdownOption[], selectedIndex: number) {
  if (selectedIndex >= 0 && !options[selectedIndex]?.disabled) {
    return selectedIndex;
  }

  return options.findIndex((option) => !option.disabled);
}

export function getNextDropdownIndex(options: DropdownOption[], currentIndex: number, direction: 1 | -1) {
  if (options.length === 0) {
    return -1;
  }

  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (currentIndex + direction * offset + options.length) % options.length;
    if (!options[index]?.disabled) {
      return index;
    }
  }

  return -1;
}

export function getDropdownPreferredMenuHeight(optionCount: number) {
  return Math.min(320, Math.max(48, optionCount * 36 + 12));
}

export function getDropdownMenuPosition(
  rect: Pick<DOMRect, 'left' | 'top' | 'bottom' | 'width'>,
  viewportWidth: number,
  viewportHeight: number,
  preferredHeight = 320,
  boundary: DropdownBoundaryRect = getViewportDropdownBoundary(viewportWidth, viewportHeight),
): MenuPosition {
  const margin = 8;
  const menuGap = 6;
  const boundaryWidth = Math.max(0, boundary.right - boundary.left);
  const maxWidth = Math.max(0, boundaryWidth - margin * 2);
  const width = Math.min(Math.max(rect.width, 240), maxWidth);
  const minLeft = boundary.left + margin;
  const maxLeft = Math.max(minLeft, boundary.right - width - margin);
  const left = Math.min(Math.max(rect.left, minLeft), maxLeft);
  const spaceBelow = Math.max(0, boundary.bottom - rect.bottom - margin - menuGap);
  const spaceAbove = Math.max(0, rect.top - boundary.top - margin - menuGap);
  const opensAbove = spaceBelow < MIN_SPACE_TO_OPEN_DOWN;
  const availableSpace = opensAbove ? spaceAbove : spaceBelow;
  const maxHeight = Math.min(preferredHeight, availableSpace, opensAbove ? MAX_UPWARD_MENU_HEIGHT : preferredHeight);
  const top = opensAbove ? rect.top - maxHeight - menuGap : rect.bottom + menuGap;

  return { left, top, width, maxHeight };
}

function getViewportDropdownBoundary(viewportWidth: number, viewportHeight: number): DropdownBoundaryRect {
  return {
    left: 0,
    top: 0,
    right: viewportWidth,
    bottom: viewportHeight,
  };
}
