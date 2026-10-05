import Modal from './modal';

interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Destructive-action confirmation. Cancel is listed first so the safe choice
 * sits where the thumb lands, and the consequence sentence is wired to the
 * dialog via aria-describedby.
 */
export default function ConfirmModal({
  title = 'Confirmar',
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      labelledBy="confirmTitle"
      describedBy="confirmMessage"
      onClose={onCancel}
      cardClassName="confirmCard"
    >
      <div className="formCardHeader">
        <h2 className="formTitle" id="confirmTitle">
          {title}
        </h2>
        <button type="button" onClick={onCancel} className="btnClose" aria-label="Cerrar">
          ×
        </button>
      </div>

      <p className="confirmMessage" id="confirmMessage">
        {message}
      </p>

      <div className="buttonGroup">
        <button type="button" onClick={onCancel} className="btnSecondary">
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} className="btnDanger">
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
