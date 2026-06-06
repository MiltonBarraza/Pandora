import {
  AddCircleIcon,
  CloseCircleIcon,
  DeleteTrashIcon,
  DownloadFileIcon,
  DuplicateFileIcon,
  EditBoxIcon,
  ErrorCircleIcon,
  ExportIcon,
  ImportExcelIcon,
  InfoCircleIcon,
  ReadyCheckIcon,
  RemoveCircleIcon,
  SaveCheckIcon,
  SaveIcon,
  SettingsGearIcon,
  UploadFileIcon,
  WarningTriangleIcon,
  type IconProps,
} from '../../../dev/icons';

export type ActionIconComponent = (props: IconProps) => JSX.Element;

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

export const actionIcons: Record<ActionName, ActionIconComponent> = {
  delete: DeleteTrashIcon,
  duplicate: DuplicateFileIcon,
  add: AddCircleIcon,
  edit: EditBoxIcon,
  save: SaveIcon,
  download: DownloadFileIcon,
  import: ImportExcelIcon,
  export: ExportIcon,
  upload: UploadFileIcon,
  clear: RemoveCircleIcon,
  close: CloseCircleIcon,
  configure: SettingsGearIcon,
  info: InfoCircleIcon,
  warning: WarningTriangleIcon,
  error: ErrorCircleIcon,
  done: ReadyCheckIcon,
};

export const actionIconsAlternate = {
  saveDone: SaveCheckIcon,
} as const;
