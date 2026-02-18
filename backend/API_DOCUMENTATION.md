# AniFight API Documentation

## Base URL
```
http://localhost:8000/api/
```

## Endpoints

### 1. GET /api/templates/
Returns all published game templates with their configuration.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Standard 6v6",
    "roles": ["CAPTAIN", "VICE CAPTAIN", "TANK", "HEALER", "SUPPORT", "SUPPORT"],
    "specialty_match_multiplier": "1.20",
    "rating_bands": {
      "S": {"min": 90, "label": "INSANE PULL!"},
      "A": {"min": 70, "label": "HUGE WIN!"},
      "B": {"min": 40, "label": "Nice pick"},
      "C": {"min": 10, "label": "Meh…"},
      "D": {"min": 0, "label": "Oof."}
    }
  }
]
```

**Example:**
```bash
curl http://localhost:8000/api/templates/
```

---

### 2. GET /api/anime/
Returns all anime series.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Naruto",
    "image": "http://localhost:8000/media/anime/naruto.jpg"
  }
]
```

**Example:**
```bash
curl http://localhost:8000/api/anime/
```

---

### 3. GET /api/characters/
Returns characters, optionally filtered by anime IDs.

**Query Parameters:**
- `anime_ids` (optional): Comma-separated list of anime IDs

**Response:**
```json
[
  {
    "id": 1,
    "name": "Naruto Uzumaki",
    "image": "http://localhost:8000/media/characters/naruto.jpg",
    "anime": {
      "id": 1,
      "name": "Naruto",
      "image": "http://localhost:8000/media/anime/naruto.jpg"
    },
    "anime_power_scale": "8.50",
    "character_power": "85.00",
    "specialties": ["CAPTAIN", "TANK"]
  }
]
```

**Examples:**
```bash
# Get all characters
curl http://localhost:8000/api/characters/

# Get characters from specific anime
curl "http://localhost:8000/api/characters/?anime_ids=1,2,3"
```

---

### 4. POST /api/draw/
Draws a random character from the remaining pool.

**Request Body:**
```json
{
  "remainingCharacterIds": [1, 2, 3, 4, 5],
  "seed": 12345  // optional, for reproducible testing
}
```

**Response:**
```json
{
  "character": {
    "id": 3,
    "name": "Sasuke Uchiha",
    "image": "http://localhost:8000/media/characters/sasuke.jpg",
    "anime": {
      "id": 1,
      "name": "Naruto",
      "image": "http://localhost:8000/media/anime/naruto.jpg"
    },
    "anime_power_scale": "8.50",
    "character_power": "90.00",
    "specialties": ["CAPTAIN"],
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/draw/ \
  -H "Content-Type: application/json" \
  -d '{
    "remainingCharacterIds": [1, 2, 3, 4, 5]
  }'
```

---

### 5. POST /api/score/
Calculates the final score for both teams and determines the winner.

**Request Body:**
```json
{
  "templateId": 1,
  "leftTeam": {
    "assignments": [
      {"role": "CAPTAIN", "characterId": 1},
      {"role": "VICE CAPTAIN", "characterId": 2},
      {"role": "TANK", "characterId": 3},
      {"role": "HEALER", "characterId": 4},
      {"role": "SUPPORT", "characterId": 5},
      {"role": "SUPPORT", "characterId": 6}
    ]
  },
  "rightTeam": {
    "assignments": [
      {"role": "CAPTAIN", "characterId": 7},
      {"role": "VICE CAPTAIN", "characterId": 8},
      {"role": "TANK", "characterId": 9},
      {"role": "HEALER", "characterId": 10},
      {"role": "SUPPORT", "characterId": 11},
      {"role": "SUPPORT", "characterId": 12}
    ]
  }
}
```

**Response:**
```json
{
  "leftTeam": {
    "breakdown": [
      {
        "role": "CAPTAIN",
        "character_id": 1,
        "character_name": "Naruto Uzumaki",
        "character_image": "http://localhost:8000/media/characters/naruto.jpg",
        "anime_name": "Naruto",
        "anime_power_scale": "8.50",
        "character_power": "85.00",
        "specialties": ["CAPTAIN"],
        "specialty_match": true,
        "specialty_multiplier": "1.20",
        "role_score": "867.00"
      }
    ],
    "total": "5200.50"
  },
  "rightTeam": {
    "breakdown": [...],
    "total": "4800.25"
  },
  "winner": "left"  // or "right" or "draw"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/score/ \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": 1,
    "leftTeam": {
      "assignments": [
        {"role": "CAPTAIN", "characterId": 1}
      ]
    },
    "rightTeam": {
      "assignments": [
        {"role": "CAPTAIN", "characterId": 2}
      ]
    }
  }'
```

---

## Scoring Formula

The scoring system uses the following formula:

```
specialty_match = (lowercase(character.specialty) == lowercase(role_name))
specialty_multiplier = specialty_match ? template.specialty_match_multiplier : 1.00
role_score = round(character_power * anime_power_scale * specialty_multiplier, 2)
```

### Key Features:
- **Decimal Precision**: All calculations use Python's `Decimal` type to avoid floating-point errors
- **Null Handling**: Null values for `character_power` or `anime_power_scale` are treated as 0
- **Case-Insensitive Matching**: Specialty matching is case-insensitive with whitespace trimming
- **Rounding**: All scores are rounded to 2 decimal places using standard rounding (ROUND_HALF_UP)

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid anime_ids format. Expected comma-separated integers."
}
```

### 404 Not Found
```json
{
  "error": "Character with ID 999 not found"
}
```

### 400 Bad Request (Validation)
```json
{
  "remainingCharacterIds": ["This field is required."]
}
```

---

## CORS Configuration

The API is configured to accept requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative React port)
- `http://127.0.0.1:5173`
- `http://127.0.0.1:3000`

---

## Media Files

Media files (images) are served from `/media/` in development:
- Anime images: `/media/anime/`
- Character images: `/media/characters/`

All image URLs in API responses are absolute URLs (e.g., `http://localhost:8000/media/...`)

---

## Testing

### Run Unit Tests
```bash
cd backend
source venv/bin/activate
python manage.py test api.tests.ScoringTestCase
```

### Start Development Server
```bash
cd backend
source venv/bin/activate
python manage.py runserver 8000
```

---

## Notes

1. **No Authentication**: The MVP has no authentication; all endpoints are public
2. **Admin Only**: Content creation (Anime, Characters, Templates) is done through Django Admin
3. **Published Templates**: Only templates with `is_published=True` appear in the `/api/templates/` endpoint
4. **Character Pool**: The frontend is responsible for managing which characters have been drawn (to prevent duplicates)
