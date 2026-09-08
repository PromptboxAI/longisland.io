/**
 * One publication state for a placement, instead of three.
 *
 * The database keeps three: the section's status, each item's status, and the
 * status of whatever the item points at. That is a reasonable schema and it is
 * staying. What it must not do is reach the editor, who was being asked to hold
 * all three in their head and reconcile them — which produced the state that
 * started this work: "1 item · 0 published" on a placement whose section said
 * Published and whose ranking said Published, with an empty homepage.
 *
 * Nobody should have to debug that. So the three collapse into two answers:
 *
 *   LIVE               readers can see this placement's content right now
 *   CHANGES NOT LIVE   there is something here readers are not seeing yet
 *
 * and one action makes the second become the first.
 *
 * The rule for LIVE is deliberately strict: the section is published, at least
 * one item is published, and that item points at something published. Anything
 * less is "not live", because from a reader's side it IS not live, and a status
 * that is technically true but practically false is exactly what caused the
 * confusion.
 */

export type PlacementState = "live" | "changes_not_live" | "empty";

export interface PlacementItemState {
  itemStatus: string;
  /** The status of the ranking, product, article the item points at. */
  targetStatus: string | null;
}

export interface PlacementStatus {
  state: PlacementState;
  /** Items a reader can actually see. */
  liveCount: number;
  /** Items held back — by their own status or their target's. */
  pendingCount: number;
  /**
   * Why something is not live, in an editor's words.
   *
   * Named rather than counted: "2 not live" sends someone hunting, while "one
   * points at a draft product" tells them what to do.
   */
  reasons: string[];
}

export function readPlacementState(
  sectionStatus: string,
  items: PlacementItemState[],
): PlacementStatus {
  if (items.length === 0) {
    return { state: "empty", liveCount: 0, pendingCount: 0, reasons: [] };
  }

  const live = items.filter(
    (item) => item.itemStatus === "published" && item.targetStatus === "published",
  );

  const reasons: string[] = [];

  if (sectionStatus !== "published") {
    reasons.push("This placement is not switched on yet.");
  }

  const heldByItem = items.filter(
    (item) => item.itemStatus !== "published" && item.targetStatus === "published",
  ).length;
  if (heldByItem > 0) {
    reasons.push(
      `${heldByItem} ${heldByItem === 1 ? "item has" : "items have"} not been made live yet.`,
    );
  }

  const heldByTarget = items.filter(
    (item) => item.targetStatus !== null && item.targetStatus !== "published",
  ).length;
  if (heldByTarget > 0) {
    reasons.push(
      `${heldByTarget} ${heldByTarget === 1 ? "points" : "point"} at content that is still a draft. Publish that content and it will appear.`,
    );
  }

  const sectionLive = sectionStatus === "published";
  const state: PlacementState =
    sectionLive && live.length === items.length && reasons.length === 0
      ? "live"
      : "changes_not_live";

  return {
    state,
    liveCount: sectionLive ? live.length : 0,
    pendingCount: items.length - (sectionLive ? live.length : 0),
    reasons,
  };
}

/**
 * The word on the button, per placement.
 *
 * "Update" is wrong for a single slot — you are not updating the Primary
 * Feature, you are setting it — and a generic "Save" says nothing about what
 * happens to the homepage.
 */
export function placementActionLabel(placementName: string, singleSlot: boolean): string {
  return singleSlot ? `Set as ${placementName}` : `Update ${placementName}`;
}
