# AniFight - Draft an Anime Team to Beat Mine

A single-device web game where two players alternately draft random anime characters into team roles, with the winner determined by a simple scoring formula.

## Tech Stack

- **Backend**: Django 4.2 + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS
- **Additional Libraries**: Framer Motion, dnd-kit, howler.js

## Project Structure

```
AniFight/
├── backend/                # Django backend
│   ├── anifight/          # Main project settings
│   ├── game/              # Game models (Anime, Character, GameTemplate)
│   ├── api/               # REST API endpoints
│   ├── core/              # Core utilities
│   └── manage.py          # Django management script
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service layer
│   │   ├── utils/         # Utility functions
│   │   ├── hooks/         # Custom React hooks
│   │   └── context/       # React context providers
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.9+
- PostgreSQL 15+ (running locally)
- Node.js 18+ and npm
- Redis (required for multiplayer WebSocket support)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install django psycopg2-binary djangorestframework django-cors-headers django-import-export pillow
   ```

4. Set up environment variables (optional):
   ```bash
   export DB_NAME=anifight_db
   export DB_USER=postgres
   export DB_PASSWORD=postgres
   export DB_HOST=localhost
   export DB_PORT=5432
   ```

5. Create the database:
   ```bash
   psql -U postgres -c "CREATE DATABASE anifight_db;"
   # Or use your current user:
   psql -U $USER -c "CREATE DATABASE anifight_db;"
   ```

6. Run migrations:
   ```bash
   python manage.py migrate
   ```

7. Create a superuser (for Django Admin):
   ```bash
   python manage.py createsuperuser
   # Username: admin
   # Email: admin@anifight.com
   # Password: admin123
   ```

8. Start the development server:

   **For single-player mode:**
   ```bash
   python manage.py runserver
   ```

   **For multiplayer mode (with WebSocket support):**
   ```bash
   # First, start Redis in a separate terminal:
   redis-server

   # Then start the ASGI server:
   daphne -b 0.0.0.0 -p 8000 anifight.asgi:application
   ```

   Backend will be available at: http://localhost:8000
   Django Admin: http://localhost:8000/admin

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file (already exists):
   ```
   VITE_API_URL=http://localhost:8000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   Frontend will be available at: http://localhost:5173

## Running Both Servers

### Single-Player Mode (2 terminals)

Terminal 1 (Backend):
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### Multiplayer Mode (3 terminals)

Terminal 1 (Redis - required!):
```bash
redis-server
```

Terminal 2 (Backend with WebSocket):
```bash
cd backend
source venv/bin/activate
daphne -b 0.0.0.0 -p 8000 anifight.asgi:application
```

Terminal 3 (Frontend):
```bash
cd frontend
npm run dev
```

### Option 2: Background Processes

```bash
# Start backend in background
cd backend && source venv/bin/activate && python manage.py runserver &

# Start frontend
cd frontend && npm run dev
```

## Database Models

### Anime
- `name` (string, unique, required)
- `image` (URL, optional)
- `created_at`, `updated_at`

### Character
- `anime_id` (FK to Anime, nullable)
- `name` (string, required)
- `image` (URL, optional)
- `anime_power_scale` (decimal 6,2, nullable) - APS
- `character_power` (decimal 6,2, 1.00-100.00, nullable) - CP
- `specialty` (string, optional) - e.g., "CAPTAIN", "TANK"
- `created_at`, `updated_at`

### GameTemplate
- `name` (string, required)
- `roles_json` (JSON array, default: ["CAPTAIN","VICE CAPTAIN","TANK","HEALER","SUPPORT","SUPPORT"])
- `is_published` (boolean, default: false)
- `specialty_match_multiplier` (decimal 4,2, default: 1.20)
- `rating_bands_json` (JSON object with S/A/B/C/D tier thresholds)
- `created_at`, `updated_at`

## Development Status

### Phase 1: Project Setup & Database Foundation ✅ COMPLETED
- [x] Django project initialized with PostgreSQL
- [x] Database models created (Anime, Character, GameTemplate)
- [x] React + Vite frontend setup
- [x] Tailwind CSS configured
- [x] API service layer created
- [x] Both servers running locally

### Phase 2: Django Admin & CSV Import (NEXT)
- [ ] Register models in Django Admin
- [ ] Configure CSV import/export
- [ ] Add sample data

### Future Phases
- Phase 3: REST API Development
- Phase 4: Start Screen & Game Setup UI
- Phase 5: Draft Screen - Core Gameplay
- Phase 6: Sound, Animations & Polish
- Phase 7: Result Screen, Persistence & Final Testing

## Useful Commands

### Backend
```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver

# Django shell
python manage.py shell
```

### Frontend
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database
```bash
# Access PostgreSQL
psql -U postgres -d anifight_db

# List tables
\dt

# Describe table
\d game_anime

# Drop database (DANGER!)
psql -U postgres -c "DROP DATABASE anifight_db;"
```

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

**Database connection error:**
- Ensure PostgreSQL is running
- Check database credentials in settings.py
- Verify database exists: `psql -U postgres -l`

### Frontend Issues

**Port already in use:**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

**Tailwind not working:**
- Check tailwind.config.js content paths
- Ensure @tailwind directives are in index.css
- Restart dev server

## License

This project is for educational purposes.
