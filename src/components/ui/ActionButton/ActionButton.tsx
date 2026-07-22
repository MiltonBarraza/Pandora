import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { actionIcons, type ActionIconComponent, type ActionName } from './actionIcons';
import './ActionButton.css';

type ActionButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
type ActionButtonSize = 'sm' | 'md';

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  action?: ActionName;
  icon?: ActionIconComponent;
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  children?: ReactNode;
};

export function ActionButton({
  action,
  icon,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  title,
  'aria-label': ariaLabel,
  ...props
}: ActionButtonProps) {
  const Icon = icon ?? (action ? actionIcons[action] : undefined);
  const isIconOnly = !children;
  const accessibleLabel = ariaLabel ?? (isIconOnly && typeof title === 'string' ? title : undefined);
  const classes = [
    'actionButton',
    `actionButton-${variant}`,
    `actionButton-${size}`,
    isIconOnly ? 'actionButton-iconOnly' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button {...props} type={type} className={classes} title={isIconOnly ? undefined : title} aria-label={accessibleLabel}>
      {Icon ? <Icon className="actionButtonIcon" focusable="false" /> : null}
      {children ? <span className="actionButtonText">{children}</span> : null}
    </button>
  );
}

export function ButtonGroup({ className = '', ...props }: ButtonHTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`actionButtonGroup${className ? ` ${className}` : ''}`} />;
}
