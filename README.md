<div align="center">

<img src="public/favicon.png" width="64" height="64" alt="Wab Logo" />

# Wab

### AI-Native Financial Operations & Audit Platform

**Your entire financial world, understood, monitored, and managed by AI.**

[![License: MIT](https://img.shields.io/badge/License-MIT-0B0C0E.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/Google-Gemini_2.0-4285F4.svg?style=flat-square&logo=google&logoColor=white)](https://aistudio.google.com/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)

[**Live Demo**](https://psxl.live) · [**Documentation**](#-documentation) · [**Quick Start**](#-quick-start) · [**Report a Bug**](https://github.com/Ahmadjamilofficial/wab/issues)

---

> Wab turns messy financial records into a clean, reconciled, audit-ready ledger
> using multimodal AI extraction and deterministic computation —
> replacing days of manual spreadsheet work with minutes.

</div>

---

## Table of Contents

- [Why Wab](#-why-wab)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Project Structure](#-project-structure)
- [AI Pipeline](#-ai-pipeline)
- [Tax Engine](#-tax-engine)
- [Pricing](#-pricing)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## Why Wab

Modern financial software is either too generic or too complex. **Traders, financiers, and individuals** need:

|| Pain Point | What Wab Does |
||---|---|
|| Broker slips in PDF, photo, CSV formats | Multimodal AI extracts every field with confidence scoring |
|| Manual tax calculation across FIFO lots | Deterministic TypeScript engine — never AI-guessed |
|| Unknown fee deductions & reconciliation | Automated reconciliation against broker records |
|| No audit trail for tax filing | Immutable sha256 hash-chained ledger for every mutation |
|| Separate spreadsheets per broker | Single reconciled book across unlimited broker accounts |

---

## Features

### Multimodal Statement Parser
Drop a **PDF, photo, CSV, or XLSX** broker export. Gemini 2.0 Flash extracts:
- Transaction date, ticker symbol, action (BUY/SELL/DIV)
- Execution price, quantity, brokerage fees, fees
- Reference ID, broker name, exchange

Every field gets a **confidence score** (0–1). Anything below `0.75` routes to a review queue instead of auto-posting — the model never silently guesses.

### Discrepancy & Anomaly Detector
A deterministic rule engine (no AI) diffs your ledger against broker statements:
- Fee surcharges above expected rates
- Fee mismatches between different sources
- Duplicate reference IDs, unmatched fills
- Gemini AI explains each flag in plain English on demand

### Real-Time Tax Optimizer
Full **FIFO lot matching** engine in TypeScript:
- Holding-period tiers (configurable per jurisdiction)
- Multiple tax jurisdiction support
- Dividend fee tracking
- AI-ranked tax-loss harvesting suggestions validated against real positions
- Exportable PDF + CSV tax summary reports

### Immutable Audit Trail
Every mutation (parse, post, reconcile, compute) writes a `sha256(prev_hash + payload)` row. The chain can be verified client-side — any tampering breaks it instantly.

### Multi-Broker, Multi-Jurisdiction
- **Multiple Exchanges** — tax slabs, fee rates, jurisdiction-specific rules
- Add unlimited broker accounts per organisation
- Configurable tax profiles per jurisdiction
- Support for any global exchange

### Team Roles & Multi-Tenancy
- Owner / Admin / Analyst / Viewer roles
- Row-level security: every table is isolated by `org_id`
- Invite team members, manage permissions

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT (React SPA)                        │
│  TanStack Start · React 19 · Tailwind CSS v4 · Framer Motion │
│  TanStack Query · React Hook Form · Zod · Recharts            │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS / Supabase JS
┌──────────────────────▼───────────────────────────────────────┐
│                   SUPABASE BACKEND                            │
│  Auth (email + Google OAuth) · PostgreSQL + RLS               │
│  Storage (private trade-documents bucket)                     │
│  Realtime subscriptions                                       │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                  GOOGLE AI LAYER                              │
│  Gemini 2.0 Flash — document parsing + anomaly narration      │
│  Gemini 2.0 Flash — tax explanation + portfolio analysis      │
│  All AI keys server-side only (never exposed to browser)      │
└──────────────────────────────────────────────────────────────┘
```

**Non-negotiable architecture rules:**
1. AI keys live in `.env` — never in client bundles for production
2. All tax math runs as deterministic TypeScript — LLM never computes numbers
3. Every extraction writes a `confidence_score`; anything < 0.75 → review queue
4. Every mutation appends to the immutable hash-chained `audit_log`
5. Multi-tenant isolation via `org_id` + Postgres RLS on every table

---

## Tech Stack

|| Layer | Technology |
||---|---|
|| Frontend Framework | React 19 + TanStack Start (SSR) |
|| Routing | TanStack Router (file-based) |
|| Styling | Tailwind CSS v4 + custom design tokens |
|| Animation | Framer Motion |
|| Data Fetching | TanStack Query |
|| Forms | React Hook Form + Zod |
|| Charts | Recharts |
|| Database | Supabase (PostgreSQL) |
|| Auth | Supabase Auth (email + Google OAuth) |
|| Storage | Supabase Storage |
|| AI / ML | Google Gemini 2.0 Flash (`@google/genai` v2) |
|| Build Tool | Vite 8 + Rolldown |
|| Type Safety | TypeScript 5.8 |
|| Icons | Lucide React |

---

## Quick Start

### Prerequisites
- Node.js ≥ 20
- npm ≥ 10
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com/app/apikey) API key

### 1. Clone & install

```bash
git clone https://github.com/Ahmadjamilofficial/wab.git
cd wab
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your values — see Environment Variables below
```

### 3. Set up the database

Open your Supabase project → **SQL Editor** → **New query**.
Paste the entire contents of `supabase/schema.sql` and click **Run**.

This creates all tables, RLS policies, the storage bucket, and the auto-provision trigger.

### 4. Enable Google OAuth (optional)

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID
2. Add `http://localhost:8080` to Authorized JavaScript origins
3. Add `https://YOUR_PROJECT.supabase.co/auth/v1/callback` to Authorized redirect URIs
4. Supabase Dashboard → **Auth → Providers → Google** → enable, paste Client ID + Secret

### 5. Run locally

```bash
npm run dev
# → http://localhost:8080
```

### 6. Build for production

```bash
npm run build
npm run preview
```

---

## Environment Variables

Create a `.env` file at the project root (copy from `.env.example`):

```env
# Supabase — https://supabase.com/dashboard → Project Settings → API
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# AI Providers (at least one required)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash-exp
LOVABLE_API_KEY=your-lovable-key
OPENROUTER_API_KEY=your-openrouter-key
GROQ_API_KEY=your-groq-key

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# App URL
VITE_APP_URL=http://localhost:8080

# Tool approval secret
TOOL_APPROVAL_SECRET=wab-tool-approval
```

> **Security note:** `.env` is in `.gitignore`. Never commit real keys. For production deployments, inject secrets via your host's environment variable panel.

---

## Database Setup

The single file `supabase/schema.sql` is a **full reset + rebuild** script:

1. Drops all existing tables, triggers, and functions (safe to re-run)
2. Creates all tables in dependency order
3. Enables Row Level Security on every table
4. Creates `user_org_ids()` and `user_role_in_org()` RLS helper functions
5. Sets up the private `trade-documents` storage bucket
6. Installs the `on_auth_user_created` trigger (auto-provisions org + profile + subscription on signup)

**Tables:**

```
organizations          — multi-tenant root
profiles               — user ↔ org membership + role
tax_profiles           — per-jurisdiction tax/fee rules
broker_accounts        — broker/exchange connections
documents              — uploaded statement files
transactions           — parsed + posted trade records
ledger_entries         — double-entry cash movements
reconciliation_flags   — detected discrepancies
tax_computations       — FIFO tax computation results
tax_loss_harvest_suggestions
audit_log              — immutable hash-chained event log
subscriptions          — billing plan
notifications          — in-app alert feed
chat_threads           — AI conversation threads
chat_messages          — chat messages
financial_events       — financial events
financial_insights     — AI-generated insights
financial_investigations — investigation records
```

---

## Project Structure

```
wab/
├── public/
│   ├── favicon.png          # Wab logo
│   ├── favicon.svg          # Modern SVG favicon
│   ├── dark-logo.png        # Dark theme logo
│   ├── light-logo.png       # Light theme logo
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── app/            # App shell and dashboard components
│   │   ├── agent/          # AI agent UI components
│   │   ├── ai-elements/    # AI SDK components
│   │   ├── brand/          # Logo components
│   │   ├── intelligence/   # Financial intelligence UI
│   │   ├── notifications/  # Notification center
│   │   ├── site/           # Landing page components
│   │   └── ui/             # shadcn/ui primitives
│   ├── lib/
│   │   ├── agent-*.ts      # Agent services, queue, tools
│   │   ├── ai-*.ts         # AI service integration
│   │   ├── integrations/   # External provider integrations
│   │   ├── *.ts            # Tax, financial intelligence, policy engine
│   ├── routes/             # TanStack Router file-based routes
│   │   ├── api/            # API endpoints
│   │   └── *.tsx           # Page routes
│   └── styles.css          # Design tokens + Tailwind config
├── supabase/
│   └── schema.sql         # Full reset + rebuild schema
├── .env.example           # Safe-to-commit env template
└── README.md
```

---

## AI Pipeline

Wab uses Google Gemini 2.0 Flash for three distinct, bounded tasks:

### Document Parsing
```
User uploads PDF/image/CSV
        ↓
Gemini extracts fields as structured JSON
        ↓
Zod validates schema server-side
        ↓
confidence_score < 0.75 → needs_review
confidence_score ≥ 0.75 → auto-post to ledger
        ↓
audit_log row appended (sha256 chained)
```

### Anomaly Explanation
The reconciliation engine flags discrepancies using **pure deterministic rules** (no AI). Gemini is then optionally invoked only to explain the pre-computed flag in plain English for the user.

### Tax Narration
FIFO math runs entirely in TypeScript (`src/lib/tax.ts`). Gemini is called afterward only to translate the computed numbers into a plain-English summary. It never produces or modifies a number.

---

## Tax Engine

The FIFO engine in `src/lib/tax.ts` supports:

**Configurable Jurisdictions:**
- Holding-period tiers (configurable per jurisdiction)
- Multiple tax rate tables
- Dividend fee tracking
- Configurable tax profiles

The engine is a pure function with zero side effects — fully unit-testable and auditable.

---

## Pricing

**7-Day Free Trial, Then Paid:**

| Plan | Price | Trial | Transactions | Key Features |
|---|---|---|---|---|
| **Trial** | FREE | 7 days | Unlimited | Full access to all features |
| **Standard** | $3/mo | - | Unlimited | Core audit tools, notifications, basic reports |
| **Pro** | $5/mo | - | Unlimited | Advanced agents, PDF reports, anomaly detection, tax-loss harvesting |

After the 7-day trial, users must choose a paid plan to continue using Wab.

---

## Roadmap

- [x] Multimodal statement parser (PDF, image, CSV)
- [x] FIFO tax engine (multi-jurisdiction)
- [x] Immutable hash-chained audit log
- [x] Supabase Auth + Google OAuth
- [x] Multi-tenant RLS isolation
- [x] Tax-loss harvesting suggestions
- [x] Gemini AI anomaly explanations
- [x] Theme toggle (light/dark)
- [x] Improved favicon
- [ ] Exchange broker API connections
- [ ] Regulatory update webhooks
- [ ] Mobile app (React Native)
- [ ] Additional jurisdiction profiles
- [ ] Batch import via email parsing

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

```bash
# Fork → clone → branch
git checkout -b feature/your-feature

# Make changes, ensure no TS errors
npx tsc --noEmit

# Build passes
npm run build

# Submit PR against main
```

Please follow the existing code style (Prettier + ESLint config included).

---

## License

MIT © Wab Contributors

---

## Disclaimer

Wab does not provide tax or legal advice. All computations are indicative only. Always consult a qualified tax professional before filing your returns.

---

<div align="center">

**Built for traders, financiers, and individuals who deserve better financial tooling.**

[Website](https://psxl.live) · [Twitter](https://twitter.com/wabapp) · [LinkedIn](https://linkedin.com/company/wab)

</div>
