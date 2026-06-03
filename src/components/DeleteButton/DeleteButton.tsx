type DeleteButtonProps = {
  onClick: () => void;
  title?: string;
};

export function DeleteButton({ onClick, title = 'Eliminar' }: DeleteButtonProps) {
  return (
    <button type="button" className="iconButton danger" title={title} aria-label={title} onClick={onClick}>
      X
    </button>
  );
}
