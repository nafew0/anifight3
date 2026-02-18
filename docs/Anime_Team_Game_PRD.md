# PRD — “AniFight" - "Draft an Anime Team to Beat Mine” (MVP, Single Device)

## 1) One-line summary
A single-device web game where two players alternately draw random anime characters from an admin-curated pool, drag them into team roles, and the app calculates a winner based on a simple formula.

## 2) Goals (what success looks like)
- **Playable in 2 minutes** with zero login: pick template → pick anime pool → draw → assign → see winner.  
- **Admin-only content curation** with CSV import (name is the only required field).  
- **Fun feel**: fast shuffle animation, simple drag-and-drop, short sound cues, “great/bad draw” pop-ups.  
- **Deterministic scoring** that’s easy to audit.

## 3) Non-Goals (out of scope for MVP)
- No user authentication or accounts.  
- No online multiplayer or websockets.  
- No spectator mode, leaderboards, or tournaments.  
- No per-player inventories or advanced balance rules.

---

## 4) Users
- **Admin** (internal only): creates anime, characters, and templates; bulk uploads via CSV.  
- **Players** (public page, same device): Player 1 (left) and Player 2 (right).

---

## 5) Tech (fixed choices to keep it simple)
- **Backend:** Django 5 + PostgreSQL 15.
- **Admin UI:** Django Admin + `django-import-export` for CSV.  
- **Frontend:** React + Vite + Tailwind CSS.  
- **Animations:** Framer Motion.  
- **Drag & Drop:** dnd-kit.  
- **Sound:** howler.js.  
- **Hosting:** any single VM/VPS or PaaS.  
- **Static files:** served by the frontend build (Vite). Backend exposes JSON.

---

## 6) Data model (minimal, clear)

### 6.1 Tables
**Anime**
- `id` (PK)  
- `name` (string, required, unique within admin scope)  
- `image` (URL or uploaded file, optional)  
- `created_at`, `updated_at`

**Character**
- `id` (PK)  
- `anime_id` (FK → Anime, nullable allowed)  
- `name` (string, required)  
- `image` (URL or uploaded file, optional)  
- `anime_power_scale` (decimal(6,2), default null)  
- `character_power` (decimal(6,2), 1.00–100.00 or null)  
- `specialty` (string, optional; free text like “CAPTAIN”, “TANK”, etc.)  
- `created_at`, `updated_at`

**GameTemplate**
- `id` (PK)  
- `name` (string, required)  
- `roles_json` (JSON, required; default: `["CAPTAIN","VICE CAPTAIN","TANK","HEALER","SUPPORT","SUPPORT"]`)  
- `is_published` (bool; only published shows on play page)  
- `specialty_match_multiplier` (decimal(4,2), default 1.20)  
- `rating_bands_json` (JSON thresholds for draw pop-ups; default see §9)  
- `created_at`, `updated_at`

---

## 7) Public flows
### 7.1 Start screen
1) Select Template  
2) Select Anime Pool (multi-select + “All Anime” option)  
3) Optional nicknames  
4) Start button

Require ≥12 characters total in pool.

### 7.2 Draft screen
- Left = Player 1, Right = Player 2  
- Each side: 6 empty slots per template  
- Turn indicator, Draw button, Mute, Reset

**Draw:**
- POST /api/draw → random character from remaining pool  
- 1.2s shuffle animation → show card  
- Display rating banner (S–D tier) + SFX  
- Player drags/taps to assign  
- Switch turn

### 7.3 Result screen
- Show table per side: Role, Character, APS, CP, Match, RoleScore  
- Totals, Winner banner (animated + SFX)  
- Buttons: Play Again, Home

---

## 8) Scoring
```
specialty_match = (lowercase(character.specialty) == lowercase(role_name))
specialty_multiplier = specialty_match ? 1.20 : 1.00
role_score = round(character_power * anime_power_scale * specialty_multiplier, 2)
```
Total = sum(role_scores).  
Higher total wins. Equal = Draw.

---

## 9) Rating tiers (defaults)
| Tier | Label | Percentile | Motion | SFX |
|------|--------|-------------|--------|-----|
| S | “INSANE PULL!” | ≥90% | Confetti burst | Cheer |
| A | “HUGE WIN!” | 70–90% | Bounce | Cheer |
| B | “Nice pick” | 40–70% | Fade-in | Clap |
| C | “Meh…” | 10–40% | Shake | Neutral crowd |
| D | “Oof.” | <10% | Shrink | Sad trombone |

---

## 10) UI requirements
- Responsive board (2 columns; stacked mobile)  
- Fast shuffle (≈1.2s)  
- Drag & drop with highlight and lock  
- Keyboard/tap alternatives  
- Preload all images & sounds  
- Persist state in localStorage

---

## 11) API endpoints
- `GET /api/templates` → list published templates  
- `GET /api/anime` → list anime  
- `GET /api/characters?anime_ids=…` → list characters  
- `POST /api/draw` → {remainingCharacterIds[]} → random character  
- `POST /api/score` → assignments → totals + winner

---

## 12) Error states
- Pool too small → user message  
- Missing image → placeholder silhouette  
- Audio blocked → “Tap to enable sound” prompt  
- Network fail → retry once or fallback local draw

---

## 13) AI-coding pitfalls & exact prompts

1) **Decimal math** – Use Decimal, not float. Round to 2 decimals.  
2) **Nulls** – Treat missing numbers as 0.  
3) **Specialty match** – Compare lowercased + trimmed.  
4) **Uniform randomness** – Fair random, no repeats.  
5) **Double clicks** – Disable Draw during animation.  
6) **LocalStorage** – Deep clone state, validate on load.  
7) **CSV import** – Trim, UTF-8, tolerate blanks.  
8) **Preload media** – preload images/audio, handle click-to-unmute.  
9) **Mobile drag** – Support touch sensors + tap fallback.  
10) **CORS/CSRF** – Allow frontend origin, never expose admin.  
11) **Percentiles** – Handle small pools safely.  
12) **Accessibility** – Captions + keyboard paths.  
13) **React keys** – Use character.id, not array index.

---

## 14) Acceptance criteria
- Admin CRUD works with import-export; name-only CSV ok.  
- Game runs locally with animations & SFX.  
- No duplicate characters.  
- Winner calculated correctly with Decimal.  
- Works on mobile.  
- Refresh resumes current match.

---

## 15) Milestones
| Day | Deliverable |
|-----|--------------|
| 1–2 | Django models + Admin + CSV import |
| 3–4 | Frontend skeleton (Start → Draft → Result) |
| 5 | Draw API + randomization |
| 6 | Animations + sounds |
| 7 | Scoring + persistence |
| 8 | QA + mobile |
| 9 | Polish & deploy |

---

## 16) QA checks
- Blank numbers don’t crash.  
- Fast double draw ignored.  
- “TANK ” matches “TANK”.  
- Pool of 12 ends cleanly.  
- Audio enable works.

---

## 17) Glossary
APS = Anime Power Scale  
CP = Character Power  
Specialty Match = Role name equals Character specialty (case-insensitive)  
Draw Rating = Tiered feedback S–D based on draw_score percentile
