/**
 * @fileoverview Confirmation for destructive actions. Cancel has initial
 * focus so a stray Enter does not delete anything.
 */

import {useState} from 'react';
import ErrorMessage from './ErrorMessage.jsx';
import Modal from './Modal.jsx';

/**
 * @param {{
 *   title: string,
 *   children: *,
 *   confirmLabel?: string,
 *   onConfirm: function(): !Promise<void>,
 *   onCancel: function(),
 * }} props
 */
export default function ConfirmDialog({
  title,
  children,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={title}
      onClose={onCancel}
      role="alertdialog"
      initialFocus="[data-cancel]"
    >
      <div className="confirm-body">{children}</div>
      <ErrorMessage error={error} />
      <div className="dialog-actions">
        <button type="button" className="button" data-cancel onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="button danger"
          onClick={handleConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
