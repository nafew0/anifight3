# AniFight - Project Structure

AniFight is a full-stack web game where two players alternately draft random anime characters into team roles. The winner is determined by a scoring formula based on character power, anime power scale, and specialty matching. Supports both local (single-device) and real-time online multiplayer.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend Framework | Django 4.2 + Django REST Framework |
| Database | PostgreSQL 15+ |
| WebSockets | Django Channels + Daphne (ASGI) |
| Cache / Pub-Sub | Redis (required for multiplayer) |
| Authentication | JWT (simplejwt) + Google OAuth (django-allauth) |
| Frontend Framework | React 19 + Vite 7 |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion |
| Drag & Drop | dnd-kit |
| Audio | Howler.js |

## Quick Start

### Running the Project (Single-player mode)

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python manage.py runserver  # http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev  # http://localhost:5173
```

### Running with Multiplayer Support

For online multiplayer, you **must** run Redis and use the ASGI server:

**Terminal 1 - Redis (required!):**
```bash
redis-server  # Port 6379
```

**Terminal 2 - Backend (ASGI server):**
```bash
cd backend
source venv/bin/activate
daphne -b 0.0.0.0 -p 8000 anifight.asgi:application  # http://localhost:8000
```
*Note: `python manage.py runserver` also works since Daphne is configured as the default server*

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev  # http://localhost:5173
```

**Prerequisites:** PostgreSQL must be running with database `anifight_db` created (see [README.md](README.md) for setup)

## Directory Overview

```
AniFight/
├── backend/                  # Django REST API + WebSocket server
├── frontend/                 # React SPA (Vite)
├── docs/                     # Development docs, phase summaries, test scripts
├── scripts/                  # Utility & test scripts (alias for some docs/)
├── README.md                 # Quick-start guide
└── PROJECT_STRUCTURE.md      # This file
```

## Backend Structure

```
backend/
├── anifight/                 # Django project configuration
│   ├── settings.py           # App settings, DB, CORS, JWT, Channels config
│   ├── urls.py               # Root URL routing
│   ├── asgi.py               # ASGI entry point (WebSocket support via Daphne)
│   └── wsgi.py               # WSGI entry point
│
├── game/                     # Core game models
│   ├── models.py             # Anime, Character, GameTemplate, AnimeRating
│   ├── admin.py              # Django admin registration + CSV import/export
│   └── migrations/
│
├── api/                      # REST API layer
│   ├── views.py              # CRUD endpoints for anime, characters, templates
│   ├── content_views.py      # User-generated content & library endpoints
│   ├── serializers.py        # DRF serializers
│   ├── urls.py               # API URL routing (/api/...)
│   ├── scoring.py            # Score calculation & rating logic
│   ├── permissions.py        # Custom DRF permissions
│   └── tests.py
│
├── multiplayer/              # Real-time multiplayer system
│   ├── consumers.py          # WebSocket consumers (game state sync)
│   ├── routing.py            # WebSocket URL routing
│   ├── models.py             # MultiplayerRoom, GameAction (event sourcing)
│   ├── game_state_manager.py # Redis-backed game state management
│   ├── views.py              # Room creation/joining REST endpoints
│   ├── serializers.py
│   └── tests.py
│
├── core/                     # Core utilities
├── media/                    # Uploaded images (anime/, characters/)
├── sample_data/              # Sample CSV datasets for import
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variable template
├── API_DOCUMENTATION.md      # Complete API reference
└── DEPLOYMENT_GUIDE.md       # Production deployment guide
```

### Key Models

| Model | Description |
|-------|------------|
| **Anime** | Anime series with name, image, power scale, public/private visibility, ratings |
| **Character** | Characters belonging to an anime, with power level and specialties (e.g., CAPTAIN, TANK) |
| **GameTemplate** | Defines team roles, specialty multiplier, and rating band thresholds (S/A/B/C/D) |
| **AnimeRating** | Per-user 1-5 star ratings for anime |
| **MultiplayerRoom** | Tracks room code, host/guest, connection state, game status |
| **GameAction** | Event-sourced log of all multiplayer actions (draws, placements) |

### Scoring Formula

```
role_score = character_power x anime_power_scale x specialty_multiplier
```

Where `specialty_multiplier` is applied when the character's specialty matches the assigned role.

## Frontend Structure

```
frontend/
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Root component with React Router
│   ├── index.css               # Global styles (Tailwind)
│   │
│   ├── pages/                  # Route-level page components
│   │   ├── GamePage.jsx        # Main game flow
│   │   ├── AnimePage.jsx       # Anime management (CRUD)
│   │   ├── AnimeDetailPage.jsx # Single anime view with characters
│   │   ├── LibraryPage.jsx     # Public anime library browser
│   │   ├── LibraryDetailPage.jsx
│   │   ├── LoginPage.jsx       # Email + Google OAuth login
│   │   ├── RegisterPage.jsx    # User registration
│   │   ├── MultiplayerCreate.jsx   # Create multiplayer room
│   │   ├── MultiplayerJoin.jsx     # Join via room code / QR
│   │   ├── MultiplayerGameScreen.jsx # Real-time multiplayer game
│   │   └── ComingSoonPage.jsx
│   │
│   ├── components/             # Reusable UI components
│   │   ├── StartScreen.jsx     # Game setup (select template, anime pools)
│   │   ├── DraftScreen.jsx     # Core draft gameplay
│   │   ├── ResultScreen.jsx    # Score display & winner reveal
│   │   ├── Navigation.jsx      # Top navigation bar
│   │   ├── CharacterCard.jsx   # Character display card
│   │   ├── RoleSlot.jsx        # Drag-and-drop team role slot
│   │   ├── DrawButton.jsx      # Character draw trigger
│   │   ├── AnimePoolSelector.jsx   # Anime pool selection UI
│   │   ├── TemplateSelector.jsx    # Game template picker
│   │   ├── RatingBanner.jsx        # Draw quality rating display
│   │   ├── MultiplayerGameBridge.jsx # Bridges multiplayer context to draft
│   │   ├── OfflineIndicator.jsx    # Network status indicator
│   │   ├── ReconnectionOverlay.jsx # WebSocket reconnection UI
│   │   ├── anime/              # Anime CRUD components
│   │   │   ├── AnimeCard.jsx
│   │   │   ├── AnimeForm.jsx
│   │   │   ├── CharacterCard.jsx
│   │   │   └── CharacterForm.jsx
│   │   ├── game/               # Game template components
│   │   │   ├── TemplateCard.jsx
│   │   │   └── TemplateForm.jsx
│   │   └── library/            # Library components
│   │       ├── LibraryAnimeCard.jsx
│   │       └── StarRating.jsx
│   │
│   ├── services/               # External communication
│   │   ├── api.js              # Axios HTTP client & all API calls
│   │   └── websocket.js        # WebSocket client with auto-reconnect
│   │
│   ├── context/                # Game state
│   │   └── GameContext.jsx     # Local game state management
│   │
│   ├── contexts/               # App-wide contexts
│   │   ├── AuthContext.jsx     # Authentication state & JWT management
│   │   └── MultiplayerContext.jsx # Multiplayer room & game state
│   │
│   ├── hooks/                  # Custom React hooks
│   │   └── useWindowDimensions.js
│   │
│   ├── utils/                  # Utilities
│   │   └── soundManager.js    # Audio playback via Howler.js
│   │
│   ├── config/                 # Configuration
│   │   └── colors.js          # Theme color definitions
│   │
│   └── assets/                 # Static assets (images, sounds)
│
├── package.json
├── vite.config.js              # Vite build configuration
├── postcss.config.js           # PostCSS (Tailwind)
├── eslint.config.js            # Linting rules
├── .env.example                # Environment variable template
└── index.html                  # HTML entry point
```

### Frontend Routes

| Path | Page | Auth Required |
|------|------|:------------:|
| `/` | Game flow (Start -> Draft -> Result) | No |
| `/login` | Login | No |
| `/register` | Register | No |
| `/library` | Public anime library | No |
| `/library/:animeId` | Anime detail | No |
| `/game` | Protected game route | Yes |
| `/multiplayer/create` | Create multiplayer room | No |
| `/multiplayer/game/:roomCode` | Multiplayer game | No |
| `/join/:roomCode?` | Join multiplayer room | No |

## Environment Variables

Both backend and frontend use `.env` files. Copy the provided templates to get started:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

See each `.env.example` for all available variables and their descriptions.

## Related Documentation

### Getting Started
- [README.md](README.md) - Quick-start setup guide for local development
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - This file - Complete project structure overview

### Development
- [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) - Complete REST API reference
- [frontend/API_URL_CONFIGURATION.md](frontend/API_URL_CONFIGURATION.md) - API URL configuration

### Deployment
- [DEPLOYMENT_GUIDE_PRODUCTION.md](DEPLOYMENT_GUIDE_PRODUCTION.md) - **Production deployment guide for Ubuntu 20.04 LTS**
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Step-by-step deployment checklist
- [GIT_WORKFLOW.md](GIT_WORKFLOW.md) - Git workflow and update procedures
- [backend/DEPLOYMENT_GUIDE.md](backend/DEPLOYMENT_GUIDE.md) - Backend deployment details
- [frontend/DEPLOYMENT_GUIDE.md](frontend/DEPLOYMENT_GUIDE.md) - Frontend deployment details

### Scripts & Tools
- [deploy.sh](deploy.sh) - Automated production deployment script
- [debug_websocket.md](debug_websocket.md) - WebSocket debugging guide
