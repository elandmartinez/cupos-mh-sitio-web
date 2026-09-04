interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title = 'Confirmar',
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="modalOverlay" onClick={onCancel}>
      <div className="formCard confirmCard" onClick={(e) => e.stopPropagation()}>
        <div className="formCardHeader">
          <h2 className="formTitle">{title}</h2>
          <button type="button" onClick={onCancel} className="btnClose" aria-label="Cerrar">
            ×
          </button>
        </div>

        <p className="confirmMessage">{message}</p>

        <div className="buttonGroup">
          <button type="button" onClick={onConfirm} className="btnDanger">
            {confirmLabel}
          </button>
          <button type="button" onClick={onCancel} className="btnSecondary">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
