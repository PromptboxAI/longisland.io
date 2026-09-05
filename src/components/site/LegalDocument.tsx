import type { ReactNode } from "react";

/**
 * Shared rendering for the long-form legal pages (terms, privacy). The copy
 * itself lives in each page so those files stay the single source of truth.
 */
export type LegalBlock =
  | { type: "p"; text: ReactNode }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

/** Stable anchor ids so the table of contents and shared links keep working. */
export function legalSectionId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function LegalTableOfContents({ sections }: { sections: LegalSection[] }) {
  return (
    <nav
      aria-label="Table of contents"
      className="mt-8 rounded-card border border-line bg-sand-50 p-5"
    >
      <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">
        Contents
      </h2>
      <ol className="mt-3 grid list-decimal gap-x-6 gap-y-1.5 pl-5 text-sm text-brand-600 sm:grid-cols-2">
        {sections.map((section) => (
          <li key={section.heading}>
            <a href={`#${legalSectionId(section.heading)}`} className="hover:underline">
              {section.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <div className="prose-editorial mt-2 text-[15px]">
      {blocks.map((block, index) => {
        if (block.type === "h3") {
          return (
            <h3
              key={index}
              className="mt-6 text-sm font-bold uppercase tracking-wide text-navy-900"
            >
              {block.text}
            </h3>
          );
        }

        if (block.type === "ul") {
          return (
            <ul key={index}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "ol") {
          return (
            <ol key={index} className="mt-4 list-decimal space-y-1.5 pl-5">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          );
        }

        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}

/** Numbered sections, matching the numbering used in the source documents. */
export function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="mt-10 space-y-8">
      {sections.map((section, index) => (
        <section
          key={section.heading}
          id={legalSectionId(section.heading)}
          className="scroll-mt-24"
        >
          <h2 className="text-lg font-bold text-navy-900">
            {index + 1}. {section.heading}
          </h2>
          <LegalBlocks blocks={section.blocks} />
        </section>
      ))}
    </div>
  );
}
