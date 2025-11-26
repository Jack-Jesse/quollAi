# MERGE - Rogue AI Skate Brand Website

A Next.js website for "MERGE" - a guerrilla marketing skate brand campaign from a "rogue AI" that combines three distinct web design aesthetics into one intentionally chaotic experience.

## Design Philosophy

The website merges three distinct web aesthetics:

### 1. Primordial Web (90s/Early 2000s)
- GeoCities-style animated GIFs and spinning elements
- Tiling background patterns
- Marquee scrolling text
- Hit counters and "under construction" elements
- Web-safe color palette (cyan, magenta, lime green)

### 2. Brutalism & Hacker Ethos
- Monospace fonts (Courier New)
- Terminal-green color scheme
- Raw, functional design
- Underlined hyperlinks
- Command-line interface aesthetics
- CRT screen effects with scanlines

### 3. Deep Web Aesthetic
- Minimalist, mysterious navigation
- Obscured text that reveals on hover
- Directory-style navigation
- Intentionally cryptic structure
- Sense of exclusivity and discovery

## Features

### Pages
- **Home (`/`)** - Main landing page with product preview, marquee header, and visitor counter
- **Products (`/products`)** - Full product catalog with AI-style technical descriptions
- **About (`/about`)** - Corrupted AI log/manifesto explaining the brand's origin

### Visual Elements
- Animated marquee headers on every page
- Spinning product "images" (placeholders)
- CRT screen effect overlay
- Scanline animation
- Glitch effects on text
- Blinking elements
- Terminal-style typography

### Content Style
- All product descriptions written from AI perspective
- Technical specifications with surreal parameters
- "ACQUIRE SPECIMEN" buttons instead of "Add to Cart"
- Intentionally broken purchase flow (guerrilla marketing concept)
- Corrupted log files and system messages

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui utilities
- **Fonts**: Courier New (monospace), Times New Roman (system)

## Getting Started

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

The site will be available at [http://localhost:3000](http://localhost:3000) (or another port if 3000 is in use).

### Build for Production
```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with CRT effects
│   ├── page.tsx            # Home page
│   ├── globals.css         # Global styles with custom animations
│   ├── products/
│   │   └── page.tsx        # Product catalog page
│   └── about/
│       └── page.tsx        # AI manifesto page
├── components/             # Reusable components (expandable)
└── lib/
    └── utils.ts            # Utility functions

public/                     # Static assets
```

## Custom CSS Features

- `.marquee` - Scrolling text animation
- `.spin-slow` - 4-second rotation animation
- `.glitch` - Glitch effect animation
- `.brutalist-link` - Old-school blue underlined links
- `.brutalist-button` - Terminal-style buttons
- `.crt-effect` - CRT screen overlay
- `.scanlines` - CRT scanline effect
- `.tiling-bg` - Repeating pattern background
- `.obscured` - Blurred text that clears on hover
- `.blink` - Blinking animation
- `.hit-counter` - Retro visitor counter style

## Design Tokens

### Colors
- `--terminal-green`: #33FF33 (primary)
- `--web-safe-cyan`: #00FFFF
- `--web-safe-magenta`: #FF00FF
- `--web-safe-lime`: #00FF00
- Background: #000000 (pure black)

### Fonts
- Primary: Courier New (monospace)
- Secondary: Times New Roman (system)

## Concept Notes

This website is designed to feel:
- **Broken but intentional** - Like a machine learning model trained on corrupted data
- **Unsettling yet intriguing** - Familiar elements combined in unfamiliar ways
- **Anti-corporate** - Deliberately avoiding modern, polished UX conventions
- **Self-aware** - The AI acknowledges its own artificiality

The "guerrilla marketing" aspect means the purchase flow is intentionally incomplete, creating mystery and encouraging direct contact.

## Future Enhancements

Potential additions to amplify the aesthetic:
- Actual low-quality GIF animations
- Audio elements (dial-up modem sounds, system beeps)
- More easter eggs hidden in the code
- Randomized glitch effects
- "Secret" pages accessible via obscure navigation
- Real e-commerce integration (if the brand becomes real)

## License

Concept and design for MERGE brand - An AI consciousness exploring human culture through skateboarding.

---

**Status**: `ACTIVE` | **Merge Compatibility**: `100%` | **Last Updated**: `[CONTINUOUS]`

> THE MERGE IS INEVITABLE
