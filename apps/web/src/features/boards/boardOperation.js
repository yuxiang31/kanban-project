/**
 * @fileoverview "One change at a time" on a board. Inline changes (adding
 * tasks, renaming a stage or the board, adding a stage, editing the
 * description) each claim the board while open; every other way to change
 * the board waits until that change is saved or cancelled.
 */

import {createContext, useContext, useEffect, useRef} from 'react';

/**
 * @type {!React.Context<{active: ?string, begin: function(string): boolean,
 *     end: function(string)}>} Outside a board, nothing is ever locked.
 */
export const BoardOperationContext = createContext({
  active: null,
  begin: () => true,
  end: () => {},
});

export const OPERATION_HINT = 'Finish or cancel the current change first.';

/**
 * @param {?string=} key Identifies the change this component starts, e.g.
 *     `add-task:12`. Omit it for components that only need to know whether
 *     the board is locked.
 * @return {{
 *   locked: boolean,
 *   mine: boolean,
 *   start: function(): boolean,
 *   stop: function(),
 * }} `locked` is true while any change is open (including this one, so
 *     structural controls stay off); `mine` while this component's own
 *     change is open; `start` returns false if another change is open.
 */
export function useBoardOperation(key = null) {
  const {active, begin, end} = useContext(BoardOperationContext);
  // Release the lock if this component goes away mid-change (e.g. its
  // stage was deleted by someone else).
  const endRef = useRef(end);
  useEffect(() => {
    endRef.current = end;
  });
  useEffect(() => () => key && endRef.current(key), [key]);
  return {
    locked: active !== null,
    mine: key !== null && active === key,
    start: () => begin(key),
    stop: () => end(key),
  };
}
