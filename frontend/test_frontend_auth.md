# Frontend Authentication Testing Guide

## Phase 4: Frontend Authentication & Navigation Testing

### Prerequisites
- Backend server running on `http://localhost:8000`
- Frontend server running on `http://localhost:5173`
- Test user created (from Phase 1 tests)

### Manual Testing Checklist

#### 1. Navigation Menu Test
- [ ] Open `http://localhost:5173`
- [ ] Verify horizontal navigation menu is visible at top
- [ ] Verify menu shows: Logo, Login, Game, Anime, Library
- [ ] Verify menu is responsive (resize browser window)
- [ ] Verify menu does NOT collapse into hamburger menu on mobile

#### 2. Login Page Test
- [ ] Click "Login" in navigation
- [ ] Verify you're redirected to `/login`
- [ ] Verify page shows:
  - Email input field
  - Password input field
  - Login button
  - "Sign in with Google" button
  - "Don't have an account? Register now" link
- [ ] Click "Register now" link
- [ ] Verify you're redirected to `/register`

#### 3. Registration Test
- [ ] On registration page, verify fields:
  - Username
  - Email
  - Password
  - Confirm Password
- [ ] Try to register with mismatched passwords
- [ ] Verify error message appears
- [ ] Try to register with password < 8 characters
- [ ] Verify error message appears
- [ ] Register a new user with valid data:
  - Username: `frontendtest`
  - Email: `frontendtest@example.com`
  - Password: `TestPassword123!`
- [ ] Verify successful registration redirects to home page
- [ ] Verify navigation menu now shows "Logout" instead of "Login"

#### 4. Token Persistence Test
- [ ] After successful registration, refresh the page (F5)
- [ ] Verify you're still logged in (menu shows "Logout")
- [ ] Open browser DevTools > Application/Storage > Local Storage
- [ ] Verify `accessToken`, `refreshToken`, and `user` are stored

#### 5. Protected Routes Test
- [ ] While logged in, click "Game" in navigation
- [ ] Verify you can access `/game` page
- [ ] Click "Anime" in navigation
- [ ] Verify you can access `/anime` page
- [ ] Logout (click "Logout" in navigation)
- [ ] Try to manually navigate to `/game`
- [ ] Verify you're redirected to `/login`
- [ ] Try to manually navigate to `/anime`
- [ ] Verify you're redirected to `/login`

#### 6. Login Test
- [ ] On login page, enter:
  - Email: `frontendtest@example.com`
  - Password: `TestPassword123!`
- [ ] Click "Login"
- [ ] Verify successful login redirects to home page
- [ ] Verify navigation menu shows "Logout"

#### 7. Logout Test
- [ ] While logged in, click "Logout" in navigation
- [ ] Verify you're redirected to login page
- [ ] Verify navigation menu shows "Login"
- [ ] Open DevTools > Local Storage
- [ ] Verify `accessToken`, `refreshToken`, and `user` are cleared

#### 8. Public Routes Test
- [ ] While logged out, navigate to `/library`
- [ ] Verify page loads (public access)
- [ ] While logged out, navigate to `/` (home/game flow)
- [ ] Verify page loads (admin content accessible to all)

#### 9. Google OAuth Button Test (Will not work until configured)
- [ ] On login page, verify "Sign in with Google" button exists
- [ ] Note: Button will show error until you configure Google OAuth Client ID
- [ ] See `.env` file for instructions on getting Google Client ID

### Expected Results Summary

**All tests should pass with these behaviors:**
1. Navigation menu is always visible and horizontal (no hamburger)
2. Menu items update based on authentication state
3. Protected routes redirect to login when not authenticated
4. Public routes are accessible without authentication
5. Token persists across page refreshes
6. Login/Logout flow works correctly
7. Registration creates new users and auto-logs them in
8. LocalStorage correctly stores and clears auth tokens

### Known Limitations
- Google OAuth will not work until `VITE_GOOGLE_CLIENT_ID` is configured in `.env`
- Token auto-refresh happens every 50 minutes (not testable in short session)

### Troubleshooting

**If login fails:**
1. Check browser console for errors
2. Check Network tab for API call details
3. Verify backend is running on port 8000
4. Check backend console for errors

**If protected routes are accessible when logged out:**
1. Check that `isAuthenticated` is false in AuthContext
2. Verify ProtectedRoute wrapper is working
3. Check localStorage is cleared on logout

**If navigation menu doesn't update:**
1. Check AuthContext provider is wrapping the app
2. Verify useAuth hook is being called in Navigation component
3. Check React DevTools for context values
