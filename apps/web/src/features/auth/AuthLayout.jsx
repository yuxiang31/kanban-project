/**
 * Centered card used by the login and register pages.
 * @param {{title: string, children: *}} props
 */
export default function AuthLayout({title, children}) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <p className="brand">Kanban</p>
        <h1>{title}</h1>
        {children}
      </div>
    </main>
  );
}
