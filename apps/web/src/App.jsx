/**
 * @fileoverview Root component: query client, auth and router.
 */

import {useState} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {
  createBrowserRouter,
  createMemoryRouter,
  RouterProvider,
} from 'react-router';
import {AuthProvider} from './context/AuthContext.jsx';
import {routes} from './router.jsx';

/**
 * @param {{initialEntries?: !Array<string>}} props Pass `initialEntries` to
 *     use an in-memory router (tests); omit it to use the browser URL.
 */
export function AppProviders({initialEntries}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {queries: {retry: false, refetchOnWindowFocus: false}},
      }),
  );
  const [router] = useState(() =>
    initialEntries
      ? createMemoryRouter(routes, {initialEntries})
      : createBrowserRouter(routes),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return <AppProviders />;
}
