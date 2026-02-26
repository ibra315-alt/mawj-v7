# Mawj v7 — Frontend Redesign Plan

## Design Philosophy: "The Wave"

Mawj (مَوج) means "waves" — the entire redesign embraces this identity. Instead of a traditional ERP that feels like spreadsheets and dashboards, we're creating an experience that feels like **a luxury concierge for your business**. Every interaction should feel as premium as the crystal gifts being sold.

### Core Principles
1. **Conversational over Transactional** — reduce form overload; use smart defaults, inline editing, and contextual actions
2. **Glanceable Intelligence** — the dashboard should tell a story at a glance, not require reading 12 stat cards
3. **Flow State** — minimize page-hopping; bring context to where the user is, not force them to navigate away
4. **Luxury Aesthetic** — glass morphism, fluid animations, rich gradients — befitting a crystal/luxury brand
5. **Mobile-Native Thinking** — this is primarily used on phones; design for thumb-reach first

---

## What Changes (and What Stays)

### PRESERVED (100% — all business logic, data layer, Supabase integration)
- `src/data/*` — db.js, realtime.js, constants.js, appearance.js → UNTOUCHED
- All Supabase queries, auth flows, CRUD operations → UNTOUCHED
- `calcOrderProfit()`, `ORDER_STATUSES`, `generateOrderNumber()` → UNTOUCHED
- PrintReceipt.jsx → UNTOUCHED (print layout is functional)
- Edge functions → UNTOUCHED
- PWA config (sw.js, manifest.json, offline.html) → UNTOUCHED

### REDESIGNED (visual layer, layout, interactions)
Every `.jsx` file in `components/` and `pages/`, plus `global.css`

---

## 1. Navigation — "The Dock"

**Current:** 224px fixed sidebar (desktop) + 60px bottom bar (mobile) with 13 nav items + "More" sheet.

**New:** A floating dock inspired by macOS dock / Arc browser, but Arabic-luxury styled.

- **Desktop:** Floating glass pill at the bottom-center of the screen. Icons morph on hover with labels appearing. Groups: Primary (Dashboard, Orders, Hayyak) | Secondary (Customers, Inventory, Expenses, Suppliers) | Tertiary (Accounting, Partners, Reports, Settings). The dock auto-hides when scrolling down, reappears on scroll-up or bottom-edge hover.
- **Mobile:** Same floating dock concept but with 4 primary items + a "wave" button (center) that fans out remaining items in a radial/arc menu — like a wave cresting.
- **Benefit:** Reclaims the 224px sidebar real estate. Content goes full-width. The app feels modern and spacious.

## 2. Dashboard — "The Pulse"

**Current:** Traditional stat cards grid + collapsible order lists. Generic ERP look.

**New: A single, living "pulse" view** that tells the business story:

### Top: "The Wave" Hero
- A single fluid card spanning full width with an animated wave visualization (SVG path animation).
- The wave's height = today's revenue relative to yesterday. Color shifts from teal (good) through amber (moderate) to red (below target).
- Overlaid numbers: Today's revenue (big), order count (smaller), trend arrow with %.
- Tapping the wave navigates to Orders.

### Middle: "The Rings"
- Three concentric ring/arc visualizations (not boring stat cards):
  - **Outer ring:** Monthly revenue progress (vs previous month, not a fixed target)
  - **Middle ring:** Delivery rate (% delivered)
  - **Inner ring:** Net profit margin
- Each ring is interactive — tap to expand into detail.
- Below the rings: 3 compact labels (Revenue, Delivery, Profit) with sparkline thumbnails.

### Bottom: "The Stream"
- A unified activity feed (not separate "Today" and "In Progress" sections). Each item is:
  - Order placed → teal dot
  - Order status changed → contextual color
  - Expense recorded → amber dot
  - COD received → green dot
- Items are chronological, most recent first.
- Swipe-right on any order to quick-change its status (mobile gesture).
- The pending COD alert becomes an inline feed item with amber glow, not a separate banner.

### Quick Actions: "The Shortcuts"
- Floating action button (bottom-right on mobile, inline on desktop) with 3 quick actions:
  - New Order (primary)
  - New Expense
  - Quick Search (universal search across orders, customers, inventory)

## 3. Orders — "The Board"

**Current:** Table/list view with a large modal form for create/edit. Status filter tabs at top.

**New: Kanban-style board** with drag-and-drop status transitions:

### Board View (Default)
- Horizontal columns: جديد → جاهز → مع حياك → مسلّم → لم يتم
- Each order is a compact card showing: customer name, amount, city, time ago
- **Drag a card between columns to change status** (with haptic feedback on mobile, confetti on "delivered")
- Column headers show count + total value
- Mobile: horizontal scroll between columns (swipe), or toggle to list view

### List View (Toggle)
- Compact rows with inline status-change dropdown (current behavior preserved)
- Search + filter bar stays

### Order Form (Slide-over Panel)
- Instead of a centered modal, a **right-to-left slide panel** (matches RTL flow)
- Panel covers 50% on desktop, 100% on mobile
- Form is broken into sections with smooth accordion transitions:
  1. Customer info (name, phone, city — with smart autofill from previous orders)
  2. Items (product picker with images from inventory, qty, price, cost)
  3. Delivery (zone auto-fills cost, courier selection)
  4. Summary (auto-calculated: subtotal, discount, total, profit preview in real-time)
- "Save" button is sticky at the bottom, always visible

### Order Detail View
- Full-screen overlay with:
  - Timeline of status changes (vertical with connecting line)
  - Financial breakdown (visual: revenue bar vs cost bar vs profit bar)
  - Customer history (previous orders from same phone)
  - Quick actions: WhatsApp, Print, Edit, Duplicate, Create Replacement

## 4. Customers — "The People"

**Current:** Table with RFM segments. Static.

**New: Customer cards with personality:**
- Each customer gets a "vibe" based on their segment:
  - VIP → gold card with crown icon
  - Loyal → teal card
  - Active → standard card
  - New → card with "welcome" accent
  - Inactive → greyed card with "re-engage?" CTA
- Card shows: avatar (initials), name, total spent, order count, last order date, city
- Tap a customer → slide-over showing their full order history as a timeline
- One-tap WhatsApp with pre-filled re-engagement message for inactive customers

## 5. Inventory — "The Vault"

**Current:** Simple table.

**New: Visual grid** with:
- Product cards showing: name, stock qty (with progress bar to low-stock threshold), sell price, cost
- Low-stock items glow amber; out-of-stock glow red
- Quick inline editing: tap a number to edit stock
- Filter bar: All | Low Stock | Out of Stock
- Supplier name shown as a subtle badge on each card

## 6. Expenses — "The Outflow"

**Current:** Table + modal form.

**New:**
- Visual monthly breakdown as stacked bar chart (categories color-coded)
- Below chart: scrollable list grouped by date
- Inline "add expense" row at the top (no modal needed for simple entries)
- Category badges with consistent colors throughout the app
- Running monthly total in a sticky header

## 7. Hayyak — "The Fleet"

**Current:** Table with remittance tracking.

**New:**
- Pipeline view: Orders flow through stages (Dispatched → In Transit → Delivered → COD Collected)
- Each stage shows count + total value
- Remittance section: outstanding COD prominently displayed
- Batch actions: select multiple orders to mark remitted
- Map-style visualization of deliveries by emirate (simple SVG UAE map with counts)

## 8. Settings — "The Control Room"

**Current:** Sidebar sections + form fields. 1596 lines.

**New:**
- Clean category cards on the main view (like iOS Settings)
- Each section opens as a slide-over panel (not page navigation)
- Search bar at top to find any setting quickly
- Preview mode for appearance changes (live preview in a mini-mockup)

## 9. AI Assistant — "The Wave Mind"

**Current:** Fixed 380x560px panel.

**New:**
- Full-screen conversational mode (command+K or dedicated tab)
- The AI is a first-class citizen, not a sidebar widget
- Quick command palette (like Spotlight/Raycast):
  - Type `/` to see available commands
  - `/order Ibrahim` → searches and shows matching orders inline
  - `/expense 50 shipping` → creates expense without leaving the chat
  - `/report this week` → generates inline summary
- Context-aware: if you're on Orders page and open AI, it already has order context

## 10. Accounting, Partners, Reports, Suppliers, Import, Agent

These pages maintain all current functionality but get the new visual treatment:
- Glass-morphic cards replacing plain divs
- Consistent spacing and typography from new design system
- Inline editing where possible (reducing modal usage)
- Animated transitions between views

---

## Design System Changes

### Typography
- **Display:** Inter 900 (numbers/currency) + Almarai 800 (Arabic headings) — KEPT
- **Body:** Almarai 400 — KEPT
- Add: Tabular numbers for financial figures (font-variant-numeric: tabular-nums)

### Color Palette — "Crystal"
- Keep teal (#00e4b8) as primary action
- Add: Subtle iridescent gradients for premium feel (teal → violet → pink, used sparingly)
- Dark mode: deeper navy (#040810) with more contrast
- Light mode: warm cream (#faf9f7) instead of pure white
- Glass effect: backdrop-filter blur(24px) + rgba surfaces

### Motion
- Page transitions: Shared-element-style morphing where possible
- Cards: Subtle parallax on scroll
- Numbers: Count-up animation (already exists, keep)
- Status changes: Ripple effect from the status badge outward
- Loading: Skeleton shimmer (keep) + new: wave-shaped loading indicator matching the brand

### Spacing & Layout
- 4px grid (tighter than current 8px for more information density)
- Max content width: 1200px centered (currently full-width)
- Consistent 16px page padding (mobile) / 32px (desktop)

### New CSS Architecture
- CSS custom properties (keep)
- Replace all inline styles with CSS classes
- BEM-light naming: `.mwj-card`, `.mwj-card--elevated`, `.mwj-card__title`
- CSS Grid for layouts, Flexbox for components
- Container queries for responsive components (not just viewport media queries)

---

## Implementation Order

### Phase 1: Foundation (files: global.css, ui.jsx, Layout.jsx, App.jsx, Icons.jsx)
1. New CSS design system (global.css rewrite)
2. New UI component library (ui.jsx rewrite — add SlidePanel, Dock, Ring, WaveChart, CommandPalette, KanbanBoard)
3. New Layout with floating dock navigation
4. App.jsx updates for new routing transitions

### Phase 2: Core Pages (Dashboard.jsx, Orders.jsx)
5. Dashboard "Pulse" redesign
6. Orders Kanban board + slide-over form

### Phase 3: Secondary Pages (Customers, Inventory, Expenses, Hayyak)
7. Customers card grid
8. Inventory visual vault
9. Expenses chart + inline add
10. Hayyak pipeline

### Phase 4: Remaining Pages (Accounting, Partners, Reports, Suppliers, Settings, Import, AgentPage, Login)
11. Settings control room
12. All remaining pages with new visual treatment
13. AI command palette integration

### Phase 5: Polish
14. Animation fine-tuning
15. Mobile gesture support
16. Performance optimization (lazy loading pages)

---

## File Changes Summary

| File | Action | Lines (est.) |
|------|--------|-------------|
| src/styles/global.css | REWRITE | ~1200 |
| src/components/ui.jsx | REWRITE | ~1400 |
| src/components/Layout.jsx | REWRITE | ~500 |
| src/components/Icons.jsx | UPDATE (add new icons) | ~100 |
| src/components/Logo.jsx | KEEP | — |
| src/components/BgCanvas.jsx | REWRITE (simpler, performant) | ~60 |
| src/components/CursorSpotlight.jsx | KEEP | — |
| src/components/Confetti.jsx | KEEP | — |
| src/components/NotificationBell.jsx | UPDATE | ~200 |
| src/components/OrderCard.jsx | REWRITE (Kanban card) | ~120 |
| src/components/Sparkline.jsx | KEEP | — |
| src/components/AIAssistant.jsx | REWRITE (command palette) | ~600 |
| src/components/PrintReceipt.jsx | KEEP | — |
| src/App.jsx | UPDATE | ~300 |
| src/main.jsx | KEEP | — |
| src/pages/Dashboard.jsx | REWRITE | ~500 |
| src/pages/Orders.jsx | REWRITE | ~1100 |
| src/pages/Customers.jsx | REWRITE | ~400 |
| src/pages/Inventory.jsx | REWRITE | ~350 |
| src/pages/Expenses.jsx | REWRITE | ~500 |
| src/pages/Hayyak.jsx | REWRITE | ~700 |
| src/pages/Settings.jsx | REWRITE | ~1400 |
| src/pages/Login.jsx | REWRITE | ~300 |
| src/pages/Accounting.jsx | UPDATE | ~550 |
| src/pages/Partners.jsx | UPDATE | ~470 |
| src/pages/Reports.jsx | UPDATE | ~500 |
| src/pages/Suppliers.jsx | UPDATE | ~200 |
| src/pages/Import.jsx | UPDATE | ~400 |
| src/pages/AgentPage.jsx | UPDATE | ~1100 |
| src/data/* | UNTOUCHED | — |
| supabase/* | UNTOUCHED | — |
| public/* | UNTOUCHED | — |
