/**
 * @fileoverview TanStack Query hooks for teams. Membership changes also
 * change which boards someone can see, so writes refresh boards too.
 */

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import * as api from '../../api/teams.js';

export const teamsKey = ['teams'];
/** @param {number} teamId */
export const teamKey = (teamId) => ['teams', teamId];

export function useTeams() {
  return useQuery({queryKey: teamsKey, queryFn: api.listTeams});
}

/** @param {number} teamId */
export function useTeam(teamId) {
  return useQuery({
    queryKey: teamKey(teamId),
    queryFn: () => api.getTeam(teamId),
  });
}

/**
 * @param {function(*): !Promise<*>} mutationFn
 * @return {!Object}
 */
export function useTeamMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({queryKey: teamsKey}),
        queryClient.invalidateQueries({queryKey: ['boards']}),
      ]),
  });
}
