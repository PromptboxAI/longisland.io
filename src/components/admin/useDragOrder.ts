"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Drag-to-reorder for an admin list.
 *
 * Built on pointer events rather than HTML5 drag-and-drop, which does not fire
 * on touch at all — an editor working from a tablet would have found the
 * feature simply absent, with no way to tell it was meant to be there.
 *
 * The list reorders live under the pointer instead of showing a drop line: the
 * arrangement you are looking at when you let go is the one that saves, so
 * there is nothing to predict. Positions are written only on release, as one
 * call carrying the whole order — dragging row 1 to row 8 is one intent, not
 * seven swaps.
 *
 * This REPLACES nothing. The up/down buttons stay exactly as they were: they
 * are the keyboard and screen-reader path, and they are also the better tool
 * for nudging one row by one place. Dragging is the addition for long lists.
 */
export function useDragOrder<T extends { id: string }>(
  items: T[],
  commit: (orderedIds: string[]) => void | Promise<void>,
) {
  /** Preview order while a drag is in flight; null when idle. */
  const [order, setOrder] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const rows = useRef(new Map<string, HTMLElement>());
  /** The order as it stood when the drag began, to detect a no-op. */
  const startOrder = useRef<string[]>([]);

  const registerRow = useCallback((id: string, el: HTMLElement | null) => {
    if (el) rows.current.set(id, el);
    else rows.current.delete(id);
  }, []);

  const current = order ?? items.map((item) => item.id);

  /** The list in the order to render right now. */
  const ordered = current
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is T => item !== undefined);

  const onHandlePointerDown = useCallback(
    (id: string, event: React.PointerEvent) => {
      // Left button only; a right-click on a handle should open the menu.
      if (event.button !== 0) return;
      event.preventDefault();

      const ids = items.map((item) => item.id);
      startOrder.current = ids;
      setOrder(ids);
      setDraggingId(id);

      // Keeps the events coming even when the pointer outruns the row.
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [items],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!draggingId) return;
      event.preventDefault();

      const y = event.clientY;

      setOrder((previous) => {
        const list = previous ?? items.map((item) => item.id);
        const from = list.indexOf(draggingId);
        if (from === -1) return list;

        /*
         * The row whose midpoint the pointer has passed.
         *
         * Measuring live rects rather than assuming a uniform row height: these
         * lists mix a one-line link with a three-line product, and a fixed
         * step would drift further out with every row.
         */
        let to = from;
        for (const [index, id] of list.entries()) {
          const el = rows.current.get(id);
          if (!el) continue;
          const box = el.getBoundingClientRect();
          const middle = box.top + box.height / 2;
          if (index < from && y < middle) {
            to = index;
            break;
          }
          if (index > from && y > middle) to = index;
        }

        if (to === from) return list;

        const next = [...list];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    [draggingId, items],
  );

  const onPointerUp = useCallback(() => {
    if (!draggingId) return;
    setDraggingId(null);

    const finished = order;
    // Nothing moved: no write, and no toast claiming a change.
    if (!finished || finished.join() === startOrder.current.join()) {
      setOrder(null);
      return;
    }

    /*
     * The preview is held until the write settles and the refreshed props
     * arrive, then dropped so the list is prop-driven again. Releasing it
     * immediately would snap the rows back to their old order for the length of
     * the round trip, which reads as the drag having failed.
     *
     * Cleared on rejection too: a preview left standing after a failed write
     * would show an order the database does not have.
     */
    void Promise.resolve(commit(finished)).finally(() => setOrder(null));
  }, [commit, draggingId, order]);

  return {
    ordered,
    draggingId,
    registerRow,
    /** Spread onto each row's drag handle. */
    handleProps: (id: string) => ({
      onPointerDown: (event: React.PointerEvent) => onHandlePointerDown(id, event),
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      // Without this the browser claims the gesture for scrolling on touch.
      style: { touchAction: "none" as const },
    }),
  };
}
