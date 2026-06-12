import type { ReactNode } from 'react';
import { Modal } from '../../Modal/Modal';
import { ActionButton } from '../ActionButton/ActionButton';

type ConfirmDialogVariant = 'primary' | 'danger';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  variant?: ConfirmDialogVariant;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  variant = 'primary',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      className="confirmDialogModal"
      onClose={onCancel}
      footer={(
        <div className="confirmDialogActions">
          <ActionButton action="close" variant="secondary" onClick={onCancel} autoFocus>
            {cancelLabel}
          </ActionButton>
          <ActionButton action={variant === 'danger' ? 'delete' : 'done'} variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </ActionButton>
        </div>
      )}
    >
      <p className="confirmDialogMessage">{message}</p>
    </Modal>
  );
}
