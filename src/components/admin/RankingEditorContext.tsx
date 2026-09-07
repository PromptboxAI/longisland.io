"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Shares the title being typed between the details form and the page header.
 *
 * Without this the header keeps showing the saved title while the field below
 * shows a different one, and the editor looks like it is editing two records.
 * The header is rendered on the server, so a context provider wrapping both is
 * the way the value reaches it.
 *
 * Only the title lives here. Everything else the header shows — status, slug —
 * is either not editable inline or should not follow a keystroke.
 */

const RankingTitleContext = createContext<{
  title: string;
  setTitle: (title: string) => void;
} | null>(null);

export function RankingEditorProvider({
  initialTitle,
  children,
}: {
  initialTitle: string;
  children: ReactNode;
}) {
  const [title, setTitle] = useState(initialTitle);

  return (
    <RankingTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </RankingTitleContext.Provider>
  );
}

export function useRankingTitle() {
  const context = useContext(RankingTitleContext);
  if (!context) {
    throw new Error("useRankingTitle must be used inside RankingEditorProvider");
  }
  return context;
}

/** The page heading, following the title field as it is typed. */
export function RankingLiveTitle({ fallback }: { fallback: string }) {
  const { title } = useRankingTitle();
  return (
    <h1 className="text-2xl font-extrabold text-navy-900">
      {title.trim() || fallback}
    </h1>
  );
}
