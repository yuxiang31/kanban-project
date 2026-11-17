/**
 * @fileoverview Optimistic move mutations: the board cache is updated at
 * once, rolled back if the server refuses, and refetched either way.
 */

import {useMutation, useQueryClient} from '@tanstack/react-query';
import * as api from '../../api/boards.js';
import {boardKey, boardsKey} from './boardQueries.js';
import {applyStageMove, applyTaskMove} from './dnd.js';

/**
 * @param {number} boardId
 * @param {function(*): !Promise<*>} mutationFn
 * @param {function(!Object, *): !Object} apply
 * @return {!Object}
 */
function useOptimisticMove(boardId, mutationFn, apply) {
  const queryClient = useQueryClient();
  const key = boardKey(boardId);
  return useMutation({
    mutationFn,
    onMutate: async (move) => {
      await queryClient.cancelQueries({queryKey: key});
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (board) => apply(board, move));
      return {previous};
    },
    onError: (_error, _move, context) => {
      queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: boardsKey}),
  });
}

/** @param {number} boardId */
export function useMoveTask(boardId) {
  return useOptimisticMove(
    boardId,
    ({taskId, ...body}) => api.updateTask(taskId, body),
    applyTaskMove,
  );
}

/** @param {number} boardId */
export function useMoveStage(boardId) {
  return useOptimisticMove(
    boardId,
    ({stageId, ...body}) => api.updateStage(stageId, body),
    applyStageMove,
  );
}
