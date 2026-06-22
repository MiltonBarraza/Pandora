import type { ComponentProps } from 'react';
import { AppIcon } from '../AppIcon/AppIcon';
import type { AppIconName } from '../AppIcon/iconMap';

export type ActionIconComponent = (props: ComponentProps<'svg'>) => JSX.Element;

export type ActionName =
  | 'delete'
  | 'duplicate'
  | 'add'
  | 'edit'
  | 'save'
  | 'download'
  | 'import'
  | 'export'
  | 'upload'
  | 'clear'
  | 'close'
  | 'configure'
  | 'info'
  | 'warning'
  | 'error'
  | 'done';

function createActionIcon(name: AppIconName): ActionIconComponent {
  return function ActionIcon(props) {
    return <AppIcon {...props} name={name} />;
  };
}

export const actionIcons: Record<ActionName, ActionIconComponent> = {
  delete: createActionIcon('delete'),
  duplicate: createActionIcon('duplicate'),
  add: createActionIcon('add'),
  edit: createActionIcon('edit'),
  save: createActionIcon('save'),
  download: createActionIcon('download'),
  import: createActionIcon('import'),
  export: createActionIcon('export'),
  upload: createActionIcon('upload'),
  clear: createActionIcon('clear'),
  close: createActionIcon('close'),
  configure: createActionIcon('configure'),
  info: createActionIcon('info'),
  warning: createActionIcon('warning'),
  error: createActionIcon('error'),
  done: createActionIcon('done'),
};

export const actionIconsAlternate = {
  saveDone: createActionIcon('done'),
} as const;
