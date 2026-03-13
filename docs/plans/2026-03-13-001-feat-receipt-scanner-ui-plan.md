---
title: "feat: Add receipt scanner upload page"
type: feat
status: completed
date: 2026-03-13
origin: docs/brainstorms/2026-03-13-receipt-scanner-brainstorm.md
---

# feat: Add receipt scanner upload page

## Overview

Build the user-facing page for the receipt scanner feature. The API route (`POST /api/receipt`) already extracts transaction data from receipt images via Claude vision. This plan covers the UI: a three-phase page (Upload → Review → Save) and a nav link to reach it.

## Problem Statement / Motivation

Users currently enter transactions manually or via CSV import. For everyday purchases, snapping a photo of a receipt is faster than typing. The API is ready — we just need the UI to complete the feature. (see brainstorm: docs/brainstorms/2026-03-13-receipt-scanner-brainstorm.md)

## Proposed Solution

Create `/dashboard/expenses/receipt` page following the same multi-phase pattern as the CSV import page (`import/page.tsx`). Three phases:

1. **Upload** — file input (camera + file picker), upload button, loading state
2. **Review** — pre-filled editable form with extracted merchant, amount, date, category, items
3. **Done** — success message with links to view transactions or scan another

## Technical Considerations

- **No new dependencies** — uses existing Anthropic SDK, shadcn components, Sonner toasts
- **No schema changes** — Expense `source` field already supports arbitrary strings; use `"receipt"`
- **Category dropdown** — reuse the same grouping pattern from `new/page.tsx` (group by type, show "Parent > Child" labels)
- **Mobile-friendly** — `<input accept="image/*" capture="environment">` prompts camera on mobile, file picker on desktop
- **API response shape** — returns `{ merchant, amount, date, items, suggestedCategoryId, categories[] }` which maps directly to form fields

## Acceptance Criteria

- [x] New page at `/dashboard/expenses/receipt` with three-phase flow
- [x] **Upload phase:** file input accepts images (JPEG/PNG/WebP/GIF), shows loading spinner during API call, displays errors via toast
- [x] **Review phase:** pre-fills description (merchant), amount, date, category from API response; all fields editable; category uses grouped dropdown
- [x] **Save phase:** creates expense with `source: "receipt"`, shows success confirmation
- [x] "Scan Receipt" link added to dashboard nav (`nav.tsx`)
- [x] Existing tests still pass (`npx vitest run`)
- [x] Build passes (`npx next build`)

## Implementation Steps

### Step 1: Create receipt page — `src/app/dashboard/expenses/receipt/page.tsx`

Mirror the CSV import pattern:
- `"use client"` component with `phase` state (`"upload" | "review" | "done"`)
- **Upload phase:**
  - `<input type="file" accept="image/*" capture="environment">` with ref
  - Upload button calls `POST /api/receipt` with FormData
  - `useTransition` for loading state, toast for errors
- **Review phase:**
  - Description field pre-filled with `merchant` (editable, plain Input — no autocomplete needed here since data comes from receipt)
  - Amount field with `$` prefix, pre-filled from API
  - Date input pre-filled from API (ISO → `YYYY-MM-DD`)
  - Category dropdown pre-filled with `suggestedCategoryId`, using `categories[]` from API response (already formatted with labels)
  - Items summary shown as read-only text
  - "Save Transaction" and "Back" buttons
- **Save phase:**
  - Call `createExpense()` server action with `source: "receipt"` in FormData
  - Show success card with "Scan Another" and "View Transactions" links

### Step 2: Add nav link — `src/app/dashboard/nav.tsx`

Add "Scan Receipt" entry using existing pattern:
```tsx
<Button variant="ghost" nativeButton={false} render={<Link href="/dashboard/expenses/receipt" />}>
  Scan Receipt
</Button>
```

Place it after "Import CSV" to group the three entry methods together.

### Step 3: Verify

- Run `npx vitest run` — all existing tests pass
- Run `npx next build` — no TypeScript or build errors

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-13-receipt-scanner-brainstorm.md](docs/brainstorms/2026-03-13-receipt-scanner-brainstorm.md) — key decisions: Upload → Review → Save flow, dedicated nav link, camera + file input
- **CSV import pattern:** `src/app/dashboard/expenses/import/page.tsx` — three-phase flow template
- **Receipt API:** `src/app/api/receipt/route.ts` — response shape and error handling
- **Form patterns:** `src/app/dashboard/expenses/new/page.tsx` — category dropdown grouping, amount input styling
- **Nav pattern:** `src/app/dashboard/nav.tsx` — shadcn v4 Button + Link pattern
- GitHub Issue: #4
