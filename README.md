# إدارة العمارة — Building Manager

Offline-first PWA for managing a residential building's collections, expenses and treasury.
React + TypeScript + Vite, Tailwind CSS, Dexie (IndexedDB), React Router, Zod, Recharts, vite-plugin-pwa.
Arabic, RTL, IBM Plex Sans Arabic (bundled locally via `@fontsource`, so it works offline).

## Run

```bash
npm install
npm run dev        # development (service worker is disabled in dev)
npm run test       # financial logic tests (Vitest + fake-indexeddb)
npm run typecheck  # tsc --noEmit
npm run build      # production build + service worker
npm run preview    # serve the build; this is where PWA/offline can be tested
```

> This project was written without being able to install packages or run it.
> **Nothing has been compiled or executed yet.** Please run `npm install`, `npm run typecheck`
> and `npm run test` first and send me any errors; expect a few small type/import fixes.

## Architecture

```
UI components → pages (features/*) → hooks (useData, useAction) → services → repositories → Dexie
```

- `src/types/schemas.ts` — Zod schemas = single source of truth (types are inferred; backups are validated with them).
- `src/database/` — Dexie schema (`migrations/`), `repositories/` (the only persistence API), `unitOfWork.ts` (atomic transactions).
- `src/services/finance/` — pure calculations, collections, expenses, treasury. **All money logic lives here.**
- `src/services/period/` — periods, obligations, auto-creation, period-for-date resolution.
- `src/services/backup/` — export/import, integrity checks.
- `src/services/pdf/` — report models (`builders.ts`) and PDF rendering (`renderer.ts`).
- `src/services/reports/queries.ts` — read models for screens.
- Money is stored as **integer piastres** (`utils/money.ts`). The treasury balance is never stored; it is always derived from transactions.

Replacing IndexedDB later: re-implement `repos` (`database/repositories/index.ts`) and `runInTransaction`; services and UI stay unchanged.

## Key business rules (all covered by `financeFlow.test.ts`)

- Payment: collection transaction + obligation status are written in one DB transaction; a second tap fails with "already paid".
- Undo payment / undo expense: removes the linked transaction, restores status; blocked if the treasury would go negative.
- Expense payment requires sufficient treasury balance.
- Expense date → period automatically only when exactly one period matches; otherwise the admin must choose.
- New period never touches old data; the previous active period is just marked closed. Overlaps need explicit confirmation.
- Unique DB indexes prevent duplicates: one obligation per unit/period, one collection per obligation, one payment per expense.
- Archiving a unit keeps all history; only its unpaid obligation in the active period is removed.
- Backup restore: validate → cross-check relations → confirm → replace atomically → re-verify (rolls back on failure).

## PDF and Arabic

Most JS PDF libraries cannot shape Arabic correctly. Reports are laid out as HTML/CSS (the browser shapes Arabic and handles RTL with the embedded font), rendered with `html2canvas` and assembled with `jsPDF`. Works offline. Trade-off: PDF text is an image (not selectable). Please check a generated PDF visually (Arabic joining, RTL tables, page numbers, multi-page tables).

## Known decisions / limitations

- Recharts is used for one purposeful chart only (required vs collected per period, Records page, shown with 2+ periods). The dashboard uses a progress bar instead of decorative charts, per the spec.
- Opening balance of 0 creates no transaction.
- PWA icons are simple generated placeholders in `public/icons`.
- Single device, no sync, no authentication (by design).
