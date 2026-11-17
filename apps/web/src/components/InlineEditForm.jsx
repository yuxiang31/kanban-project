/**
 * @fileoverview A one-field form that replaces a heading while renaming.
 * Enter saves, Escape cancels.
 */

import {useId, useState} from 'react';
import ErrorMessage from './ErrorMessage.jsx';

/**
 * @param {{
 *   label: string,
 *   initialValue?: string,
 *   maxLength: number,
 *   submitLabel?: string,
 *   onSave: function(string): !Promise<void>,
 *   onCancel: function(),
 *   className?: string,
 * }} props
 */
export default function InlineEditForm({
  label,
  initialValue = '',
  maxLength,
  submitLabel = 'Save',
  onSave,
  onCancel,
  className = '',
}) {
  const inputId = useId();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(trimmed);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <form className={`inline-form ${className}`} onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        value={value}
        maxLength={maxLength}
        autoFocus
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onCancel();
          }
        }}
      />
      <div className="inline-actions">
        <button
          type="submit"
          className="button primary"
          disabled={busy || !value.trim()}
        >
          {submitLabel}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <ErrorMessage error={error} />
    </form>
  );
}
