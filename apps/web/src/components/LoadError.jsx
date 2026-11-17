import ErrorMessage from './ErrorMessage.jsx';

/**
 * A failed load with a way to recover.
 * @param {{error: ?Error, onRetry: function()}} props
 */
export default function LoadError({error, onRetry}) {
  if (!error) {
    return null;
  }
  return (
    <div className="load-error">
      <ErrorMessage error={error} />
      <button type="button" className="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
