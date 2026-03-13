# Brainstorm: Receipt Scanner (Issue #4)

**Date:** 2026-03-13
**Status:** Ready for planning

## What We're Building

A receipt scanning feature that lets users upload a photo of a receipt and have the app automatically extract transaction details (merchant, amount, date, items). The user reviews the extracted data in an editable form before saving.

## Why This Approach

- **Upload -> Review -> Save** matches the existing CSV import pattern (upload -> review -> commit), keeping the UX consistent
- Letting users edit before saving builds trust — OCR isn't perfect, and users need to confirm the category, adjust the amount, or fix the date
- A dedicated nav link ("Scan Receipt") makes the feature discoverable alongside "Add Transaction" and "Import CSV"

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UX flow | Upload -> Review -> Save | Consistent with CSV import; lets user verify/edit before committing |
| Navigation | New "Scan Receipt" nav link | Parallel to other entry methods; easy to find |
| Upload method | Camera + file picker | Single `<input accept="image/*" capture="environment">` handles both mobile camera and desktop file picker |
| API | Already built | `POST /api/receipt` accepts image, returns extracted data via Claude vision |
| Source tracking | `source: "receipt"` | Distinguish receipt-scanned entries from manual/csv/pdf in the database |

## What Already Exists

- **API route** (`src/app/api/receipt/route.ts`): Fully implemented. Accepts image (JPEG/PNG/WebP/GIF, max 10MB), sends to Claude Sonnet 4 vision, returns merchant, amount, date, items, suggested category ID, and full category list.
- **Anthropic SDK** (`@anthropic-ai/sdk`): Already in package.json.
- **Category auto-matching**: API route already matches extracted merchant/items against CategorizationRule keywords.

## What Needs to Be Built

1. **Receipt upload page** (`/dashboard/expenses/receipt`) — three phases:
   - **Phase 1 (Upload):** File input with camera support, drag-and-drop optional, upload button
   - **Phase 2 (Review):** Pre-filled editable form showing extracted merchant (as description), amount, date, category (with full dropdown), items summary
   - **Phase 3 (Saved):** Success confirmation with link to view transaction
2. **Nav link** in `nav.tsx` — "Scan Receipt" entry
3. **Server action or form handler** — calls existing API route, then creates expense with `source: "receipt"`

## Open Questions

None — all key decisions resolved.
