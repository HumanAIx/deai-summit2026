import { IBM_Plex_Mono } from 'next/font/google';

/** The mono face of DeAI's ticket look (kickers, labels); exposed as `--font-plex-mono` for `.deai-tickets`. */
export const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
});
