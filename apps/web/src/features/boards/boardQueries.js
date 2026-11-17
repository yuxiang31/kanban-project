/**
 * @fileoverview TanStack Query hooks for boards. Every write invalidates the
 * `boards` key prefix, which refreshes both the list and open boards.
 */

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import * as api from '../../api/boards.js';

export const boardsKey = ['boards'];
/** @param {number} boardId */
export const boardKey = (boardId) => ['boards', boardId];

export function useBoards() {
  return useQuery({queryKey: boardsKey, queryFn: api.listBoards});
}

/** @param {number} boardId */
export function useBoard(boardId) {
  return useQuery({
    queryKey: boardKey(boardId),
    queryFn: () => api.getBoard(boardId),
  });
}

/**
 * A mutation that refreshes board data when it succeeds.
 * @param {function(*): !Promise<*>} mutationFn
 * @return {!Object}
 */
export function useBoardMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({queryKey: boardsKey}),
  });
}
