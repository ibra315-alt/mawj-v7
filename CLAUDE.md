# CLAUDE.md — Mawj ERP v7

## Project Overview

**Mawj (مَوج)** is a sales management ERP system for a luxury crystal gifts business in the UAE. It is a **React 18 + Vite** single-page application backed by **Supabase** (PostgreSQL, Auth, Edge Functions, Realtime, Storage). The UI is **Arabic-first (RTL)** with full dark/light theme support and PWA offline capabilities.

- **Name**: mawj-erp-v7
- **Currency**: AED (UAE Dirhams)
- **Language**: Arabic (RTL), with Latin/numbers using Inter font
- **Primary font**: Almarai (Arabic), Inter (numbers/Latin)

---

## Quick Reference

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000
npm run build        # Production build to dist/
npm run preview      # Preview production build
```

**Environment variables** (`.env`, see `.env.example`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> `.env` is gitignored. Never commit secrets.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 (JSX, no TypeScript) |
| Bundler | Vite 5 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Real-time | Supabase postgres_changes |
| Edge Functions | Deno (Supabase Edge Functions) |
| AI | Multi-provider (Claude, Gemini, GPT, DeepSeek) via Supabase proxy |
| Messaging | WhatsApp Cloud API (Meta Graph API v18.0) |
| Styling | Vanilla CSS with custom properties (no CSS framework) |
| PWA | Service worker (sw.js v9) + manifest.json |

---

## Directory Structure

```
mawj-v7/
├── index.html                # Entry HTML (RTL, PWA meta tags, fonts)
├── package.json              # Dependencies & scripts
├── vite.config.js            # Vite config (React plugin, port 3000)
├── eslint.config.js          # ESLint flat config
├── supabase_schema.sql       # Full database schema + seed data
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker (caching strategies)
│   ├── offline.html          # Offline fallback page
│   └── logo.png              # App icon
├── src/
│   ├── main.jsx              # React entry (ErrorBoundary wrapper)
│   ├── App.jsx               # Root component (auth, routing, theme)
│   ├── components/
│   │   ├── Layout.jsx        # Sidebar (desktop) + bottom nav (mobile)
│   │   ├── ui.jsx            # Shared UI primitives (Btn, Input, Modal, Toast, etc.)
│   │   ├── AIAssistant.jsx   # Multi-provider AI chat panel
│   │   ├── Icons.jsx         # SVG icon library (Lucide-based)
│   │   ├── Logo.jsx          # Animated wave logo
│   │   ├── BgCanvas.jsx      # Canvas background effects
│   │   ├── CursorSpotlight.jsx # Cursor glow effect
│   │   ├── Confetti.jsx      # Celebration animation
│   │   ├── NotificationBell.jsx # Notification dropdown
│   │   ├── OrderCard.jsx     # Order display card
│   │   ├── PrintReceipt.jsx  # Receipt printing
│   │   └── Sparkline.jsx     # Inline mini charts
│   ├── pages/
│   │   ├── Login.jsx         # Auth page
│   │   ├── Dashboard.jsx     # KPI overview + sparklines
│   │   ├── Orders.jsx        # Order CRUD + profit calculation
│   │   ├── Customers.jsx     # Customer segmentation (RFM)
│   │   ├── Inventory.jsx     # Stock management
│   │   ├── Expenses.jsx      # Expense tracking
│   │   ├── Suppliers.jsx     # Supplier management
│   │   ├── Accounting.jsx    # Financial reporting
│   │   ├── Partners.jsx      # Revenue share tracking
│   │   ├── Reports.jsx       # Advanced analytics
│   │   ├── Settings.jsx      # 11-section configuration
│   │   ├── Hayyak.jsx        # Delivery logistics
│   │   ├── Import.jsx        # Data import/export
│   │   └── AgentPage.jsx     # AI agent/CRM management
│   ├── data/
│   │   ├── db.js             # Supabase client, Auth, DB CRUD, Settings cache
│   │   ├── realtime.js       # Real-time subscriptions
│   │   ├── constants.js      # Formatters (currency, date, timeAgo)
│   │   └── appearance.js     # Theme loading/saving
│   └── styles/
│       └── global.css        # Full design system (849 lines)
└── supabase/
    └── functions/
        ├── agent-cron/       # Scheduled AI agent runner
        ├── ai-proxy/         # Anthropic→Gemini API adapter
        ├── whatsapp-sender/  # Send WhatsApp messages
        └── whatsapp-webhook/ # Receive + reply to WhatsApp messages
```

---

## Architecture & Patterns

### Routing
**Manual client-side routing** — no React Router. `App.jsx` uses a `page` state variable (persisted in `localStorage`) and a switch statement to render the current page component.

### State Management
**React Hooks only** — no Redux, Zustand, or Context API.
- `useState` / `useEffect` in each component
- `localStorage` for persisting theme and current page
- `window.__mawjPrefs` for appearance config
- **Supabase is the source of truth** for all data

### Data Flow
```
Supabase DB
  ↕ (via DB.list / DB.insert / DB.update / DB.delete in data/db.js)
Component state (useState)
  ↕ (real-time subscriptions trigger reload)
UI render
```

### Authentication Flow
1. `App.jsx` mounts → `Auth.getSession()` checks Supabase session
2. If session → load user record from `users` table by email
3. If no session → render `Login.jsx`
4. Login → `Auth.signIn(email, password)` → Supabase Auth
5. `Auth.onAuthChange()` listener auto-updates session state
6. User roles: `admin`, `accountant`, `sales`, `viewer`

---

## Supabase Data Layer (`src/data/db.js`)

### Auth API
```js
Auth.signIn(email, password)
Auth.signOut()
Auth.getSession()
Auth.onAuthChange(callback)
```

### DB CRUD API
```js
DB.list(table, { orderBy, asc, filters, limit })
DB.get(table, id)
DB.insert(table, row)
DB.update(table, id, updates)    // auto-sets updated_at
DB.delete(table, id)
DB.upsert(table, row)
```

### Settings Cache
```js
Settings.get(key)           // In-memory cached, fetches from 'settings' table
Settings.set(key, value)    // Upserts to 'settings' table
Settings.clearCache(key)
```

### Real-time (`src/data/realtime.js`)
```js
subscribe(name, table, events, callback)
subscribeOrders(cb)
subscribeInventory(cb)
subscribeExpenses(cb)
unsubscribeAll()
```

### Storage
```js
Storage.upload(bucket, path, file)
```

### Utilities
```js
generateOrderNumber()   // Format: MWJ-YYMM-XXXX (auto-increment)
```

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `settings` | Key-value config (JSONB values) |
| `users` | User accounts with roles & permissions |
| `orders` | Core business entity — items as JSONB, profit tracking |
| `inventory` | Product stock with SKU, cost/sell price, low-stock threshold |
| `suppliers` | Supplier contacts |
| `supplier_purchases` | Purchase records per supplier |
| `expenses` | Operating expense tracking |
| `settlements` | Partner payment settlements |
| `capital_entries` | Capital deposits |
| `withdrawals` | Partner withdrawals/salary |
| `discounts` | Discount codes with usage tracking |

**RLS Policy**: All tables use a simple `auth_all` policy — all authenticated users have full CRUD access. No row-level filtering by role.

**Order statuses**: `new` → `confirmed` → `processing` → `shipped` → `delivered` → `returned` / `cancelled`

**Agent tables** (referenced in edge functions but not in main schema): `agent_workflows`, `agent_memory`, `agent_runs`

---

## UI Component Library (`src/components/ui.jsx`)

All shared UI primitives live in `ui.jsx`:

```jsx
<Btn variant="primary|secondary|danger|ghost|violet|pink" size="sm|md|lg" loading />
<Input label error hint icon />
<Select label />
<Textarea label />
<Modal isOpen onClose>{children}</Modal>
<ConfirmModal title message onConfirm onCancel />
<Toast />               // Use: toast(msg, 'success'|'error'|'warning')
<Badge variant="success|danger|warning|info|action|muted" />
<Card />, <StatCard />, <Empty />
<PageHeader title subtitle />
<SkeletonStats count />, <SkeletonCard />
<Spinner />, <DonutMini />
```

---

## Styling Conventions

### CSS Custom Properties (Design Tokens)
Defined in `src/styles/global.css` with `:root` (dark) and `[data-theme="light"]` overrides:

- **Background**: `--bg-900`, `--bg-800`, `--bg-700`
- **Text**: `--text-primary`, `--text-secondary`, `--text-muted`
- **Action/accent**: `--action` (teal `#00e4b8`)
- **Semantic**: `--info`, `--danger`, `--warning`, `--success`
- **Radius**: `--radius-sm` (6px), `--radius-md` (10px), `--radius-lg` (14px), `--radius-xl` (18px)

### Key CSS Classes
- `.mawj-card` — elevated card with shadow and rounded corners
- `.mawj-btn-primary` / `.mawj-btn-secondary` / `.mawj-btn-danger` / `.mawj-btn-ghost` — button variants
- `.badge-*` — status badges
- `.list-row` — card with hover lift effect
- `.page-wave-accent` — gradient top accent line
- `.stagger > *` — cascading entrance animation

### RTL
- `html` has `dir="rtl"` and `lang="ar"`
- All layout is RTL-first; use logical properties where possible
- Numbers use Inter font for readability

### Responsive Breakpoints
- Mobile: `max-width: 768px`
- Tablet: up to `1024px`
- Desktop: `1025px+`
- Desktop sidebar: 224px fixed; mobile bottom nav: 60px

---

## Key Business Logic

### Profit Calculation (Orders.jsx)
```
revenue = sum of delivered non-replacement orders
gross_profit = revenue - product_cost - hayyak_fee
net_profit = gross_profit - operating_expenses

// Replacements/failed deliveries:
gross_profit = -(product_cost + hayyak_fee)   // recorded as loss
```

### Hayyak Delivery Integration
- Default fee: 25 AED per order (Mawj absorbs delivery cost)
- COD settlements tracked via `hayyak_remittance_id`
- Pending COD = delivered orders awaiting remittance

### Customer Segmentation (RFM-based, derived from orders)
- **VIP**: spent 2000+ AED or 5+ orders
- **مخلص (Loyal)**: 3+ orders, active within 60 days
- **خامل (Inactive)**: >90 days since last order
- **جديد (New)**: 1 order only
- **نشط (Active)**: default

### Partner Revenue Split
- Configurable in Settings (default: Ibrahim 50%, Ihsan 50%)
- Tracked via `settlements` table

---

## Edge Functions (Supabase)

| Function | Purpose | External APIs |
|----------|---------|---------------|
| `agent-cron` | Scheduled AI agent — runs workflows, sends WhatsApp reports | Gemini 2.5 Flash, WhatsApp |
| `ai-proxy` | Anthropic-to-Gemini API format adapter | Gemini 2.5 Flash |
| `whatsapp-sender` | Send WhatsApp messages (single or bulk) | WhatsApp Cloud API |
| `whatsapp-webhook` | Receive WhatsApp messages, reply with AI | Gemini 2.5 Flash, WhatsApp |

**Edge function env vars**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`

---

## PWA & Offline

- **Service worker** (`public/sw.js` v9): intelligent caching — network-only for API calls, cache-first for fonts/assets, network-first for navigation
- **Offline page** (`public/offline.html`): Arabic fallback with retry button
- **Install prompt**: `beforeinstallprompt` handled in `App.jsx`
- **Offline banner**: shown when `navigator.onLine` is false

---

## Conventions for AI Assistants

### Code Style
- **JavaScript (JSX)** — no TypeScript in this project
- **ES Modules** (`"type": "module"` in package.json)
- **Functional components** with hooks — no class components
- **No external UI library** — all UI primitives in `src/components/ui.jsx`
- **No CSS framework** — vanilla CSS with custom properties
- **ESLint rule**: `no-unused-vars` ignores uppercase and underscore-prefixed vars (`varsIgnorePattern: '^[A-Z_]'`)

### When Adding New Features
1. **Pages**: Create in `src/pages/`, add routing case in `App.jsx` switch, add nav item in `Layout.jsx`
2. **Components**: Reusable pieces go in `src/components/`; use existing `ui.jsx` primitives
3. **Database**: Add table to `supabase_schema.sql`, enable RLS, add CRUD via `DB.*` methods in `data/db.js`
4. **Styling**: Use existing CSS variables from `global.css`; add page-specific styles in the component or global.css
5. **Real-time**: Add subscription helper in `data/realtime.js` if live updates are needed

### Important Gotchas
- **No React Router** — routing is a manual switch in `App.jsx`
- **Customers are derived** from orders, not a separate table
- **Settings are JSONB** key-value pairs — no schema migration needed for new config
- **All text must be in Arabic** unless it's a code identifier or technical term
- **RTL layout** — use `margin-inline-start` / `padding-inline-end` rather than left/right
- **Theme support** — always use CSS variables, never hardcode colors
- **Mobile-first** — test on mobile viewport; bottom nav is primary on phones

### Do NOT
- Add TypeScript — this is a JS-only project
- Install CSS frameworks (Tailwind, Bootstrap, etc.)
- Install a router library — use the existing manual routing pattern
- Install state management libraries — use React hooks + Supabase
- Commit `.env` or any secrets
- Hardcode colors — use CSS custom properties
- Use LTR-specific CSS (left/right) — use logical properties (inline-start/end)
