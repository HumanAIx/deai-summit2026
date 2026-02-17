import { SiteConfig } from './types';

export const siteConfig: SiteConfig = {
    hero: {
        backgroundImage: "https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2070&auto=format&fit=crop",
        badge: "Malta Edition 2026",
        headline: "The Global Inflection Point for AI Governance",
        subheadline: "Where frontier AI, decentralized systems, and global regulators confront the future of intelligence.",
        location: "Valletta, Malta",
        date: "November 2026",
        ctaPrimary: {
            label: "Join the Waitlist",
            link: "#"
        },
        ctaSecondary: {
            label: "Apply to Be a Speaker",
            link: "#"
        },
        ctaTertiary: {
            label: "Become a Sponsor",
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
                name: "Prof. Joshua Ellul",
                role: "Associate Professor",
                company: "University of Malta",
                image: "/Joshua Ellul.jpg",
                icon: "ri-links-line"
            }, {
                name: "Prof. André Xuereb",
                role: "Full Professor of Physics",
                company: "University of Malta",
                image: "/André Xuereb.jpg",
                icon: "ri-atom-line"
            },
            {
                name: "Dr. Xue (Steve) Liu",
                role: "Assoc. VP of Research",
                company: "MBZUAI",
                image: "/Steve-Liu_main1.jpg",
                icon: "ri-brain-line"
            },

            {
                name: "Dr. Aaron Farrugia",
                role: "Founder",
                company: "Economiq Ltd",
                image: "/Dr. Aaron Farrugia.jpg",
                icon: "ri-government-line"
            },
            {
                name: "Prof. Alexiei Dingli",
                role: "Full Professor of Applied AI",
                company: "University of Malta",
                image: "/Prof. Alexiei Dingli.jpg",
                icon: "ri-robot-line"
            }
        ]
    },
    stats: {
        quote: {
            text: "A deliberately capped convening of the people shaping AI’s next decade.",
            author: "DeAI Summit",
            role: "Organizing Committee",
            image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop"
        },
        items: [
            {
                number: "10,000",
                label: "Hand-selected delegates from over 40 countries."
            },
            {
                number: "$50B+",
                label: "Assets represented by funds actively deploying into AI infrastructure."
            },
            {
                number: "100+",
                label: "International journalists and policy media present."
            },
            {
                number: "67+",
                label: "Speakers across frontier AI, decentralized systems, policy, and academia."
            },
            {
                number: "100+",
                label: "Participating companies across AI, Web3, enterprise, and research."
            }
        ]
    },
    marquee: [
        { label: "NEO", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb3cd_neo_color_dark.avif" },
        { label: "OORT", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb3a6_oort-1.avif" },
        { label: "XYO", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb3a2_xyo-1.avif" },
        { label: "IO.NET", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb39e_io-1.avif" },
        { label: "YGG", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb39a_ygg-1.avif" },
        { label: "SUPERMOON", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb394_moon-1.avif" },
        { label: "DeTaSECURE", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb397_dc-1.avif" },
        { label: "HOLO", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb3ac_holo.avif" },
        { label: "UNYT", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb38c_units-1.svg" },
        { label: "AI.KIDO", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb38d_kiddo-1.avif" },
        { label: "OASIS", logo: "https://cdn.prod.website-files.com/684bd887005afeaa302406a0/684bd926581b01cf841eb385_oasis-1.avif" }
    ],
    about: {
        sectionTitle: "What is DeAI Summit?",
        coverImage: "https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?q=80&w=2070&auto=format&fit=crop",
        badge: "Live from Valletta 2026",
        overlayTitle: "Forging the next era of Intelligence",
        galleryLabel: "Summit Keynote Gallery",
        mainStatement: "As AI regulation accelerates globally and centralized models face mounting challenges around trust, compliance, and control, DeAI Summit convenes a forum where frontier AI labs, decentralized AI ecosystems, and policymakers confront these questions together.",
        description: "We strip away noise, optics, and performative panels. What remains is focused dialogue, structured disagreement, and outcomes that shape how AI is governed, built, and deployed.",
        bulletPoints: [
            "A neutral, sovereign forum inside the EU for AI governance debate.",
            "Direct dialogue between frontier labs, decentralized networks, and regulators.",
            "Serious technical and policy discourse without PR theater.",
            "A setting where disagreement is expected, structured, and productive."
        ],
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
            title: "Curated Seating",
            description: "Engineered seating arrangements based on shared technical, regulatory, or investment context.",
            icon: "ri-armchair-line",
            image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974&auto=format&fit=crop"
        },
        {
            id: 1,
            title: "Closed-Door Roundtables",
            description: "Small-group discussions under Chatham House rules for high-stakes governance and technical debates.",
            icon: "ri-discuss-line",
            image: "https://images.unsplash.com/photo-1519671482538-518b5c2eb061?q=80&w=2072&auto=format&fit=crop"
        },
        {
            id: 2,
            title: "Private Dinners",
            description: "Off-agenda evening gatherings enabling candid conversations between founders, frontier labs, and capital allocators.",
            icon: "ri-goblet-line",
            image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2664&auto=format&fit=crop"
        },
        {
            id: 3,
            title: "One-on-One Engagement",
            description: "Dedicated time and spaces for focused bilateral meetings throughout the summit.",
            icon: "ri-user-voice-line",
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
    closing: {
        statement: "AI has reached a global inflection point. Questions of transparency, accountability, safety, and governance are no longer theoretical. They are now shaping regulation, capital allocation, and the future of innovation itself.",
        description: "We find ourselves in the midst of the debate between the indiscriminate advance of AI in every aspect of life and the repercussions it will bring in the future. That inflection point will be the key point for the discussion in this summit. DeAI Summit is where those solutions are challenged, tested, and refined.",
        cta: "Join us in Malta",
        location: "Valletta, Malta"
    },
    footer: {
        brandDescription: "The premier gathering for the decentralized AI ecosystem. Malta 2026.",
        stats: [
            { value: "10K", label: "Delegates" },
            { value: "$50B+", label: "AUM" }
        ],
        socials: {
            twitter: "https://x.com/Human_AIx",
            linkedin: "https://www.linkedin.com/company/human-ai-x/posts/?feedView=all",
            youtube: "https://www.youtube.com/@Human_AIx"
        },
        copyright: "© 2026 DeAI Summit. Malta."
    }
};
