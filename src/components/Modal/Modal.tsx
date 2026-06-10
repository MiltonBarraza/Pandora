import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useDocumentScrollLock } from '../../hooks/useDocumentScrollLock';
import { ActionButton } from '../ui/ActionButton/ActionButton';

type ModalProps = {
  open: boolean;
  title: string;
  size?: 'default' | 'xl';
  onClose: () => void;
  children: ReactNode;
  headerDetails?: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, title, size = 'default', onClose, children, headerDetails, footer }: ModalProps) {
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

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [onClose, open]);

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
        <div className="modalTitleBlock">
          <h3 id={titleId}>{title}</h3>
          {headerDetails ? <div className="modalHeaderDetails">{headerDetails}</div> : null}
        </div>
        <ActionButton action="close" variant="icon" size="sm" title="Cerrar" aria-label="Cerrar" onClick={onClose} />
      </div>
      <div className="modalBody">{children}</div>
      {footer ? <div className="modalFooter">{footer}</div> : null}
    </dialog>
  );
}
