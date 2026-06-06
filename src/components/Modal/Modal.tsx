import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useDocumentScrollLock } from '../../hooks/useDocumentScrollLock';
import { ActionButton } from '../ui/ActionButton/ActionButton';

type ModalProps = {
  open: boolean;
  title: string;
  size?: 'default' | 'xl';
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, title, size = 'default', onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useDocumentScrollLock(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={`modalDialog${size === 'xl' ? ' modalDialogXl' : ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="modalHeader">
        <h3 id={titleId}>{title}</h3>
        <ActionButton action="close" variant="icon" size="sm" title="Cerrar" aria-label="Cerrar" onClick={onClose} />
      </div>
      <div className="modalBody">{children}</div>
    </dialog>
  );
}
