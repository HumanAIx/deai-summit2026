/** Map dashboard social platform keys → Remix Icon classes for the public site. */
export function getRemixIcon(key: string): string {
  const map: Record<string, string> = {
    linkedin: 'ri-linkedin-fill',
    x: 'ri-twitter-x-fill',
    twitter: 'ri-twitter-x-fill',
    youtube: 'ri-youtube-fill',
    github: 'ri-github-fill',
    gitlab: 'ri-gitlab-fill',
    telegram: 'ri-telegram-fill',
    discord: 'ri-discord-fill',
    facebook: 'ri-facebook-circle-fill',
    instagram: 'ri-instagram-fill',
    tiktok: 'ri-tiktok-fill',
    medium: 'ri-medium-fill',
    meetup: 'ri-community-fill',
    luma: 'ri-calendar-event-fill',
  };
  return map[key] || 'ri-link';
}

export interface PublicSocialLink {
  key: string;
  label: string;
  url: string;
  icon?: string;
  color?: string;
}

export function normalizePublicSocialLinks(socials: PublicSocialLink[]): PublicSocialLink[] {
  return socials
    .filter((s) => s.url?.trim())
    .map((s) => ({
      ...s,
      icon: getRemixIcon(s.key),
    }));
}
