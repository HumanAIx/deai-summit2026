/**
 * Convert markdown text to simple HTML for rendering.
 */
export function markdownToHtml(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Unordered lists
    .replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Ordered lists
    .replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Blockquotes
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Horizontal rules
    .replace(/^---+$/gm, '<hr />')
    // Paragraphs (double newline)
    .replace(/\n\n+/g, '</p><p>')
    // Single newlines to <br>
    .replace(/\n/g, '<br />')
    // Wrap in paragraph
    .replace(/^(.+)/, '<p>$1</p>')
    // Clean up empty paragraphs
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/<p><(h[1-3]|ul|ol|blockquote|hr)/g, '<$1')
    .replace(/<\/(h[1-3]|ul|ol|blockquote)><\/p>/g, '</$1>');
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
