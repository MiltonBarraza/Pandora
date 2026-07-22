import type { ComponentProps } from 'react';
import { appIconMap, type AppIconName } from './iconMap';

type AppIconProps = Omit<ComponentProps<'svg'>, 'color' | 'name'> & {
  name: AppIconName;
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
};

export function AppIcon({
  name,
  size = 18,
  strokeWidth = 2,
  color = 'currentColor',
  ...props
}: AppIconProps) {
  const Icon = appIconMap[name];

  return <Icon {...props} color={color} size={size} strokeWidth={strokeWidth} />;
}
