type DeleteButtonProps = {
  onClick: () => void;
};

export function DeleteButton({ onClick }: DeleteButtonProps) {
  return (
    <button type="button" className="iconButton danger" title="Eliminar" aria-label="Eliminar" onClick={onClick}>
      X
    </button>
  );
}
