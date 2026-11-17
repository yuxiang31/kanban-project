/**
 * @fileoverview Accessible modal dialog: labelled by its title, focus moves
 * in on open and back on close, Tab is trapped, Escape and backdrop click
 * close it.
 */

import {useEffect, useId, useRef} from 'react';
import {createPortal} from 'react-dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), ' +
  'textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * @param {{
 *   title: string,
 *   onClose: function(),
 *   children: *,
 *   role?: string,
 *   initialFocus?: string,
 * }} props `initialFocus` is a selector inside the dialog to focus first;
 *     by default the first focusable element gets focus.
 */
export default function Modal({
  title,
  onClose,
  children,
  role = 'dialog',
  initialFocus,
}) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    const first =
      (initialFocus && dialog.querySelector(initialFocus)) ??
      dialog.querySelector(FOCUSABLE);
    first?.focus();
    return () => previous?.focus?.();
  }, [initialFocus]);

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const items = [...ref.current.querySelectorAll(FOCUSABLE)];
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={ref}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal"
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
