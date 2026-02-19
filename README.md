# DeAI Summit 2026 - Conference OS

Welcome to the **DeAI Summit 2026** landing page project. This codebase is designed as a "Conference OS"—a data-driven, reusable architecture where the entire site's content is managed via a central configuration file.

## 🚀 Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- npm or yarn

### Installation
```bash
npm install
```

### Development
Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the site.

---

## 🛠 Project Architecture

This project follow a modular, configuration-first approach:

### 1. Central Configuration (CRITICAL)
The entire site is controlled by:
- **`src/config/site.ts`**: This is where you edit text, images, speaker lists, and navigation links. 
- **`src/config/types.ts`**: Contains the TypeScript interfaces for the site configuration.

> [!IMPORTANT]
> **Always edit `src/config/site.ts` to update content.** Do not create duplicate `site.ts` files in the root `src/` directory, as they will be ignored by the build.

### 2. Components
Located in `src/components/`, these are reusable UI blocks:
- `Hero.tsx`: Main landing section.
- `AboutVideo.tsx`: The "What is DeAI Summit" section with video/gallery.
- `Speakers.tsx` & `LeadingVoices.tsx`: Speaker display components.
- `SceneHighlights.tsx`: Interactive image hotspots.
- `Marquee.tsx`: Scrolling partner/logo bar.

### 3. Styling
- **Tailwind CSS**: All styling is handled via Tailwind utility classes.
- **`tailwind.config.ts`**: Contains brand-specific colors (`brand-blue`, `brand-cyan`, etc.) and custom animations.

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory and add the following:
```env
# Resend Configuration
RESEND_API_KEY=re_your_api_key
RESEND_FROM_NAME=DeAI Summit
RESEND_FROM_EMAIL=contact@deaisummit.com
RESEND_TO_EMAIL=contact@deaisummit.com
```

### 4. Logic & State
- **`src/app/page.tsx`**: The main entry point that passes the `siteConfig` data down to the components.

---

## 📝 How to Edit

| Target | Action |
| :--- | :--- |
| **Speaker List** | Update the `speakers` array in `src/config/site.ts`. |
| **Hero Content** | Edit the `hero` object in `src/config/site.ts`. |
| **Partner Logos** | Update the `partners` array in `src/config/site.ts`. |
| **Site Colors** | Modify constants in `tailwind.config.ts`. |
| **New Section** | Create a component in `src/components/` and add it to `src/app/page.tsx`. |

---

## 🌐 Domain Verification

To make emails work from `contact@deaisummit.org`, the domain ownership must be verified in the Resend dashboard:

1.  Log in to the [Resend Dashboard](https://resend.com/domains).
2.  Add `deaisummit.org` as a domain.
3.  Add the DNS records provided by Resend to your domain provider (e.g., Squarespace).
4.  Once the status turns to **"Verified"**, the contact forms will start working immediately.
