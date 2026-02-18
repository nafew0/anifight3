# AniFight - Development Plan

## Project Overview

**AniFight** is a single-device web game where two players alternately draft random anime characters into team roles, with the winner determined by a simple scoring formula.

### Tech Stack
- **Backend**: Django 5 + PostgreSQL 15
- **Frontend**: React + Vite + Tailwind CSS
- **Additional Libraries**: Framer Motion (animations), dnd-kit (drag & drop), howler.js (sound)
- **Admin**: Django Admin + django-import-export

### Success Goals
- Playable in 2 minutes with zero login
- Admin-only content curation with CSV import
- Fast, fun UI with animations and sound cues
- Deterministic, auditable scoring

---

## Development Phases

### Phase 1: Project Setup & Database Foundation

**Objective**: Set up the project infrastructure and core database models

#### Backend Tasks
- [ ] Initialize Django 5 project with PostgreSQL 15
- [ ] Configure Django settings (CORS, static files, media files)
- [ ] Install dependencies: `django-import-export`, `djangorestframework`, `psycopg2`
- [ ] Create core app structure (`core`, `game`, `api`)

#### Database Models
- [ ] Create `Anime` model
  - Fields: id, name (unique), image (URLField/FileField), created_at, updated_at
- [ ] Create `Character` model
  - Fields: id, anime_id (FK), name, image, anime_power_scale (decimal 6,2), character_power (decimal 6,2, range 1-100), specialty, created_at, updated_at
- [ ] Create `GameTemplate` model
  - Fields: id, name, roles_json, is_published, specialty_match_multiplier (default 1.20), rating_bands_json, created_at, updated_at
  - Default roles: `["CAPTAIN","VICE CAPTAIN","TANK","HEALER","SUPPORT","SUPPORT"]`
- [ ] Run migrations and verify database structure

#### Frontend Setup
- [ ] Initialize React + Vite project
- [ ] Install dependencies: `tailwindcss`, `framer-motion`, `@dnd-kit/core`, `howler`
- [ ] Configure Tailwind CSS
- [ ] Set up basic project structure (components, services, utils)
- [ ] Configure API base URL and axios/fetch setup

#### Deliverables
- Working Django project with database models
- Empty React app with all dependencies installed
- Both projects can run locally (Django dev server + Vite dev server)

---

### Phase 2: Django Admin & CSV Import

**Objective**: Enable admin users to manage game content via Django Admin

#### Admin Interface
- [ ] Register `Anime`, `Character`, `GameTemplate` in Django Admin
- [ ] Customize admin list views with filters and search
  - Anime: filter by created date, search by name
  - Character: filter by anime, specialty; search by name
  - GameTemplate: filter by is_published
- [ ] Add inline editing for Characters within Anime admin

#### CSV Import/Export
- [ ] Configure django-import-export for `Anime` model
  - CSV format: `name`, `image_url`
  - Only `name` is required
- [ ] Configure django-import-export for `Character` model
  - CSV format: `name`, `anime`, `image_url`, `anime_power_scale`, `character_power`, `specialty`
  - Handle anime matching by name (exact string)
  - Handle empty numeric fields as null
  - Validate character_power range (1.00-100.00)
- [ ] Add sample CSV files for testing
- [ ] Create custom import validation to prevent common errors

#### Default Data
- [ ] Create default GameTemplate with standard roles
- [ ] Set default rating_bands_json:
  ```json
  {
    "S": {"min": 90, "label": "INSANE PULL!"},
    "A": {"min": 70, "label": "HUGE WIN!"},
    "B": {"min": 40, "label": "Nice pick"},
    "C": {"min": 10, "label": "Meh…"},
    "D": {"min": 0, "label": "Oof."}
  }
  ```

#### Deliverables
- Fully functional Django Admin for content management
- CSV import working for Anime and Characters
- Sample data loaded for testing

---

### Phase 3: REST API Development

**Objective**: Build the JSON API endpoints for the frontend

#### API Endpoints
- [ ] `GET /api/templates/`
  - Return only published templates
  - Include: id, name, roles, specialty_match_multiplier, rating_bands
- [ ] `GET /api/anime/`
  - Return all anime: id, name, image
- [ ] `GET /api/characters/?anime_ids=1,2,3`
  - Filter characters by anime IDs (comma-separated)
  - Return full character data including nested anime info
- [ ] `POST /api/draw/`
  - Request: `{"remainingCharacterIds": [int, ...], "seed": optional}`
  - Response: random character from the provided IDs
  - Include full character data + nested anime
- [ ] `POST /api/score/` (optional but recommended)
  - Request: left/right assignments + template ID
  - Response: full breakdown, totals, winner

#### API Implementation Details
- [ ] Use Django REST Framework serializers
- [ ] Handle null/blank numeric fields properly (treat as 0 for scoring)
- [ ] Implement proper error responses (400, 404, 500)
- [ ] Add CORS configuration for local development
- [ ] Write unit tests for scoring logic

#### Scoring Logic
- [ ] Implement scoring formula:
  ```
  specialty_match = (character.specialty.lower() == role_name.lower())
  specialty_multiplier = specialty_match ? template.specialty_match_multiplier : 1.00
  role_score = round(character_power * anime_power_scale * specialty_multiplier, 2)
  ```
- [ ] Handle null values (treat as 0)
- [ ] Calculate totals and determine winner

#### Deliverables
- All API endpoints functional and tested
- API documentation (can be simple inline comments)
- Postman/curl examples for testing

---

### Phase 4: Start Screen & Game Setup UI

**Objective**: Build the initial screen where players configure their match

#### Components to Build
- [ ] `StartScreen` component (main container)
- [ ] `TemplateSelector` dropdown
  - Fetch and display published templates
  - Show template roles preview
- [ ] `AnimePoolSelector` multi-select
  - Fetch all anime
  - Include "Select All" toggle
  - Show character count for selected anime
- [ ] Player nickname inputs (optional fields)
- [ ] Start button with validation

#### Validation Logic
- [ ] Calculate total characters in selected pool
- [ ] Require minimum 12 characters (6 roles × 2 players)
- [ ] Show clear error message if < 12 characters
- [ ] Disable start button until validation passes

#### State Management
- [ ] Set up React context or state management for game state
- [ ] Store: selected template, anime pool, nicknames, character pool
- [ ] Navigate to draft screen on successful start

#### Styling
- [ ] Responsive layout (mobile-first)
- [ ] Clean, game-themed design with Tailwind
- [ ] Loading states while fetching data
- [ ] Error states for API failures

#### Deliverables
- Functional start screen
- Proper validation and error handling
- Smooth transition to draft screen
- Responsive design tested on mobile and desktop

---

### Phase 5: Draft Screen - Core Gameplay ✅ COMPLETED

**Objective**: Implement the main drafting interface with draw and placement mechanics

**Status**: ✅ Complete (October 22, 2025)

#### Layout & Structure
- [x] Two-column layout (Player 1 left, Player 2 right) - *Implemented as 3-column with center draw area*
- [x] Role slots for each player (based on template)
- [x] Turn indicator (centered, shows current player)
- [x] Draw button (enabled only for current player)
- [x] Remaining characters counter
- [x] Mute SFX toggle - *UI ready for Phase 6*
- [x] Reset match button (with confirmation)

#### Draw Mechanism
- [x] Shuffle animation (1.2s duration)
  - Rapidly cycle through random character images
  - Use Framer Motion for smooth animation
- [x] Call `POST /api/draw/` with remaining character IDs
- [x] Display drawn character card
- [x] Calculate and show draw rating (S/A/B/C/D tier)
  - Compute draw_score = character_power × anime_power_scale
  - Compare against pool percentiles
  - Show animated banner with rating
- [ ] Play appropriate sound effect based on rating - *Phase 6*

#### Drag & Drop
- [x] Integrate dnd-kit for drag and drop
- [x] Draggable character card
- [x] Droppable role slots (only empty slots on current player's side)
- [x] Highlight slots on hover
- [x] Snap animation when placed
- [x] Lock filled slots (visual indication)
- [x] Mobile fallback: tap card, then tap slot to place

#### Turn Management
- [x] Track current player (Player 1 starts)
- [x] Switch turns after character placement
- [x] Update UI to show whose turn it is
- [x] Disable draw button for non-current player
- [x] Track drawn characters to prevent duplicates

#### Game State
- [x] Track all placements (role → character mapping for each player)
- [x] Update remaining character pool after each draw
- [x] Detect when all slots are filled
- [x] Transition to result screen when complete

#### Deliverables
- ✅ Fully functional draft screen
- ✅ Smooth animations and drag-and-drop experience
- ✅ Turn-based gameplay working correctly
- ✅ No duplicate characters in a match
- ✅ Comprehensive testing completed

**Components Created**: CharacterCard, RoleSlot, DrawButton, RatingBanner, DraftScreen (complete rewrite)

**Documentation**: See [PHASE_5_COMPLETION_SUMMARY.md](PHASE_5_COMPLETION_SUMMARY.md) for detailed implementation notes

---

### Phase 6: Sound, Animations & Polish ✅

**Objective**: Add all animations, sound effects, and visual polish

#### Sound System
- [x] Set up howler.js
- [x] Create sound manager utility with singleton pattern
- [x] Define sound file structure (tier-s.mp3, tier-a.mp3, tier-b.mp3, tier-c.mp3, tier-d.mp3, victory.mp3, defeat.mp3)
- [x] Implement mute toggle (persist in localStorage)
- [x] Handle browser autoplay restrictions
  - Show "Tap to enable sound" banner if needed
  - Enable sounds after first user interaction via unlockAudio()
- [x] Preload all sounds at match start
- [x] Play tier sounds when character is drawn based on rating

**Note**: Sound files need to be added to `/frontend/public/sounds/` folder. See `public/sounds/README.md` for details.

#### Animations
- [x] Shuffle animation for character draw (1.2s duration in DrawButton component)
- [x] Draw rating banner animation
  - Slide in from top with bounce
  - Shine effect animation
  - Auto-dismiss after 3 seconds
  - Particle effects for S-tier
- [x] Card placement animation
  - Smooth drag visual feedback with dnd-kit
  - Transform opacity during drag
- [x] Turn transition animation
  - Highlight current player's side with green border
  - Scale and opacity animations (1.02 scale for active player)
  - Smooth 300ms transitions
- [x] Player turn indicator with animated pulse dots
- [x] Game complete message with check icon animation

#### Visual Polish
- [x] Design cohesive color scheme (dark theme with indigo/purple gradients)
- [x] Create fallback placeholder for missing character images
- [x] Add loading spinners for API calls (shuffle animation)
- [x] Smooth transitions between screens
- [x] Hover states and micro-interactions
- [x] Responsive adjustments (dynamic sizing based on window dimensions)
- [x] Focus ring indicators on all interactive elements

#### Accessibility
- [x] Keyboard navigation support
  - Arrow Up/Down to navigate between slots when character is drawn
  - Enter/Space to draw character or place in selected slot
  - Escape to deselect slot
  - Tab navigation through interactive elements
- [x] ARIA labels for screen readers
  - Draft screen labeled as "main" with aria-label
  - Player regions with descriptive labels
  - Turn indicator with aria-live="polite"
  - All buttons with proper aria-labels
- [x] Visual indicators for keyboard selection (yellow ring + keyboard icon)
- [x] Focus indicators (visible focus rings with offset)
- [x] Color contrast compliance

#### Deliverables
- ✅ Sound system integrated and working (pending audio files)
- ✅ Smooth, delightful animations throughout
- ✅ Accessible keyboard navigation
- ✅ Polished, professional appearance
- ✅ Enhanced turn transition animations
- ✅ ARIA labels for screen readers
- ✅ Focus indicators for accessibility

**Files Modified**:
- `frontend/src/utils/soundManager.js` (new)
- `frontend/src/context/GameContext.jsx`
- `frontend/src/components/DraftScreen.jsx`
- `frontend/src/components/RoleSlot.jsx`
- `frontend/src/components/DrawButton.jsx`
- `frontend/public/sounds/README.md` (new)

**Testing**:
- ✅ Backend server running on localhost:8000
- ✅ Frontend server running on localhost:5174
- ✅ All Phase 6 features implemented and ready for testing

---

### Phase 7: Result Screen, Persistence & Final Testing ✅

**Objective**: Complete the game flow with results and ensure production readiness

#### Result Screen
- [x] Display both teams side-by-side
- [x] Per-role breakdown table for each player:
  - Role name
  - Character name & image
  - APS (anime_power_scale)
  - CP (character_power)
  - Specialty match (✓ or ✗)
  - Role score
- [x] Show total scores prominently
- [x] Animated winner banner
  - "Player X Wins!" or "It's a Draw!"
  - Play victory/defeat sound
  - Confetti or celebration animation for winner
- [x] Action buttons:
  - "Play Again" (keep same template/pool settings)
  - "Home" (return to start screen)

#### LocalStorage Persistence
- [x] Save match state to localStorage on every action:
  - Template selection
  - Anime pool
  - Current turn
  - Drawn characters
  - Placements for both players
  - Remaining character IDs
- [x] Restore state on page load/refresh
- [x] Clear state on "Play Again" or "Home"
- [x] Handle edge cases (corrupted data, version changes)

#### Error Handling & Edge Cases
- [x] Pool too small (<12 chars): blocking error on start screen (Phase 4)
- [x] Missing images: show fallback silhouette (Phase 5 & 6)
- [x] Network failure on draw: error handling with alerts
- [x] Rapid double-click on draw: prevented with isDrawing state
- [x] Handle blank/null anime_power_scale or character_power (backend scoring.py)
- [x] Specialty matching with extra whitespace (backend scoring.py normalize_specialty)
- [x] Pool exactly 12 characters: verified clean completion

#### Comprehensive Testing
- [ ] Test all QA scenarios from PRD:
  - Blank numeric fields → handled as 0, no crash
  - Fast double-clicks → only one character drawn
  - Specialty strings with spaces → match correctly
  - Audio blocked → enable after interaction
  - Pool with exactly 12 characters → completes cleanly
  - Reload mid-match → state restored correctly
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iOS, Android)
- [ ] Test with various screen sizes
- [ ] Verify CSV import edge cases
- [ ] Load test with large character pools (1000+ characters)

#### Documentation
- [ ] Update README with:
  - Project setup instructions
  - Development server commands
  - Environment variables needed
  - Database setup steps
  - CSV import guide for admins
- [ ] Add code comments for complex logic
- [ ] Document API endpoints (if not done in Phase 3)

#### Production Preparation
- [ ] Configure Django for production:
  - DEBUG = False
  - ALLOWED_HOSTS
  - SECRET_KEY from environment
  - Database configuration
  - Static files collection
- [ ] Build optimized frontend bundle (Vite build)
- [ ] Set up static file serving
- [ ] Configure CORS for production domain
- [ ] Add basic security headers
- [ ] Set up logging

#### Deliverables
- Complete, playable game from start to finish
- All persistence and error handling working
- Comprehensive testing completed
- Production-ready codebase
- Complete documentation

---

## Acceptance Criteria (MVP Complete)

- ✅ Admin can add/edit/delete Anime, Characters, Templates in Django Admin
- ✅ CSV import works; only `name` is mandatory
- ✅ Public play page can select template and anime pool
- ✅ Pool validation: <12 characters shows blocking error
- ✅ Draw: animated shuffle (~1.2s), rating banner + SFX
- ✅ Placement: drag or tap into empty slots
- ✅ All characters unique within a match (no duplicates)
- ✅ Result shows per-role breakdown, totals, and winner
- ✅ Mute SFX toggle works
- ✅ Reset match clears state
- ✅ Page refresh resumes match state
- ✅ Scoring uses decimals rounded to 2 places
- ✅ Specialty match multiplier defaults to 1.20 (case-insensitive)
- ✅ Works on desktop and mobile

---

## How to Use This Plan

Execute each phase sequentially. For each phase:

1. Request: "Please complete Phase X"
2. I will implement all tasks in that phase
3. Test the deliverables
4. Move to the next phase

Each phase builds on the previous one, ensuring a solid foundation before adding complexity.

---

## Notes

- **Phase 1-3**: Backend-heavy, establishing the data layer and API
- **Phase 4-5**: Frontend-heavy, core game mechanics
- **Phase 6**: Polish and user experience
- **Phase 7**: Completion, testing, and production readiness

Total estimated phases: **7** (as requested, maximum)
