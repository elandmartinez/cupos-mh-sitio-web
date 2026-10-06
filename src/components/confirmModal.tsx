import Modal from './modal';

interface ConfirmModalProps {
  /** The question the dialog asks, e.g. "¿Eliminar producto?". */
  title?: string;
  message: string;
  /** The action, verb + object — "Eliminar producto", never "OK" or "Sí". */
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** True while the dialog plays its exit animation (see `usePresent`). */
  closing?: boolean;
}

/**
 * Destructive-action confirmation: an alertdialog whose consequence sentence is
 * wired in via aria-describedby. Cancel sits bottom-left and the danger action
 * bottom-right, and focus starts on the dialog itself — never on the button
 * that destroys data.
 */
export default function ConfirmModal({
  title = '¿Confirmar acción?',
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  closing = false,
}: ConfirmModalProps) {
  return (
    <Modal
      labelledBy="confirmTitle"
      describedBy="confirmMessage"
      role="alertdialog"
      onClose={onCancel}
      cardClassName="confirmCard"
      closing={closing}
    >
      <div className="formCardHeader">
        <h2 id="confirmTitle">{title}</h2>
        <button type="button" onClick={onCancel} className="btnIcon btnClose" aria-label="Cerrar">
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
