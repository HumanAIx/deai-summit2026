/**
 * Convert markdown text to simple HTML for rendering.
 */
export function markdownToHtml(text: string): string {
  // Split into blocks by double newline (or more)
  const blocks = text.split(/\n{2,}/);

  const htmlBlocks = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';

    // Headers
    if (trimmed.startsWith('### ')) return `<h3>${trimmed.slice(4)}</h3>`;
    if (trimmed.startsWith('## ')) return `<h2>${trimmed.slice(3)}</h2>`;
    if (trimmed.startsWith('# ')) return `<h1>${trimmed.slice(2)}</h1>`;

    // Horizontal rules
    if (/^---+$/.test(trimmed)) return '<hr />';

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      const content = trimmed.replace(/^>\s*/gm, '');
      return `<blockquote>${content}</blockquote>`;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(trimmed)) {
      const items = trimmed.split('\n')
        .map(line => line.replace(/^\s*[-*+]\s+/, ''))
        .map(item => `<li>${applyInlineFormatting(item)}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(trimmed)) {
      const items = trimmed.split('\n')
        .map(line => line.replace(/^\s*\d+\.\s+/, ''))
        .map(item => `<li>${applyInlineFormatting(item)}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    }

    // Regular paragraph — convert single newlines to <br>
    const lines = trimmed.split('\n').map(l => applyInlineFormatting(l)).join('<br />');
    return `<p>${lines}</p>`;
  });

  return htmlBlocks.filter(Boolean).join('\n');
}

function applyInlineFormatting(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Convert a YouTube URL (watch, short, embed) to an embed URL.
 * Returns null if the URL is not a valid YouTube URL.
 */
export function youtubeToEmbed(url: string): string | null {
  if (!url) return null;

  let videoId: string | null = null;

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) videoId = watchMatch[1];

  // youtu.be/VIDEO_ID
  if (!videoId) {
    const shortMatch = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (shortMatch) videoId = shortMatch[1];
  }

  // youtube.com/embed/VIDEO_ID (already embed)
  if (!videoId) {
    const embedMatch = url.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (embedMatch) videoId = embedMatch[1];
  }

  if (!videoId) return null;

  return `https://www.youtube.com/embed/${videoId}`;
}
