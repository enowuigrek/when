"use client";

import { createContext, useContext } from "react";

/**
 * The time a booking is being dragged to, read by the card inside the drag.
 *
 * The drag knows the new time; the card owns the label that states it. They are
 * separate components because one handles a gesture and the other is markup
 * reused elsewhere, and a server component sits between them — so the value
 * travels by context rather than as a prop.
 *
 * Null means nothing is being dragged and the card shows its real time.
 */
export const DragTimeContext = createContext<string | null>(null);

export function useDragTime(): string | null {
  return useContext(DragTimeContext);
}
