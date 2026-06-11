import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type Ref,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import './InfoTooltip.css';

type InfoTooltipPlacement = 'top' | 'right' | 'bottom' | 'left';

type InfoTooltipProps = {
  content: string;
  ariaLabel?: string;
  placement?: InfoTooltipPlacement;
  className?: string;
  children?: ReactElement;
};

type TooltipPosition = {
  left: number;
  top: number;
  placement: InfoTooltipPlacement;
};

const TOOLTIP_GAP = 8;
const VIEWPORT_MARGIN = 8;

export function InfoTooltip({
  content,
  ariaLabel = 'Ver ayuda',
  placement = 'top',
  className = '',
  children,
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = useId();
  const hasCustomTrigger = isValidElement(children);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const bubble = bubbleRef.current;
    if (!trigger || !bubble) {
      return;
    }

    setPosition(getInfoTooltipPosition(
      trigger.getBoundingClientRect(),
      bubble.getBoundingClientRect(),
      window.innerWidth,
      window.innerHeight,
      placement,
    ));
  }, [placement]);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !rootRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const animationFrame = window.requestAnimationFrame(updatePosition);

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((current) => !current);
  const portalTarget = getInfoTooltipPortalTarget(triggerRef.current, document.body);

  const bubble = isOpen
    ? createPortal(
        <span
          ref={bubbleRef}
          id={tooltipId}
          role="tooltip"
          className={`infoTooltipBubble ${getInfoTooltipPlacementClass(position?.placement ?? placement)}${position ? ' isPositioned' : ''}`}
          style={position ? getInfoTooltipBubbleStyle(position) : undefined}
        >
          {content}
        </span>,
        portalTarget,
      )
    : null;

  if (hasCustomTrigger) {
    const child = children as ReactElement<Record<string, unknown>>;
    const childProps = child.props as {
      ref?: Ref<HTMLElement>;
      className?: string;
      onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
      onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
      onFocus?: (event: FocusEvent<HTMLElement>) => void;
      onBlur?: (event: FocusEvent<HTMLElement>) => void;
      onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
      'aria-describedby'?: string;
    };

    return (
      <span
        ref={rootRef}
        className={`infoTooltip infoTooltipCustomTrigger${isOpen ? ' isOpen' : ''}${className ? ` ${className}` : ''}`}
      >
        {cloneElement(child, {
          ref: (node: HTMLElement | null) => {
            triggerRef.current = node;
            assignRef(childProps.ref, node);
          },
          className: childProps.className,
          'aria-describedby': mergeAriaDescribedBy(childProps['aria-describedby'], isOpen ? tooltipId : undefined),
          onMouseEnter: (event: MouseEvent<HTMLElement>) => {
            childProps.onMouseEnter?.(event);
            open();
          },
          onMouseLeave: (event: MouseEvent<HTMLElement>) => {
            childProps.onMouseLeave?.(event);
            if (!event.currentTarget.contains(document.activeElement)) {
              close();
            }
          },
          onFocus: (event: FocusEvent<HTMLElement>) => {
            childProps.onFocus?.(event);
            open();
          },
          onBlur: (event: FocusEvent<HTMLElement>) => {
            childProps.onBlur?.(event);
            close();
          },
          onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
            childProps.onKeyDown?.(event);
            if (event.key === 'Escape') {
              close();
            }
          },
        })}
        {bubble}
      </span>
    );
  }

  return (
    <span
      ref={rootRef}
      className={`infoTooltip ${getInfoTooltipPlacementClass(placement)}${isOpen ? ' isOpen' : ''}${className ? ` ${className}` : ''}`}
      onMouseEnter={open}
      onMouseLeave={() => {
        if (!rootRef.current?.contains(document.activeElement)) {
          close();
        }
      }}
      onFocus={open}
      onBlur={close}
    >
      <button
        ref={(node) => {
          triggerRef.current = node;
        }}
        type="button"
        className="infoTooltipTrigger"
        aria-label={ariaLabel}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
      >
        <InfoTooltipIcon />
      </button>
      {bubble}
    </span>
  );
}

export function getInfoTooltipPlacementClass(placement: InfoTooltipPlacement) {
  return `infoTooltip-${placement}`;
}

export function getInfoTooltipPortalTarget(trigger: HTMLElement | null, fallback: HTMLElement) {
  return trigger?.closest('dialog') ?? fallback;
}

export function getInfoTooltipPosition(
  triggerRect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>,
  bubbleRect: Pick<DOMRect, 'width' | 'height'>,
  viewportWidth: number,
  viewportHeight: number,
  preferredPlacement: InfoTooltipPlacement,
): TooltipPosition {
  const placement = getBestInfoTooltipPlacement(triggerRect, bubbleRect, viewportWidth, viewportHeight, preferredPlacement);
  const raw = getRawInfoTooltipPosition(triggerRect, bubbleRect, placement);

  return {
    placement,
    left: clamp(raw.left, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportWidth - bubbleRect.width - VIEWPORT_MARGIN)),
    top: clamp(raw.top, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportHeight - bubbleRect.height - VIEWPORT_MARGIN)),
  };
}

function getBestInfoTooltipPlacement(
  triggerRect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>,
  bubbleRect: Pick<DOMRect, 'width' | 'height'>,
  viewportWidth: number,
  viewportHeight: number,
  preferredPlacement: InfoTooltipPlacement,
): InfoTooltipPlacement {
  if (hasEnoughInfoTooltipSpace(triggerRect, bubbleRect, viewportWidth, viewportHeight, preferredPlacement)) {
    return preferredPlacement;
  }

  const fallbackOrder: Record<InfoTooltipPlacement, InfoTooltipPlacement[]> = {
    top: ['bottom', 'right', 'left'],
    bottom: ['top', 'right', 'left'],
    right: ['left', 'bottom', 'top'],
    left: ['right', 'bottom', 'top'],
  };

  return fallbackOrder[preferredPlacement].find((nextPlacement) =>
    hasEnoughInfoTooltipSpace(triggerRect, bubbleRect, viewportWidth, viewportHeight, nextPlacement),
  ) ?? preferredPlacement;
}

function hasEnoughInfoTooltipSpace(
  triggerRect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>,
  bubbleRect: Pick<DOMRect, 'width' | 'height'>,
  viewportWidth: number,
  viewportHeight: number,
  placement: InfoTooltipPlacement,
) {
  const position = getRawInfoTooltipPosition(triggerRect, bubbleRect, placement);
  return (
    position.left >= VIEWPORT_MARGIN &&
    position.top >= VIEWPORT_MARGIN &&
    position.left + bubbleRect.width <= viewportWidth - VIEWPORT_MARGIN &&
    position.top + bubbleRect.height <= viewportHeight - VIEWPORT_MARGIN
  );
}

function getRawInfoTooltipPosition(
  triggerRect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>,
  bubbleRect: Pick<DOMRect, 'width' | 'height'>,
  placement: InfoTooltipPlacement,
) {
  const centerX = triggerRect.left + triggerRect.width / 2;
  const centerY = triggerRect.top + triggerRect.height / 2;

  if (placement === 'right') {
    return { left: triggerRect.right + TOOLTIP_GAP, top: centerY - bubbleRect.height / 2 };
  }

  if (placement === 'left') {
    return { left: triggerRect.left - bubbleRect.width - TOOLTIP_GAP, top: centerY - bubbleRect.height / 2 };
  }

  if (placement === 'bottom') {
    return { left: centerX - bubbleRect.width / 2, top: triggerRect.bottom + TOOLTIP_GAP };
  }

  return { left: centerX - bubbleRect.width / 2, top: triggerRect.top - bubbleRect.height - TOOLTIP_GAP };
}

function getInfoTooltipBubbleStyle(position: TooltipPosition): CSSProperties {
  return {
    left: position.left,
    top: position.top,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function mergeAriaDescribedBy(current: string | undefined, next: string | undefined) {
  return [current, next].filter(Boolean).join(' ') || undefined;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) {
    return;
  }

  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  (ref as { current: T | null }).current = value;
}

function InfoTooltipIcon() {
  return (
    <svg
      aria-hidden="true"
      className="infoTooltipIcon"
      focusable="false"
      fill="none"
      height="15"
      viewBox="0 0 24 24"
      width="15"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}
