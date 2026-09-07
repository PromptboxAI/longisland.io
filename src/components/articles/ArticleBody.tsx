import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

/**
 * Renders an article's markdown body.
 *
 * Sanitised, not because staff authors are untrusted but because the cost of
 * being wrong about that is script execution on our own domain. `rehypeSanitize`
 * strips raw HTML rather than passing it through, so a stray tag becomes visible
 * text — a mistake an editor can see and fix, instead of one nobody notices.
 *
 * Styling comes from `.prose-editorial`, the same class the guide intros and
 * legal pages use, so an article reads as the same publication as everything
 * around it rather than as a page from a different site.
 */
export function ArticleBody({ markdown }: { markdown: string | null }) {
  if (!markdown || markdown.trim().length === 0) return null;

  return (
    <div className="prose-editorial max-w-none text-[17px] leading-[1.75]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h2: (props) => (
            <h2
              className="headline mt-10 text-2xl text-navy-900 first:mt-0"
              {...props}
            />
          ),
          h3: (props) => (
            <h3 className="mt-8 text-lg font-semibold text-navy-900" {...props} />
          ),
          blockquote: (props) => (
            <blockquote
              className="my-6 border-l-4 border-gold-400 bg-sand-50 py-3 pl-5 pr-4 text-ink-700"
              {...props}
            />
          ),
          // Every outbound link opens in place; nothing here is monetised, so
          // no sponsored/nofollow treatment is warranted or honest.
          a: (props) => <a className="text-brand-600 underline" {...props} />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
