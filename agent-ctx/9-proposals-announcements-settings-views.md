# Task 9 — Proposals / Announcements / Settings Views

**Agent:** Z.ai Code (view-builder — proposals/announcements/settings)
**Task ID:** 9
**Date:** 2025-08

## Files Created

1. `src/components/app/views/proposals-view.tsx` — `ProposalsView`
2. `src/components/app/views/announcements-view.tsx` — `AnnouncementsView`
3. `src/components/app/views/settings-view.tsx` — `SettingsView`

## API Contracts Used

- `GET /api/proposals?status=&mine=1` returns `BookProposal[]` with `member` (id, fullName, memberNumber, category, classGrade) + `reviewer` (name) or null.
- `POST /api/proposals` body `{ title, author, publisher, isbn, reason }` (member-only, requires `user.member`).
- `PUT /api/proposals` body `{ id, status: "APPROVED"|"REJECTED", reviewNote }` (librarian-only).
- `GET /api/announcements` returns `Announcement[]` with `author: { name } | null`, ordered pinned-first then publishedAt desc.
- `POST /api/announcements` body `{ title, content, isPinned }` (librarian-only, sends notifications to all members).
- `PUT /api/announcements` body `{ id, title, content, isPinned }` (librarian-only).
- `DELETE /api/announcements?id=xxx` (librarian-only).
- `GET /api/settings` returns `Record<string,string>`.
- `PUT /api/settings` body `{ key: value, ... }` (librarian-only, upsert).
- `GET /api/categories` / `POST /api/categories { name, code, description }` (librarian-only POST).
- `GET /api/locations` / `POST /api/locations { name, code, description }` (librarian-only POST).

## Key Implementation Notes

- **Role branching in proposals-view**: `useMemo` builds the URL with `mine=1` for TEACHER/STUDENT and (optionally) `status=` from the filter tab. Librarian sees all + gets approve/reject buttons; member sees only their own + gets "Ajukan Buku" button.
- **Render-time state sync in settings-view**: Used the React-endorsed "adjust state during render" pattern (with `identityReady`/`rulesReady` flags) instead of `useEffect`+`setState` to avoid the `react-hooks/set-state-in-effect` lint rule. Settings are loaded once into the form; subsequent `refetchSettings()` after save does NOT clobber the form (desired — we keep the user's input).
- **Relative time helper** in announcements-view: simple `relativeTime(date)` computes "Baru saja" / "X menit/jam/hari/minggu/bulan/tahun lalu" without external libs.
- **Reject flow** in proposals-view uses a separate Dialog (not AlertDialog) because it needs a Textarea for the review note — submit via form.
- **Pin toggle** in announcements-view does a PUT with the existing title/content + flipped `isPinned` (the API requires all three fields on PUT).
- **Icon sizes**: avoided non-standard `h-4.5 w-4.5`; used `h-5 w-5` for section header icons inside `h-9 w-9` rounded boxes (consistent with PageHeader's `h-5 w-5` inside `h-11 w-11`).

## Lint Status

`bun run lint` → 0 errors in the 3 new files. Only pre-existing warning in `src/hooks/use-fetch.ts` (unused eslint-disable directive) — not part of this task.

## Conventions Followed

- `"use client";` at top of every file.
- `@/` import alias throughout.
- Bahasa Indonesia for all labels & toast messages.
- shadcn/ui components only (Button, Input, Label, Textarea, Card, Badge, Table, Tabs, Dialog, AlertDialog, Switch, Separator).
- lucide-react icons.
- sonner toast for feedback.
- Card padding `p-4`/`p-6`; long lists use `max-h-96`/`max-h-[700px]`/`max-h-[750px] overflow-y-auto scrollbar-thin`.
- Responsive mobile-first (grid breakpoints `sm:`/`md:`/`lg:`).
- `useFetch` + `api` (api-client) + `useAppStore` per KONVENSI PENULISAN VIEW.
- Shared components: `PageHeader`, `EmptyState`, `StatCard`.
- No new routes/APIs. No tests.
