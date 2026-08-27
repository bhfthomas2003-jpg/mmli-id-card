# MMLI Credential Studio

Official credential card generator for **Mind Masters Liberia Initiative** — "Unleashing the Genius Within."

## What's in this folder

| File | Purpose |
|---|---|
| `index.html` | The app shell — structure, views, modals |
| `style.css` | The full design system (navy/gold identity, three card families, animations, responsive layout) |
| `script.js` | All application logic — forms, card rendering, QR codes, ID generation, storage, exports |
| `assets.js` | Your MMLI logo and Executive signature, embedded as base64 — **nothing to upload separately** |

## Deploying to GitHub Pages

1. Create a new GitHub repository (or use an existing one).
2. Upload all four files to the repository root, keeping the filenames exactly as they are.
3. In the repo, go to **Settings → Pages**, set the source to your default branch (`main`) and root folder.
4. Wait a minute for GitHub to publish, then open the URL GitHub gives you — the studio works immediately, no build step, no server, no database.

That's it. Because the logo and signature are embedded directly in `assets.js`, there are no separate image files to keep track of or accidentally leave behind.

## What it does

- **10 credential types** across 3 visually distinct design families:
  - *Participant family* (energetic navy/gold, geometric motif) — Academic Participant, Team Captain, Team Member, National Team Member
  - *Staff family* (executive, restrained, gold accent line) — Staff, Coach/Trainer, Volunteer, Coordinator
  - *Official family* (premium, guilloché security pattern, gold seal) — Official, VIP/Guest
- Live front/back card preview that updates as you type
- Photo upload with drag-to-reposition and zoom cropping
- Automatic unique credential IDs (`MMLI-P-2026-00001` style) with no duplicates
- Auto-generated QR codes that open a verification view (VALID / REVOKED / EXPIRED)
- PNG, JPG, and print-ready PDF export, plus direct printing
- Bulk generation from a CSV roster
- Search, edit, revoke, and delete from the Manage view
- A dashboard with live counts by credential type
- Event/program management so the same studio works for any MMLI competition, camp, or workshop
- Branding, backup export/import, and full data reset in Settings
- Everything is saved to the browser's local storage — no backend, no account, no database required for this version. (The storage layer is written as a small adapter so it can be pointed at Firebase/Supabase/a real API later without reworking the app.)

## Notes on data

All credentials, events, and settings live in **this browser's local storage only**. They do not sync between devices and will be lost if the browser's site data is cleared. Use **Settings → Export backup (JSON)** periodically, especially before a competition, and **Import backup** to restore or move data to another device/browser.

## Browser support

Built and tested for modern Android, iOS, and desktop browsers (Chrome, Safari, Edge, Firefox). Requires internet access on first load for three small libraries (QR codes, image export, PDF export) loaded from a public CDN — after that, everything else runs locally.
