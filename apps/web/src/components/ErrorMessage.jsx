/**
 * Announces an error to screen readers and shows it inline.
 * @param {{error: (?Error|string)}} props
 */
export default function ErrorMessage({error}) {
  if (!error) {
    return null;
  }
  return (
    <p role="alert" className="error">
      {typeof error === 'string' ? error : error.message}
    </p>
  );
}
