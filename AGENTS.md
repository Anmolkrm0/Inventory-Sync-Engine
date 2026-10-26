# Inventory Sync App — Build Kit for Antigravity

Drop this file in the root of your project folder as `AGENTS.md`. Antigravity's agent reads it as standing instructions. Then paste the prompts in **Part 4** one at a time.

---

## Part 1 — What we're building

A multichannel inventory sync SaaS (a Sumtracker competitor). It keeps ONE master stock count per SKU per warehouse and pushes a single number, **Available = In stock − Booked**, to every connected sales channel (Shopify, WooCommerce, Amazon, Etsy, eBay, Walmart).

**Today's goal:** a running Next.js app with all 5 designed screens, a real Postgres database seeded with sample data, and working stock adjustments that write to an audit log. Channel connections come next session.

Screens (designs on the "Inventory Sync App UI" canvas):
1. **Dashboard** — KPI tiles, 24h orders bar chart, channel health list, running-low table, live sync feed
2. **Inventory** — saved-view tabs, filters, stock table (In stock / Booked / Available / Incoming / Close at / Status), multi-select with floating bulk-action bar
3. **SKU detail** — header stats (Available highlighted), stock by warehouse with editable close-at, linked listings with sync state, 30-day trend, activity log
4. **Bundles** — bundle list + selected bundle showing each component's "sets it can make" bar; the smallest one is the limiting part
5. **Connect channels** — 4-step onboarding wizard, channel cards with Connect buttons, matching preview

---

## Part 2 — Rules for the agent (follow always)

### Stack
- **Next.js 15 (App Router) + TypeScript (strict)**
- **Tailwind CSS** + **shadcn/ui** for primitives (Button, Input, Table, Tabs, Checkbox, Dialog, DropdownMenu, Sheet, Tooltip)
- **lucide-react** for icons (stroke width 1.8)
- **PostgreSQL** via **Prisma**
- **Recharts** only if a chart can't be done with simple div bars (the designs use div bars)
- **Docker Compose** for local Postgres + Redis
- Package manager: **pnpm**

### Code rules
- Server Components by default; `"use client"` only for interactive pieces.
- All DB access goes through `src/server/` functions — never call Prisma from components directly.
- Every stock change MUST go through ONE function: `applyStockMovement()` in `src/server/stock.ts`. It runs in a Prisma transaction, locks the `StockLevel` row (`SELECT ... FOR UPDATE` via `$queryRaw`), updates the quantity, and inserts a `StockMovement` row. No other code may write to `StockLevel`.
- Available is always computed as `onHand - booked`, never stored separately.
- Bundle available = `min(floor(componentAvailable / qtyPerBundle))` across components. Computed, never stored.
- Money and quantities are integers. No floats for stock.
- Every table query filters by `accountId`.
- Write a test (Vitest) for every function in `src/server/stock.ts` and `src/server/bundles.ts`.
- Don't add libraries not listed here without asking.
- After each task: run `pnpm lint && pnpm typecheck && pnpm test` and fix errors before saying done.

### Design rules — match the canvas exactly
**Look:** "precision control room" — near-black sidebar, cool light workspace, one cobalt accent, monospace for SKUs and numbers.

**Fonts** (via `next/font/google`):
- Headings, big numbers: `Inter Tight` 600/700, letter-spacing −0.02em
- Body: `Inter` 400/500/600, base 14px
- SKUs, numbers in tables, timestamps: `JetBrains Mono` 400/500
- All numbers use `font-variant-numeric: tabular-nums`

**Color tokens** (put these in `tailwind.config.ts` under `theme.extend.colors`):
```ts
colors: {
  ink:      '#0B0D12', // text, sidebar background
  ground:   '#F4F5F7', // page background
  surface:  '#FFFFFF', // cards
  line:     '#E4E7EC', // card borders
  hairline: '#EEF0F3', // row dividers
  muted:    '#5B6472', // secondary text
  accent:   { DEFAULT: '#3155F5', hover: '#1E3BC4', soft: '#F3F6FF', text: '#2A44C9' },
  sidebar:  { bg: '#0B0D12', raised: '#151925', active: '#1B2030', border: '#232838', text: '#C9CED8', dim: '#9AA3B2' },
  good:     { DEFAULT: '#12A150', text: '#0F7A42', soft: '#E7F6EE' },
  warn:     { DEFAULT: '#F2A33A', text: '#A04D00', soft: '#FFF1E0', border: '#FBD9A8' },
  bad:      { DEFAULT: '#D12E3A', text: '#B42330', soft: '#FDECEE' },
}
```
Channel tile colors: Shopify `#5E8E3E`, Amazon `#232F3E`, Etsy `#F1641E`, WooCommerce `#7F54B3`, eBay `#0064D2`, Walmart `#0071CE`.

**Shapes & spacing:** cards `rounded-[14px] border border-line bg-surface p-5`; buttons and inputs `rounded-[10px] h-[42px]`; status pills `rounded-full px-2.5 py-1 text-xs font-semibold`; page padding `px-8 pt-7 pb-12`; content `max-w-[1240px] mx-auto`; gaps 16–24px. No gradients, no drop shadows except the floating bulk-action bar and the selected bundle card.

**Status pill mapping:** Healthy → good, Low stock → warn, Sold out → bad, Held at 0 (close-at) → accent.

**Layout:** sidebar 232px (`flex-wrap` so it stacks on phones), main `flex-1 min-w-0`. Tables sit in `overflow-x-auto` boxes. Every page works at 390px wide.

**Accessibility:** real `<button>`/`<a>`/`<label>`; icon-only buttons get `aria-label`; text contrast ≥ 4.5:1; touch targets ≥ 44px.

---

## Part 3 — Data model (Prisma)

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model Account {
  id         String      @id @default(cuid())
  name       String
  createdAt  DateTime    @default(now())
  users      User[]
  channels   Channel[]
  products   Product[]
  warehouses Warehouse[]
}

model User {
  id        String  @id @default(cuid())
  accountId String
  account   Account @relation(fields: [accountId], references: [id])
  email     String  @unique
  name      String
  role      Role    @default(OWNER)
}
enum Role { OWNER ADMIN STAFF }

model Channel {
  id           String        @id @default(cuid())
  accountId    String
  account      Account       @relation(fields: [accountId], references: [id])
  type         ChannelType
  name         String
  storeRef     String        // e.g. acme-goods.myshopify.com
  credentials  String?       // encrypted JSON, filled next session
  status       ChannelStatus @default(LIVE)
  lastSyncedAt DateTime?
  listings     Listing[]
}
enum ChannelType { SHOPIFY WOOCOMMERCE AMAZON ETSY EBAY WALMART }
enum ChannelStatus { LIVE REVIEW ERROR PAUSED }

model Warehouse {
  id          String       @id @default(cuid())
  accountId   String
  account     Account      @relation(fields: [accountId], references: [id])
  name        String
  kind        String       // "Own", "3PL", "Store"
  sortOrder   Int          @default(0)
  stockLevels StockLevel[]
}

model Product {
  id                String             @id @default(cuid())
  accountId         String
  account           Account            @relation(fields: [accountId], references: [id])
  sku               String
  name              String
  barcode           String?
  category          String?
  swatch            String?            // hex for the colored product tile
  isBundle          Boolean            @default(false)
  costCents         Int                @default(0)
  stockLevels       StockLevel[]
  listings          Listing[]
  bundleComponents  BundleComponent[]  @relation("bundle")
  usedInBundles     BundleComponent[]  @relation("component")
  movements         StockMovement[]
  @@unique([accountId, sku])
}

model BundleComponent {
  bundleId    String
  componentId String
  qty         Int
  bundle      Product @relation("bundle", fields: [bundleId], references: [id])
  component   Product @relation("component", fields: [componentId], references: [id])
  @@id([bundleId, componentId])
}

model StockLevel {
  productId   String
  warehouseId String
  onHand      Int       @default(0)
  booked      Int       @default(0)
  incoming    Int       @default(0)
  closeAt     Int       @default(0)
  minLevel    Int       @default(0)
  stocked     Boolean   @default(true)
  product     Product   @relation(fields: [productId], references: [id])
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  @@id([productId, warehouseId])
}

model Listing {
  id             String   @id @default(cuid())
  channelId      String
  channel        Channel  @relation(fields: [channelId], references: [id])
  productId      String?
  product        Product? @relation(fields: [productId], references: [id])
  externalId     String
  title          String
  isPrimary      Boolean  @default(false)
  lastPushedQty  Int?
  lastPushedAt   DateTime?
  channelQty     Int?     // what the channel currently shows; differs = "changed outside app"
  @@unique([channelId, externalId])
}

model StockMovement {
  id          String       @id @default(cuid())
  productId   String
  product     Product      @relation(fields: [productId], references: [id])
  warehouseId String
  delta       Int
  reason      MoveReason
  refLabel    String?      // "Order #4821 · Shopify US"
  note        String?
  userId      String?
  createdAt   DateTime     @default(now())
  @@index([productId, createdAt])
}
enum MoveReason { ORDER CANCEL RETURN PO_RECEIVE MANUAL STOCKTAKE TRANSFER }
```

---

## Part 4 — Today's prompts (paste one at a time, check each before the next)

### Prompt 1 — Scaffold
> Read AGENTS.md fully. Create a Next.js 15 app in this folder with TypeScript strict, Tailwind, ESLint, `src/` dir, App Router, pnpm. Install shadcn/ui and add: button, input, table, tabs, checkbox, dialog, dropdown-menu, sheet, tooltip, badge. Install lucide-react, prisma, @prisma/client, vitest. Add the color tokens and the three fonts from AGENTS.md Part 2. Add a `docker-compose.yml` with Postgres 16 (port 5432, db `inventory`) and Redis 7. Add `.env.example` with DATABASE_URL. Run the dev server and confirm the default page loads.

**Check:** `pnpm dev` opens on localhost:3000; `docker compose up -d` starts Postgres.

### Prompt 2 — Database + seed
> Add the Prisma schema from AGENTS.md Part 3 exactly. Run the migration. Write `prisma/seed.ts` that creates one account "Acme Goods Co.", user "Anmol K." (OWNER), 3 warehouses (Main warehouse · Own, 3PL East · 3PL, Retail shop · Store), 5 channels (Shopify US, Shopify EU, Amazon FBM, Etsy with status REVIEW, WooCommerce), the 8 products from the Inventory design with their swatch colors and stock numbers, the 5 bundles from the Bundles design with their components, listings linking products to channels (one Etsy listing with channelQty 15 vs lastPushedQty 12), and 40 StockMovements spread over the last 30 days. Run the seed.

**Check:** `pnpm prisma studio` shows all tables filled.

### Prompt 3 — Stock engine (the important one)
> Create `src/server/stock.ts` with `applyStockMovement({accountId, productId, warehouseId, delta, reason, refLabel?, note?, userId?})`. Follow AGENTS.md rules exactly: one Prisma transaction, lock the StockLevel row with `SELECT ... FOR UPDATE` via `$queryRaw`, reject if onHand would go below 0, update, insert the StockMovement, return the new level. Also `setStock()` (for stocktakes: computes delta from target), `getAvailable(productId)` (sum over stocked warehouses of max(0, onHand − booked − closeAt-hold)), and `statusFor(level)` returning Healthy / Low stock / Sold out / Held at 0. Create `src/server/bundles.ts` with `bundleAvailable(bundleId)` returning `{available, limitingComponentId, perComponent: [{componentId, sets}]}`. Write Vitest tests including: two concurrent movements on the same row both apply correctly; a movement that would go negative is rejected; bundle availability equals the smallest component's sets.

**Check:** `pnpm test` all green. Read the concurrency test yourself.

### Prompt 4 — App shell
> Build the app layout in `src/app/(app)/layout.tsx`: the dark sidebar exactly like the Dashboard design (logo square in accent with a pulse-line icon, "[App name]", workspace switcher button, nav: Dashboard, Inventory, Bundles, Purchase orders, Replenishment, Channels, Settings with lucide icons; active item has bg sidebar.active, white text and a 6px accent dot on the right; "Sync engine healthy" card with green glowing dot; user row at the bottom). Main area: ground background, `max-w-[1240px]` container. Sidebar stacks above content under 768px. Make shared components: `PageHeader`, `Card`, `StatusPill`, `ChannelTile`, `KpiTile`, `MiniBars`.

**Check:** resize to phone width; nothing overflows.

### Prompt 5 — Inventory page
> Build `/inventory` matching the Inventory design: header with Import CSV, Stocktake, Adjust stock buttons; saved-view tabs (All SKUs, Low stock, Sold out, Held by close-at, Unlinked listings) with count badges driven by real DB counts and URL `?view=`; search + Warehouse + Channel filter buttons; the table with checkbox, product (swatch tile + name + mono SKU, links to `/inventory/[sku]`), channel tiles, In stock, Booked, Available (bold), Incoming, Close at, Status pill, Last push. Selecting rows shows the dark floating bulk-action bar. "Adjust stock" opens a Dialog: pick product, warehouse, set or add/remove quantity, reason; submits a Server Action that calls `applyStockMovement`, then revalidates.

**Check:** adjust a stock number; the table updates and a StockMovement row exists.

### Prompt 6 — SKU detail page
> Build `/inventory/[sku]` matching the SKU detail design: breadcrumb, header with big swatch, name, mono SKU chip, barcode, category, "Used in N bundles"; five stat cards (In stock, Booked, Available with 2px accent border and accent.soft background, Incoming, Days of stock left in warn colors); Stock by warehouse table with an editable Close-at number input that saves on blur via Server Action; Linked listings list where a listing whose channelQty ≠ lastPushedQty shows "Changed outside app · review" in warn color; Available-last-30-days bar chart rebuilt from StockMovements (last bar red if low); Activity log from StockMovements with colored delta badges.

### Prompt 7 — Bundles page
> Build `/bundles` matching the Bundles design: list of bundle cards on the left (click selects, selected has 2px accent border and soft shadow, available number + Healthy/Low/Sold out label), detail panel on the right: SKU, name, channels, black "Available to sell" card showing "limited by <component>", one row per component with "X in stock ÷ Y per set", the sets number, and a progress bar scaled to the max sets; the limiting component gets warn styling and the line "This part sets the bundle's stock." All numbers come from `bundleAvailable()`.

### Prompt 8 — Dashboard + Connect wizard
> Build `/` (Dashboard) matching the design: header with "Live · last push" pill, search with ⌘K hint, Adjust stock button; 4 KPI tiles with 14-bar mini sparklines (Available units, Orders synced today, Low-stock SKUs, Oversells prevented) computed from the DB; Orders-synced-last-24h bar chart (div bars, last bar ink color, 24h/7d/30d segmented control); Channels list with status dots; Running low table (days-left bar red ≤5, amber ≤14); Live sync feed from the latest StockMovements. Then build `/connect` matching the Connect channels design: dark top bar with a 4-step stepper, "Step 1 of 4" eyebrow, 34px heading, channel cards grid (connected cards show green check + store + listing count; Connect buttons are black), and the right column with the dark Matching preview card (big listings number, 3-segment bar, legend) and "What happens next" list. Connect buttons are placeholders today.

**Check:** click through every page; compare side by side with the canvas.

---

## Part 5 — Next session (not today)
1. Shopify app: Partner account, OAuth install flow, product import, `orders/create` / `orders/cancelled` / `refunds/create` webhooks with HMAC verification
2. BullMQ queue + workers: order ingest → `applyStockMovement` → fan-out pushes with absolute quantities, debounced 2s, idempotent on (channelId, externalOrderId)
3. Echo guard + "changed outside app" detection and review queue
4. Reconciliation job every 15 minutes
5. WooCommerce connector, then Amazon / eBay / Etsy
6. Any change to onHand, booked or closeAt must enqueue a channel push.
7. TODO: Restore "Oversells prevented" KPI on Dashboard once real-time channel sync is operational (temporarily displayed as "Held by close-at").
