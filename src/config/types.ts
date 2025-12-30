export interface HeroConfig {
    backgroundImage: string;
    badge: string;
    headline: string;
    subheadline: string;
    location: string;
    date: string;
    ctaPrimary: {
        label: string;
        link: string;
    };
    ctaSecondary: {
        label: string;
        link: string;
    };
}

export interface NavigationItem {
    label: string;
    href: string;
}

export interface NavigationConfig {
    main: NavigationItem[];
    legal: string[];
    actionButton: {
        label: string;
        link: string;
    };
    contactEmail: string;
    socialsLink: string;
}

export interface Speaker {
    id: number;
    name: string;
    role: string;
    image: string;
}

export interface LeadingVoice {
    name: string;
    role: string;
    company: string;
    image: string;
    icon: string;
}

export interface SpeakersConfig {
    featured: Speaker[];
    leading: LeadingVoice[];
}

export interface StatItem {
    number: string;
    label: string;
}

export interface MarqueeItem {
    label: string;
    iconType: string;
}

export interface AboutConfig {
    sectionTitle: string;
    coverImage: string;
    badge: string;
    overlayTitle: string;
    galleryLabel: string;
    mainStatement: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
}

export interface HighlightsHotspot {
    id: string;
    title: string;
    subtitle: string;
    position: {
        top?: string;
        left?: string;
        right?: string;
        bottom?: string;
        mdLeft?: string;
        lgLeft?: string;
        mdRight?: string;
        lgRight?: string;
        mdTop?: string;
        mdBottom?: string;
    };
    type: 'left-aligned' | 'center' | 'right-aligned';
}

export interface HighlightsConfig {
    backgroundImage: string;
    hotspots: HighlightsHotspot[];
}

export interface NetworkingItem {
    id: number;
    title: string;
    description: string;
    icon: string;
    image: string;
}

export interface PartnerItem {
    name: string;
    logo: string;
}

export interface FooterConfig {
    brandDescription: string;
    stats: {
        value: string;
        label: string;
    }[];
    socials: {
        twitter: string;
        linkedin: string;
        youtube: string;
    };
    copyright: string;
}

export interface SiteConfig {
    hero: HeroConfig;
    navigation: NavigationConfig;
    speakers: SpeakersConfig;
    stats: StatItem[];
    marquee: MarqueeItem[];
    about: AboutConfig;
    highlights: HighlightsConfig;
    networking: NetworkingItem[];
    partners: PartnerItem[];
    footer: FooterConfig;
}
