import {useState} from 'react';
import ColorPicker from './ColorPicker.jsx';
import ErrorMessage from './ErrorMessage.jsx';
import Modal from './Modal.jsx';

/**
 * Pick a colour (or none) and save it.
 * @param {{
 *   title: string,
 *   initial: ?string,
 *   note?: string,
 *   onSave: function(?string): !Promise<void>,
 *   onClose: function(),
 * }} props
 */
export default function ColorDialog({title, initial, note, onSave, onClose}) {
  const [color, setColor] = useState(initial ?? null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(color);
      onClose();
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <ColorPicker value={color} onChange={setColor} />
        {note && <p className="muted small">{note}</p>}
        <ErrorMessage error={error} />
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={saving}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
