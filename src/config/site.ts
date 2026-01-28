import { SiteConfig } from './types';

export const siteConfig: SiteConfig = {
    hero: {
        backgroundImage: "https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2070&auto=format&fit=crop",
        badge: "Malta Edition 2026",
        headline: "The Inflection point of AI",
        subheadline: "Where decentralized intelligence meets institutional capital.",
        location: "Valletta, Malta",
        date: "November 2026",
        ctaPrimary: {
            label: "JOIN WAITLIST",
            link: "#"
        },
        ctaSecondary: {
            label: "SPONSORSHIP DECK",
            link: "#"
        }
    },
    navigation: {
        main: [
            { label: "Agenda", href: "#agenda" },
            { label: "Speakers", href: "#leading-voices" },
            { label: "Sponsors", href: "#sponsors" }
        ],
        legal: [
            "Terms",
            "Privacy",
            "Code of Conduct"
        ],
        actionButton: {
            label: "Tickets",
            link: "#"
        },
        contactEmail: "contact@deaisummit.org",
        socials: {
            twitter: "https://x.com/Human_AIx",
            linkedin: "https://www.linkedin.com/company/humanaix/",
            youtube: "https://www.youtube.com/@HumanAIx"
        }
    },
    speakers: {
        featured: [
            {
                id: 1,
                name: "Sarah Jenkins",
                role: "CEO, EtherTrust",
                image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop"
            },
            {
                id: 2,
                name: "Marcus Reid",
                role: "CTO, BlockStream",
                image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop"
            },
            {
                id: 3,
                name: "Alex Thorne",
                role: "Founder, ChainPulse",
                image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop"
            },
            {
                id: 4,
                name: "Elena Rodriguez",
                role: "Lead Dev, Solana Core",
                image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"
            },
            {
                id: 5,
                name: "David Chen",
                role: "Partner, Sequoia",
                image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop"
            }
        ],
        leading: [
            {
                name: "Dr. Li",
                role: "Founder and CEO",
                company: "OORT",
                image: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/688a5d50582e13e9e031ca07_committee-01.avif",
                icon: "ri-user-line"
            },
            {
                name: "Dr. Mike O'Sullivan",
                role: "Senior Lecturer & Researcher",
                company: "University of Auckland",
                image: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/68a36e8409eabcf2d86afa40_mikeOSul_bw.jpeg",
                icon: "ri-user-line"
            },
            {
                name: "Dr. Abeer S. Al-Humaimeedy",
                role: "Vice Dean",
                company: "King Saud University",
                image: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/68a375b3fa03ae248f700e3d_image_bw.jpg",
                icon: "ri-user-line"
            },
            {
                name: "Sean Yang",
                role: "Co-Founder and CTO",
                company: "OORT",
                image: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/6883407e0abdffcdfaf30827_aix-team-01%20(1).avif",
                icon: "ri-user-line"
            },
            {
                name: "Michelle Tsing",
                role: "Founder",
                company: "Governance Research Institute",
                image: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/68acaf3450a2cc6a1f03e496_michelle_bw.png",
                icon: "ri-user-line"
            },
            {
                name: "James Kingstone",
                role: "Director DAO SPV",
                company: "CDOT",
                image: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/68a36d9c11a9dede6c588015_jameskings_bw.jpeg",
                icon: "ri-user-line"
            },
            {
                name: "Dr Ioannis Revolidis",
                role: "Director",
                company: "DLT Centre",
                image: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/68a73f43a75d2ee4d2075dfc_joannisrev_bw.jpeg",
                icon: "ri-user-line"
            },
            {
                name: "Tamaghna Basu",
                role: "Founder",
                company: "Detasecure",
                image: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/68a36d9cc07dd8f9ab8bd1ca_basu_bw.jpeg",
                icon: "ri-user-line"
            }
        ]
    },
    stats: {
        quote: {
            text: "HumanAIx is advancing the open infrastructure for decentralized AI — where compute, data, and intelligence are governed by the many, not the few.",
            author: "Roberts Daniel",
            role: "Marketing Director, Orbit",
            image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop"
        },
        items: [
            {
                number: "2,500+",
                label: "Capped and sold out attendees joining from over 40 countries."
            },
            {
                number: "$50B+",
                label: "Assets under management represented by attending funds."
            },
            {
                number: "96%",
                label: "Attendees report meeting a future partner or client."
            },
            {
                number: "150+",
                label: "International journalists covering the event live from the venue."
            },
            {
                number: "120+",
                label: "Leading voices shaping the future of digital assets."
            },
            {
                number: "1,200+",
                label: "Participating companies driving the ecosystem forward."
            }
        ]
    },
    marquee: [
        { label: "NEXUS", iconType: "diamond" },
        { label: "ORBITAL", iconType: "circle-dashed" },
        { label: "SYNTH", iconType: "square" },
        { label: "CORE", iconType: "circle-dot" },
        { label: "FLUX", iconType: "bracket" }
    ],
    about: {
        sectionTitle: "What is DeAI Summit?",
        coverImage: "https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?q=80&w=2070&auto=format&fit=crop",
        badge: "Live from Valletta 2026",
        overlayTitle: "Forging the next era of Intelligence",
        galleryLabel: "Summit Keynote Gallery",
        mainStatement: "At DeAI Summit, we don't run a conference; <span class=\"font-bold\">we build the room that matters.</span>",
        description: "We're stripping away the noise. No endless panels, no crowded halls—just the people you actually need to meet. We're turning Valletta's waterfront into a space designed for real conversation, where the next big breakthroughs in Decentralized AI will happen over dinner, not during a slide deck.",
        ctaPrimary: "Attend DeAI Summit",
        ctaSecondary: "Sponsor DeAI Summit"
    },
    highlights: {
        backgroundImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2069&auto=format&fit=crop",
        hotspots: [
            {
                id: "venue",
                title: "Mediterranean <br/>Conference Centre",
                subtitle: "Valletta | Malta",
                position: { top: "35%", left: "5%", mdLeft: "8%", lgLeft: "12%" },
                type: "left-aligned"
            },
            {
                id: "stage",
                title: "DeAI Main Stage 2026",
                subtitle: "",
                position: {
                    top: "12%",
                    mdTop: "15%",
                    left: "50%"
                },
                type: "center"
            },
            {
                id: "stats",
                title: "95% C-Level <br/> Founders",
                subtitle: "On Stage",
                position: {
                    bottom: "20%",
                    mdBottom: "25%",
                    right: "5%",
                    mdRight: "8%",
                    lgRight: "12%"
                },
                type: "right-aligned"
            }
        ]
    },
    networking: [
        {
            id: 0,
            title: "Knowledge Sharing",
            description: "Curated seating arrangements to ensure you meet the right people over world-class cuisine.",
            icon: "ri-restaurant-line",
            image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974&auto=format&fit=crop"
        },
        {
            id: 1,
            title: "VIP & Investor Dinners",
            description: "Exclusive evening gatherings connecting founders with capital in intimate, private settings.",
            icon: "ri-goblet-line",
            image: "https://images.unsplash.com/photo-1519671482538-518b5c2eb061?q=80&w=2072&auto=format&fit=crop"
        },
        {
            id: 2,
            title: "Expert Roundtables",
            description: "Deep-dive discussions on specific verticals led by industry pioneers in small groups.",
            icon: "ri-group-line",
            image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2664&auto=format&fit=crop"
        },
        {
            id: 3,
            title: "1-on-1 Networking",
            description: "Dedicated spaces and apps to facilitate high-value individual meetings throughout the summit.",
            icon: "ri-chat-3-line",
            image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2070&auto=format&fit=crop"
        }
    ],
    partners: [
        { name: "NEO", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb3cd_neo_color_dark.avif" },
        { name: "OORT", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb3a6_oort-1.avif" },
        { name: "XYO", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb3a2_xyo-1.avif" },
        { name: "IO.NET", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb39e_io-1.avif" },
        { name: "YGG", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb39a_ygg-1.avif" },
        { name: "SUPERMOON", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb394_moon-1.avif" },
        { name: "DeTaSECURE", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb397_dc-1.avif" },
        { name: "HOLO", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb3ac_holo.avif" },
        { name: "UNYT", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb38c_units-1.svg" },
        { name: "AI.KIDO", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb38d_kiddo-1.avif" },
        { name: "OASIS", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb385_oasis-1.avif" }
    ],
    footer: {
        brandDescription: "The premier gathering for the decentralized AI ecosystem. Malta 2026.",
        stats: [
            { value: "2.5K+", label: "Attendees" },
            { value: "$50B", label: "AUM" }
        ],
        socials: {
            twitter: "https://x.com/Human_AIx",
            linkedin: "https://www.linkedin.com/company/human-ai-x/posts/?feedView=all",
            youtube: "https://www.youtube.com/@Human_AIx"
        },
        copyright: "© 2026 DeAI Summit. Malta."
    }
};
