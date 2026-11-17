/**
 * @fileoverview Swatch picker: native radio buttons (arrow keys move
 * between them), each named for screen readers, plus "None".
 */

import {useId} from 'react';
import {COLORS, colorLabel} from '../utils/palette.js';

/**
 * @param {{value: ?string, onChange: function(?string), label?: string}}
 *     props
 */
export default function ColorPicker({value, onChange, label = 'Colour'}) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-labelledby={`${id}-label`}
      className="color-picker"
    >
      <span id={`${id}-label`} className="color-picker-label">
        {label}
      </span>
      <span className="swatches">
        {[null, ...COLORS].map((color) => (
          <input
            key={color ?? 'none'}
            type="radio"
            name={id}
            className="swatch"
            data-color={color ?? undefined}
            aria-label={color ? colorLabel(color) : 'None'}
            title={color ? colorLabel(color) : 'No colour'}
            checked={(value ?? null) === color}
            onChange={() => onChange(color)}
          />
        ))}
      </span>
    </div>
  );
}
