# Additional Development Plan: User Authentication & Content Management

## Overview
This plan extends the current AniFight application to add user authentication, personalized content management, content sharing, and a public library while keeping the existing single-device mode fully intact for non-logged-in users.

## Current State
- ✅ Single-device game mode fully functional
- ✅ Admin panel for managing game templates, anime, and characters
- ✅ Django REST API with PostgreSQL
- ✅ React frontend with Vite
- ✅ CORS configured between backend and frontend
- ✅ Phase 1-7 of DEVELOPMENT_PLAN.md completed

## New Features to Implement
1. **User Authentication System** (Registration, Login, Google OAuth, JWT tokens)
2. **Horizontal Navigation Menu** (Login/Logout, Game, Anime, Library)
3. **User-Owned Content** (Each user creates their own game templates, anime, characters)
4. **Content Visibility & Sharing** (Public/Private toggle, Anime Library with ratings)
5. **User-Friendly Content Management UI** (No JSON inputs, intuitive forms)

---

## Phase 1: User Authentication System

### 1.1 Backend Setup
**Goal:** Implement JWT-based authentication with email/password registration, login, and Google OAuth

**Tasks:**
1. Install required packages:
   ```bash
   pip install djangorestframework-simplejwt django-allauth dj-rest-auth[with_social]
   ```

2. Update `settings.py`:
   - Add JWT authentication to REST_FRAMEWORK settings
   - Configure JWT token lifetimes (access: 1 hour, refresh: 7 days)
   - Add django-allauth and Google OAuth provider
   - Keep AllowAny permission for public endpoints (templates, anime, characters list)
   - Add IsAuthenticated for user-specific endpoints

3. Create User endpoints in `api/urls.py`:
   - `POST /api/auth/register/` - Email/password registration (username, email, password)
   - `POST /api/auth/login/` - Login with email/password (returns access & refresh tokens)
   - `POST /api/auth/refresh/` - Refresh access token
   - `POST /api/auth/logout/` - Logout and blacklist refresh token
   - `GET /api/auth/me/` - Get current user info (requires authentication)
   - `POST /api/auth/google/` - Google OAuth login (returns tokens)

4. Create serializers in `api/serializers.py`:
   - `UserRegistrationSerializer` (username, email, password, password_confirm)
   - `UserLoginSerializer` (email, password)
   - `UserSerializer` (id, username, email, date_joined)
   - Add email validation (unique, valid format)
   - Add password validation (min 8 characters, complexity)

5. Create views in `api/views.py`:
   - `RegisterView` (create new user, no email verification for now)
   - `LoginView` (authenticate and return JWT tokens)
   - `LogoutView` (blacklist refresh token)
   - `UserDetailView` (get current authenticated user)
   - `GoogleLoginView` (handle Google OAuth callback)

6. Configure Google OAuth:
   - Set up Google Cloud Console project
   - Get OAuth 2.0 Client ID and Secret
   - Add to settings (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET)
   - Configure redirect URIs

**Files to Create/Modify:**
- `backend/requirements.txt` (add packages)
- `backend/anifight/settings.py` (JWT + OAuth config)
- `backend/api/serializers.py` (user serializers with validation)
- `backend/api/views.py` (auth views)
- `backend/api/urls.py` (auth endpoints)

**Testing:**
- Register a new user via API (email/password)
- Login and receive JWT tokens
- Access /api/auth/me/ with token
- Test Google OAuth login flow
- Test token refresh
- Test logout (token blacklist)

---

## Phase 2: Database Schema Updates

### 2.1 Add User Ownership and Ratings to Models
**Goal:** Add user relationships, visibility controls, and rating system to existing models

**Tasks:**
1. Update `game/models.py`:
   - Add `owner` ForeignKey to `GameTemplate` model (nullable for admin templates)
   - Add `owner` ForeignKey to `Anime` model (nullable for admin anime)
   - Add `is_public` BooleanField to `Anime` model (default=False)
   - Remove individual `is_public` from `Character` (characters inherit visibility from parent Anime)
   - Characters are always bundled with their Anime, not standalone
   - Add `average_rating` DecimalField to `Anime` (calculated field, 0.00-5.00)
   - Add `total_ratings` IntegerField to `Anime` (count of ratings)

2. Create new `AnimeRating` model:
   ```python
   class AnimeRating(models.Model):
       anime = models.ForeignKey(Anime, on_delete=models.CASCADE, related_name='ratings')
       user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='anime_ratings')
       rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
       created_at = models.DateTimeField(auto_now_add=True)
       updated_at = models.DateTimeField(auto_now=True)

       class Meta:
           unique_together = ['anime', 'user']  # One rating per user per anime
   ```

3. Make migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

4. Handle existing data:
   - Set existing admin-created content to have owner=null (represents admin content)
   - Mark all admin content as public (is_public=True) for backward compatibility
   - This ensures non-logged-in users can still play with admin content

**Key Design Decisions:**
- **Anime Bundles**: Anime and Characters are treated as a single bundle
  - When user creates anime, they add characters to it
  - Visibility is controlled at the Anime level (not per character)
  - When anime is public, all its characters are public
- **Admin Content**: Always accessible to everyone (logged-in or not)
- **User Content**: Private by default, can be made public
- **Ratings**: Only on Anime bundles (not individual characters or templates)
- **No Import/Clone**: Removed from plan (not in requirements)

**Example Model Updates:**
```python
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

class GameTemplate(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='game_templates', null=True, blank=True)
    # null owner = admin template (visible to all)
    # ... existing fields

class Anime(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='anime', null=True, blank=True)
    is_public = models.BooleanField(default=False)
    # If owner is null = admin anime (always public/visible)
    # If owner is set and is_public=True = user anime visible to all
    # If owner is set and is_public=False = user anime visible only to owner
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_ratings = models.IntegerField(default=0)
    # ... existing fields

class Character(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='characters', null=True, blank=True)
    # Characters inherit visibility from parent Anime
    # No separate is_public field needed
    # ... existing fields

class AnimeRating(models.Model):
    anime = models.ForeignKey(Anime, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='anime_ratings')
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['anime', 'user']
```

**Files to Modify:**
- `backend/game/models.py`
- Migration files (auto-generated)

---

## Phase 3: API Permissions & New Endpoints

### 3.1 Content Ownership and Rating Endpoints
**Goal:** Ensure users can only edit their own content, enable public library browsing, and implement rating system

**Tasks:**
1. Create custom permission classes in `api/permissions.py`:
   - `IsOwnerOrReadOnly` - Only owner can edit/delete their content
   - `IsAuthenticatedOrReadOnly` - Anonymous can read public, authenticated can create

2. Update existing API viewsets in `api/views.py`:
   - Keep existing endpoints for backward compatibility:
     - `GET /api/templates/` - All published templates (admin + public user templates)
     - `GET /api/anime/` - All anime accessible to current user
     - `GET /api/characters/` - All characters accessible to current user
   - Add permission classes
   - Override `get_queryset()` to filter by visibility:
     - Admin content (owner=null) always visible
     - User content: if is_public=True, visible to all
     - User content: if is_public=False, visible only to owner
   - Override `perform_create()` to set owner automatically (from request.user)

3. Create new user-specific endpoints:
   - `GET /api/my/templates/` - User's own game templates
   - `GET /api/my/anime/` - User's own anime bundles with character count
   - `POST /api/my/templates/` - Create game template
   - `POST /api/my/anime/` - Create anime (no characters yet)
   - `PUT /api/my/anime/{id}/` - Update anime (name, power_scale, is_public, image)
   - `DELETE /api/my/anime/{id}/` - Delete anime (cascades to characters)
   - `GET /api/my/anime/{id}/characters/` - Get characters for user's anime
   - `POST /api/my/anime/{id}/characters/` - Add character to anime
   - `PUT /api/my/anime/{anime_id}/characters/{char_id}/` - Update character
   - `DELETE /api/my/anime/{anime_id}/characters/{char_id}/` - Delete character

4. Create public library endpoints:
   - `GET /api/library/anime/` - All public anime with ratings
     - Returns: anime details + character count + average_rating + total_ratings
     - Filter by owner=null (admin) OR is_public=True (user)
     - Support sorting: newest, highest_rated, most_rated
   - `GET /api/library/anime/{id}/` - Single anime details with all characters
   - `POST /api/library/anime/{id}/rate/` - Rate an anime (1-5 stars, requires auth)
   - `GET /api/library/anime/{id}/my-rating/` - Get current user's rating for anime

5. Update serializers in `api/serializers.py`:
   - `GameTemplateSerializer`: Add owner field (read-only), owner_username
   - `AnimeSerializer`: Add owner, is_public, average_rating, total_ratings, character_count
   - `AnimeDetailSerializer`: Include nested characters array
   - `CharacterSerializer`: Keep existing, add owner field
   - `AnimeRatingSerializer`: anime_id, rating, user (read-only)
   - `AnimeLibrarySerializer`: Optimized for library view (no character details, just count)

6. Rating system logic:
   - When user rates anime, create or update AnimeRating record
   - Recalculate average_rating and total_ratings on Anime model
   - Users can rate public anime only (not their own)
   - One rating per user per anime (update if already rated)

**Files to Create/Modify:**
- `backend/api/permissions.py` (new file)
- `backend/api/views.py` (update viewsets, add new views)
- `backend/api/serializers.py` (update serializers)
- `backend/api/urls.py` (add new endpoints)

**Testing:**
- User can create game template and see in /api/my/templates/
- User can create anime and add characters to it
- User can set anime as public/private
- Public anime appear in /api/library/anime/
- Anonymous users can browse library (read-only)
- Authenticated users can rate public anime
- Ratings update average_rating correctly
- User cannot rate their own anime
- User cannot edit/delete other users' content
- Anonymous users can still play single-device mode with admin content

---

## Phase 4: Frontend Authentication & Navigation

### 4.1 Auth Context & API Integration
**Goal:** Add login/register UI, Google OAuth, and persist authentication state

**Tasks:**
1. Install dependencies:
   ```bash
   npm install @react-oauth/google jwt-decode
   ```

2. Create authentication context:
   - `frontend/src/contexts/AuthContext.jsx`
   - State: user (id, username, email), accessToken, refreshToken, isAuthenticated
   - Save tokens to localStorage (auto-restore on page load)
   - Functions: login(email, password), loginWithGoogle(credential), register(username, email, password), logout(), refreshAccessToken()
   - Auto-refresh token before expiration (background timer)

3. Update axios configuration:
   - `frontend/src/services/api.js` (already exists)
   - Add axios interceptor to include `Authorization: Bearer {accessToken}` header
   - Handle 401 errors: try refresh token, if fails → logout
   - Handle 403 errors: show "Access denied" message

4. Create horizontal navigation menu:
   - `frontend/src/components/Navigation.jsx` (new component)
   - **Logo** (left side) + **Menu Items** (right side)
   - Menu items: **Login** (or **Logout** if logged in) | **Game** | **Anime** | **Library**
   - Fixed horizontal layout (no hamburger menu, always visible)
   - Responsive design for mobile (smaller text/icons, still horizontal)
   - Highlight active menu item

5. Create auth pages:
   - `frontend/src/pages/LoginPage.jsx`
     - Email and password fields
     - "Don't have an account? Register now" link
     - "Login with Google" button (Google OAuth)
     - Validation: required fields, email format
   - `frontend/src/pages/RegisterPage.jsx`
     - Username, email, password, confirm password fields
     - "Already have an account? Login" link
     - Validation: password match, min 8 chars, email unique
   - Both pages: show errors from backend (email already exists, etc.)

6. Google OAuth setup:
   - Wrap App.jsx with GoogleOAuthProvider
   - Configure Google Client ID from environment variable
   - Use @react-oauth/google's GoogleLogin component
   - Send credential token to backend /api/auth/google/
   - Receive JWT tokens from backend

7. Update App.jsx routing:
   - Add routes: /login, /register, /game, /anime, /library
   - Keep existing route: / (StartScreen for single-device mode)
   - Wrap with AuthProvider
   - Add Navigation component to all pages

**Menu Navigation Details:**
- **Login/Logout**: /login page (or logout action if authenticated)
- **Game**: /game page (user's game templates, requires auth)
- **Anime**: /anime page (user's anime management, requires auth)
- **Library**: /library page (public anime library, no auth required)
- **Home/Logo**: / (existing StartScreen, no auth required)

**Files to Create:**
- `frontend/src/contexts/AuthContext.jsx`
- `frontend/src/components/Navigation.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/RegisterPage.jsx`
- `frontend/src/pages/GamePage.jsx` (placeholder for Phase 5)
- `frontend/src/pages/AnimePage.jsx` (placeholder for Phase 5)
- `frontend/src/pages/LibraryPage.jsx` (placeholder for Phase 5)

**Files to Modify:**
- `frontend/src/App.jsx` (add routes, AuthProvider, GoogleOAuthProvider)
- `frontend/src/services/api.js` (add axios interceptor)
- `frontend/src/main.jsx` (add Google OAuth provider if needed)
- `frontend/.env` (add VITE_GOOGLE_CLIENT_ID)

**Testing:**
- User can register with email/password
- User can login with email/password
- User can login with Google OAuth
- Tokens saved to localStorage
- Page refresh preserves login state
- Logout clears tokens and redirects
- Axios automatically adds auth header
- 401 error triggers token refresh or logout
- Navigation menu shows correct items based on auth state

---

## Phase 5: Frontend Content Management UI

### 5.1 Game Templates Page (User-Created)
**Goal:** Allow users to create and manage game templates with intuitive UI (no JSON input)

**Page:** `/game` (requires authentication)

**Tasks:**
1. Create `frontend/src/pages/GamePage.jsx`:
   - Show list of user's game templates as cards
   - Each card shows: template name, number of roles, created date
   - "Create New Template" button at top
   - Click card to edit template

2. Create `frontend/src/components/game/TemplateForm.jsx`:
   - Name input field
   - Specialty match multiplier input (default 1.20)
   - Published toggle (show in public play screen)
   - **Roles section** (no JSON input!):
     - Display roles as a list of input fields
     - Each role has: role name input + delete button
     - "+ Add Role" button to add more roles
     - Default roles: CAPTAIN, VICE CAPTAIN, TANK, HEALER, SUPPORT, SUPPORT
   - Save button
   - Cancel button

3. Create `frontend/src/components/game/TemplateCard.jsx`:
   - Display template name
   - Show role count
   - Edit and Delete buttons
   - Published badge

**API Integration:**
- `GET /api/my/templates/` - Fetch user's templates
- `POST /api/my/templates/` - Create template
- `PUT /api/my/templates/{id}/` - Update template
- `DELETE /api/my/templates/{id}/` - Delete template

---

### 5.2 Anime Management Page (Bundled with Characters)
**Goal:** Create and manage anime bundles with characters in unified interface

**Page:** `/anime` (requires authentication)

**Tasks:**
1. Create `frontend/src/pages/AnimePage.jsx`:
   - **Grid view** of user's anime as cards
   - Each anime card shows:
     - Anime image (or placeholder)
     - Anime name
     - Power scale value
     - Character count (e.g., "12 characters")
     - Public/Private badge
     - Edit and Delete icons
   - "Create New Anime" button at top
   - Click card → opens anime detail page with characters

2. Create `frontend/src/pages/AnimeDetailPage.jsx`:
   - Route: `/anime/:animeId`
   - **Top section**: Anime details
     - Large anime image
     - Name (editable inline)
     - Power scale (editable inline)
     - Public/Private toggle
     - Save button
   - **Bottom section**: Characters list
     - Grid of character cards
     - Each card: image, name, character power, specialties
     - "+ Add Character" button
     - Edit/Delete buttons on each character card

3. Create `frontend/src/components/anime/AnimeForm.jsx`:
   - Used for creating new anime
   - Fields: name, power_scale, is_public toggle, image upload
   - Validation: name required, power_scale (0.01-10.00)
   - After creation → redirect to AnimeDetailPage to add characters

4. Create `frontend/src/components/anime/CharacterForm.jsx`:
   - Fields: name, character_power (1-100), image upload
   - **Specialties**: Multi-select or checkbox list (not JSON input!)
     - Show common specialties: CAPTAIN, VICE CAPTAIN, TANK, HEALER, SUPPORT, DPS, etc.
     - Allow adding custom specialty
   - Save button, Cancel button

5. Create `frontend/src/components/anime/AnimeCard.jsx`:
   - Visual card component for grid display
   - Shows image, name, character count, public/private status
   - Click → navigate to detail page

6. Create `frontend/src/components/anime/CharacterCard.jsx`:
   - Smaller card for character display
   - Shows image, name, power, specialties as badges
   - Edit/Delete buttons

**API Integration:**
- `GET /api/my/anime/` - Fetch user's anime
- `POST /api/my/anime/` - Create anime
- `PUT /api/my/anime/{id}/` - Update anime
- `DELETE /api/my/anime/{id}/` - Delete anime
- `GET /api/my/anime/{id}/characters/` - Get characters for anime
- `POST /api/my/anime/{id}/characters/` - Add character
- `PUT /api/my/anime/{anime_id}/characters/{char_id}/` - Update character
- `DELETE /api/my/anime/{anime_id}/characters/{char_id}/` - Delete character

---

### 5.3 Public Library Page
**Goal:** Browse all public anime bundles with rating system

**Page:** `/library` (no authentication required, but auth required to rate)

**Tasks:**
1. Create `frontend/src/pages/LibraryPage.jsx`:
   - **Grid view** of all public anime (admin + user-created)
   - Each card shows:
     - Anime image
     - Anime name
     - Character count
     - Average rating (star display, e.g., ★★★★☆ 4.2)
     - Total ratings count (e.g., "(24 ratings)")
   - Sorting options: Newest, Highest Rated, Most Rated
   - Click card → opens library detail page

2. Create `frontend/src/pages/LibraryDetailPage.jsx`:
   - Route: `/library/:animeId`
   - Shows full anime details + all characters
   - **Rating section** (requires login):
     - Star rating input (1-5 stars)
     - "Rate this anime" button
     - Shows user's current rating if already rated
     - Shows average rating and total count
   - **Characters section**:
     - Grid of all characters in this anime
     - View-only (no edit/delete)
   - **Creator info**: "Created by {username}" or "Official" (if admin)

3. Create `frontend/src/components/library/LibraryAnimeCard.jsx`:
   - Card optimized for library view
   - Prominent rating display
   - Character count badge
   - Creator badge (Official vs User)

4. Create `frontend/src/components/library/StarRating.jsx`:
   - Interactive star rating component (1-5 stars)
   - Click to rate (if authenticated)
   - Read-only mode for display
   - Show half-stars for average ratings

5. Rating functionality:
   - Unauthenticated users see ratings but can't rate
   - Clicking rate button when not logged in → redirect to login
   - Users can rate public anime (not their own)
   - Rating updates instantly (optimistic UI update)

**API Integration:**
- `GET /api/library/anime/` - Fetch all public anime
- `GET /api/library/anime/{id}/` - Get single anime with characters
- `POST /api/library/anime/{id}/rate/` - Submit rating (requires auth)
- `GET /api/library/anime/{id}/my-rating/` - Get user's rating (if authenticated)

**Files to Create:**
- `frontend/src/pages/GamePage.jsx`
- `frontend/src/pages/AnimePage.jsx`
- `frontend/src/pages/AnimeDetailPage.jsx`
- `frontend/src/pages/LibraryPage.jsx`
- `frontend/src/pages/LibraryDetailPage.jsx`
- `frontend/src/components/game/TemplateForm.jsx`
- `frontend/src/components/game/TemplateCard.jsx`
- `frontend/src/components/anime/AnimeForm.jsx`
- `frontend/src/components/anime/AnimeCard.jsx`
- `frontend/src/components/anime/CharacterForm.jsx`
- `frontend/src/components/anime/CharacterCard.jsx`
- `frontend/src/components/library/LibraryAnimeCard.jsx`
- `frontend/src/components/library/StarRating.jsx`

**Files to Modify:**
- `frontend/src/App.jsx` (add routes for detail pages)

---


## Phase 6: Testing & Polish

### 6.1 Testing Checklist

**Authentication:**
- User can register with email/password
- User can login with email/password
- User can login with Google OAuth
- Login fails with invalid credentials
- Token refresh works automatically
- Logout clears tokens and redirects
- Page refresh preserves auth state

**Content Management:**
- User can create game template with custom roles (no JSON input)
- User can create anime with power scale and visibility
- User can add characters to anime with specialties (no JSON input)
- User can edit their own content
- User cannot edit other users' content
- User can delete their own content
- Public/private toggle works correctly

**Library & Ratings:**
- Anonymous users can browse public library
- Library shows admin + public user anime
- Anime cards display ratings correctly
- Authenticated users can rate public anime
- Users cannot rate their own anime
- Rating updates recalculate average correctly
- One rating per user per anime (update on re-rate)

**Single-Device Mode (Backward Compatibility):**
- Anonymous users can still play single-device game
- Admin content always visible to everyone
- Game templates work without login
- Character drawing works without login
- Scoring works without login
- Existing game flow unchanged

**API Permissions:**
- Public endpoints accessible without auth
- Protected endpoints require authentication
- Users can only modify their own content
- Proper 401/403 error responses

**UI/UX:**
- Navigation menu visible on all pages (horizontal, no hamburger)
- Active menu item highlighted
- Login/Logout button updates based on auth state
- Forms have proper validation and error messages
- Loading states for all API calls
- Success/error notifications
- Responsive design on mobile and desktop

---

### 6.2 UI Polish

**Tasks:**
1. Loading states for all API calls
2. Error messages for failed operations
3. Success notifications (e.g., "Anime created successfully!")
4. Responsive design for mobile
5. Accessibility (ARIA labels, keyboard navigation)
6. Empty states (e.g., "No anime created yet. Create your first anime!")
7. Confirmation dialogs for destructive actions (delete)

---

## Summary

### New Menu Structure:
```
Navigation (Horizontal Bar):
├── Logo (AniFight) → Home (/)
├── Login/Logout → /login
├── Game → /game (requires auth)
├── Anime → /anime (requires auth)
└── Library → /library (public)

Routes:
├── / - StartScreen (existing single-device mode, no auth required)
├── /login - LoginPage
├── /register - RegisterPage
├── /game - GamePage (user's game templates, requires auth)
├── /anime - AnimePage (user's anime list, requires auth)
├── /anime/:id - AnimeDetailPage (anime + characters, requires auth)
├── /library - LibraryPage (public anime, no auth)
├── /library/:id - LibraryDetailPage (anime details + rating, read-only)
└── /draft - DraftScreen (existing, no auth required)
└── /results - ResultScreen (existing, no auth required)
```

### Key Features:
1. ✅ **Single-device mode remains fully functional without login**
2. ✅ **User authentication with email/password + Google OAuth**
3. ✅ **Personal content library (templates, anime bundles with characters)**
4. ✅ **Public content library with rating system (1-5 stars)**
5. ✅ **No JSON inputs - user-friendly forms for roles and specialties**
6. ✅ **Anime bundles - anime and characters managed together**
7. ✅ **Admin content always public and accessible to all**
8. ✅ **Horizontal navigation menu (no expanding, mobile-friendly)**

### Database Design:
- **GameTemplate**: owner (nullable), name, roles (array), specialty_multiplier, rating_bands, is_published
- **Anime**: owner (nullable), name, image, anime_power_scale, is_public, average_rating, total_ratings
- **Character**: owner (nullable), anime (FK), name, image, character_power, specialties (array)
- **AnimeRating**: anime (FK), user (FK), rating (1-5), unique_together[anime, user]

### Content Visibility Logic:
- **Admin Content** (owner=null): Always visible to everyone
- **User Content (is_public=True)**: Visible in library, can be rated
- **User Content (is_public=False)**: Only visible to owner
- **Characters**: Inherit visibility from parent Anime (no separate is_public)

### Estimated Timeline:
- **Phase 1:** Backend Auth (1-2 days)
- **Phase 2:** Database Updates (1 day)
- **Phase 3:** API Endpoints & Permissions (2-3 days)
- **Phase 4:** Frontend Auth & Navigation (2-3 days)
- **Phase 5:** Content Management UI (3-4 days)
- **Phase 6:** Testing & Polish (1-2 days)

**Total: 10-15 days**

---

## Getting Started

To begin implementation, start with **Phase 1** and proceed sequentially. Each phase builds upon the previous one.

**First Commands:**
```bash
cd backend
pip install djangorestframework-simplejwt django-allauth dj-rest-auth[with_social]
```

Then update backend settings and begin implementing auth endpoints as detailed in Phase 1.

---

## Notes

- **No Multiplayer Mode**: Removed from this plan (can be added later if needed)
- **No Import/Clone**: Users can only create their own content or use public content in games
- **Ratings Only on Anime**: Not on individual characters or templates
- **Anime Bundles**: Anime and characters are tightly coupled (not standalone)
- **Backward Compatibility**: Existing single-device game mode must remain fully functional
- **Admin Supremacy**: Admin content is always accessible to everyone (logged-in or not)
