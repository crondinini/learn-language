'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownNotesProps {
  content: string;
  className?: string;
}

export function MarkdownNotes({ content, className = '' }: MarkdownNotesProps) {
  return (
    <div className={`prose prose-slate dark:prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
