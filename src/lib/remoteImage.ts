/** Remote files are already hosted. Skip the platform image resizer so a quota block cannot hide them. */
export function remoteImageProps(src: string | null | undefined): { unoptimized: boolean } {
  return { unoptimized: typeof src === 'string' && /^https?:\/\//.test(src) };
}
