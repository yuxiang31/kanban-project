/**
 * @fileoverview Holds the logged-in user. The session lives in an httpOnly
 * cookie, so the client learns who is logged in from GET /api/auth/me.
 */

import {createContext, useMemo} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import * as authApi from '../api/auth.js';

export const ME_KEY = ['auth', 'me'];

/**
 * @typedef {Object} AuthValue
 * @property {?Object} user
 * @property {boolean} isLoading
 * @property {?Error} error
 * @property {function(!Object): !Promise<!Object>} login
 * @property {function(!Object): !Promise<!Object>} register
 * @property {function(): !Promise<void>} logout
 */

/** @type {!React.Context<?AuthValue>} */
export const AuthContext = createContext(null);

export function AuthProvider({children}) {
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: authApi.fetchMe,
    staleTime: Infinity,
  });

  const value = useMemo(() => {
    const signIn = (apiCall) => async (input) => {
      const user = await apiCall(input);
      queryClient.setQueryData(ME_KEY, user);
      return user;
    };
    return {
      user: me.data ?? null,
      isLoading: me.isPending,
      error: me.error,
      login: signIn(authApi.login),
      register: signIn(authApi.register),
      logout: async () => {
        await authApi.logout();
        queryClient.setQueryData(ME_KEY, null);
        // Drop every other cached query so the next user starts clean. The
        // `me` query is kept (not cleared) so its observers see `null`.
        queryClient.removeQueries({
          predicate: (query) => query.queryKey[0] !== ME_KEY[0],
        });
      },
    };
  }, [me.data, me.isPending, me.error, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
