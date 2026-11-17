/**
 * @fileoverview Placeholders shaped like the content that is loading, so
 * the layout does not jump when it arrives. Screen readers get the label.
 */

/**
 * @param {{label: string, count?: number, variant?: string}} props
 *     `variant` is 'cards' (board/team grid) or 'stages' (board columns).
 */
export default function Skeleton({label, count = 3, variant = 'cards'}) {
  return (
    <div className={`skeleton-group is-${variant}`}>
      <span role="status" className="visually-hidden">
        {label}
      </span>
      {Array.from({length: count}, (_, i) => (
        <div key={i} className="skeleton" aria-hidden="true" />
      ))}
    </div>
  );
}
