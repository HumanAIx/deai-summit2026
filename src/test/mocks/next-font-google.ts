/** `next/font/google` needs the Next.js build's SWC loader; vitest has none, so it is aliased to this stub. */
const font = (options: { variable?: string } = {}) => ({ className: '', variable: options.variable ?? '', style: { fontFamily: 'mock' } });

export const IBM_Plex_Mono = font;
export default font;
