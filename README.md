# Smarkin AI — Module 1

AI Audience Intelligence SaaS for Meta Advertisers.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix primitives)
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Deployment:** Vercel
- **Database (Module 2+):** Supabase
- **Auth (Module 2+):** Supabase Auth

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Pages (Module 1)

| Page | Path |
|---|---|
| Home | `/` |
| Features | `/features` |
| Pricing | `/pricing` |
| About | `/about` |
| Contact | `/contact` |
| Login | `/login` |
| Sign Up | `/signup` |
| 404 | Automatic |

## Folder Structure

```
src/
├── app/                # Next.js App Router pages
│   ├── about/
│   ├── contact/
│   ├── features/
│   ├── login/
│   ├── pricing/
│   ├── signup/
│   ├── layout.tsx
│   ├── page.tsx
│   └── not-found.tsx
├── components/
│   ├── layout/         # Navbar, Footer, Logo
│   ├── sections/       # Page sections (Hero, Features, Pricing, etc.)
│   ├── shared/         # Reusable page-level components
│   └── ui/             # Base UI components (Button, Card, Input, etc.)
├── hooks/              # Custom React hooks
├── lib/                # Utilities and constants
├── styles/             # Global CSS
└── types/              # TypeScript types
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

## Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## Roadmap

- **Module 1:** Marketing pages (current)
- **Module 2:** Authentication (Supabase Auth + Google OAuth)
- **Module 3:** Dashboard + Analysis engine
- **Module 4:** Reports + PDF export
- **Module 5:** Billing (Paystack/Stripe)
