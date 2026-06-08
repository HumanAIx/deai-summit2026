'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  content: string;
  className?: string;
}

function autoLinkUrls(text: string): string {
  const urlRegex = /(?<!\]\()(?<!\[)https?:\/\/[^\s<>\[\]()]+/g;
  return text.replace(urlRegex, (url) => `[${url}](${url})`);
}

export default function Markdown({ content, className = 'blog-prose' }: MarkdownProps) {
  if (!content) return null;

  const processedContent = autoLinkUrls(content);

  return (
    <div className={`${className} break-words overflow-hidden`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{processedContent}</ReactMarkdown>
    </div>
  );
}
