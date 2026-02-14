'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownNotesProps {
  content: string;
  className?: string;
}

export function MarkdownNotes({ content, className = '' }: MarkdownNotesProps) {
  return (
    <div className={`prose prose-slate dark:prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Style links to be visible in both light and dark mode
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-sky-400 hover:underline"
            >
              {children}
            </a>
          ),
          // Keep paragraphs compact
          p: ({ children }) => <p className="my-1">{children}</p>,
          // Style lists
          ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
          li: ({ children }) => <li className="my-0">{children}</li>,
          // Style code
          code: ({ children }) => (
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 text-sm">
              {children}
            </code>
          ),
          // Style bold and italic
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          // Style tables
          table: ({ children }) => (
            <table className="my-2 border-collapse text-sm">
              {children}
            </table>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 dark:bg-slate-800">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-300 dark:border-slate-600 px-2 py-1">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
