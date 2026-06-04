import { useEffect, useId, useRef, type ReactNode } from 'react';

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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
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
        <button type="button" className="iconButton" title="Cerrar" aria-label="Cerrar" onClick={onClose}>
          X
        </button>
      </div>
      <div className="modalBody">{children}</div>
    </dialog>
  );
}
