import { ActionButton } from '../ui/ActionButton/ActionButton';

type DeleteButtonProps = {
  onClick: () => void;
  title?: string;
};

export function DeleteButton({ onClick, title = 'Eliminar' }: DeleteButtonProps) {
  return (
    <ActionButton action="delete" variant="danger" size="sm" title={title} aria-label={title} onClick={onClick} />
  );
}
