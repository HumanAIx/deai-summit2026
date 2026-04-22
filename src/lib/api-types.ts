// Types matching ep-api response shapes

export interface PersonCompany {
  company_id: string;
  company_name?: string;
  company_slug?: string;
  company_logo?: string;
  company_website?: string;
  is_founder?: boolean;
  person_job_title?: string;
}

export interface PersonSocials {
  linkedin?: string;
  x?: string;
  twitter?: string;
  telegram?: string;
  github?: string;
  youtube?: string;
  discord?: string;
  facebook?: string;
  instagram?: string;
  mastodon?: string;
  medium?: string;
  meetup?: string;
  luma?: string;
  tiktok?: string;
}

export interface Member {
  id: string;
  person_firstname: string;
  person_surname: string;
  person_title?: string;
  person_slug: string;
  person_bio?: string;
  speaker_bio?: string;
  person_photo?: string;
  person_photo_nobg?: string;
  person_website?: string;
  person_socials?: PersonSocials;
  person_companies?: PersonCompany[];
  is_speaker: boolean;
  is_speaker_featured: boolean;
  is_speaker_published: boolean;
  is_team_member: boolean;
  is_vip: boolean;
  is_published: boolean;
  tenant_id: string;
  seo?: SEOSettings;
}

export interface CompanySocials {
  linkedin?: string;
  x?: string;
  twitter?: string;
  telegram?: string;
  github?: string;
  youtube?: string;
  discord?: string;
  facebook?: string;
  instagram?: string;
  meetup?: string;
  luma?: string;
  tiktok?: string;
}

export interface Company {
  id: string;
  company_name: string;
  company_slug: string;
  company_bio?: string;
  company_logo?: string;
  company_thumbnail?: string;
  company_website?: string;
  company_email?: string;
  company_phone?: string;
  company_address?: string;
  company_city?: string;
  company_country?: string;
  company_google_maps?: string;
  company_socials?: CompanySocials;
  company_is_sponsor: boolean;
  company_is_venue: boolean;
  company_is_supporter: boolean;
  company_is_partner: boolean;
  company_published: boolean;
  sponsor_published: boolean;
  venue_published: boolean;
  supporter_published: boolean;
  partner_published: boolean;
  company_embedded_youtube?: string;
  company_youtube_videos?: unknown[];
  venue_photo?: string;
  logo_background_white?: boolean;
  company_logo_has_dark_bg?: boolean;
  brochure_url?: string;
  tenant_id: string;
  seo?: SEOSettings;
}

export interface SEOSettings {
  id?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_type?: string;
  robots_tag?: string;
  canonical_url?: string;
  structured_data?: Record<string, unknown>;
}

export interface NormalizedSpeaker {
  id: string;
  name: string;
  title?: string;
  slug: string;
  role: string;
  company: string;
  image: string;
  bio?: string;
  website?: string;
  socials?: PersonSocials;
  companies?: PersonCompany[];
  isFeatured: boolean;
}

export interface NormalizedSponsor {
  id: string;
  name: string;
  slug: string;
  logo: string;
  bio?: string;
  website?: string;
  socials?: CompanySocials;
  isSponsor: boolean;
  isPartner: boolean;
  logoHasDarkBg?: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
}

// Navigation API types

export interface NavAPIItem {
  slug: string;
  label: string;
  published: boolean;
}

export interface NavAPICustomLink {
  id: string;
  url: string;
  label: string;
  style: string;
  target: string;
}

export interface NavigationAPIData {
  mainNav: NavAPIItem[];
  footerCol1: NavAPIItem[];
  footerCol2: NavAPIItem[];
  footerCol3: NavAPIItem[];
  footerCol4?: NavAPIItem[];
  footerBuilder?: {
    description?: string;
    headerCustomLinks?: NavAPICustomLink[];
    footerColLabels?: Record<string, string>;
    collectionItems?: { title: string; description: string }[];
    [key: string]: unknown;
  };
}

// CMS Page types

export interface CMSBlock {
  id: string;
  type: string;
  addon?: string;
  content?: string;
  title?: string;
  subtitle?: string;
  listType?: string;
  membersListType?: string;
  listLimit?: number;
  items?: CMSSpeakerItem[];
  buttons?: CMSButton[];
  [key: string]: unknown;
}

export interface CMSButton {
  label: string;
  link?: string;
  action?: string;
  formId?: string;
}

export interface CMSSpeakerItem {
  id: string;
  person_firstname: string;
  person_surname: string;
  person_title?: string;
  person_slug: string;
  person_bio?: string;
  person_photo?: string;
  person_photo_nobg?: string;
  person_socials?: PersonSocials;
  is_published?: boolean;
  is_speaker?: boolean;
  is_speaker_featured?: boolean;
  avatar_seed?: string | null;
}

export interface CMSCompanyItem {
  id: string;
  company_name: string;
  company_slug: string;
  company_bio?: string;
  company_logo?: string;
  company_country?: string;
  company_socials?: CompanySocials;
  logo_background_white?: boolean;
  company_is_venue?: boolean;
  venue_published?: boolean;
  company_logo_has_dark_bg?: boolean;
  company_published?: boolean;
  company_is_sponsor?: boolean;
  sponsor_published?: boolean;
  company_is_partner?: boolean;
  partner_published?: boolean;
}

export interface CMSFormFieldChoice {
  label: string;
  value: string;
}

export interface CMSFormField {
  id: string;
  name: string;
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  settings?: {
    choices?: CMSFormFieldChoice[];
  };
}

export interface CMSFormConfig {
  id: string;
  form_name: string;
  form_slug: string;
  form_description?: string;
  form_fields: CMSFormField[];
}

export interface CMSPageData {
  id?: string;
  page_type: string;
  page_slug: string;
  page_title: string;
  published: boolean;
  content: {
    blocks: CMSBlock[];
    blockOrder?: string[];
    formConfigs?: Record<string, CMSFormConfig>;
  };
  seo?: SEOSettings;
}
