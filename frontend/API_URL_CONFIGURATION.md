# API URL Configuration

## Overview
This document explains how API URLs are configured across the frontend application.

## Environment Variable
All API URLs are configured using the `VITE_API_URL` environment variable defined in `.env`:

```env
# For local development
VITE_API_URL=http://localhost:8000

# For production
VITE_API_URL=https://api.yourdomain.com
```

**IMPORTANT:** There are NO hardcoded fallback URLs in the code. The `VITE_API_URL` environment variable MUST be set, otherwise the application will not work.

## Two Different Patterns

### Pattern 1: Using `services/api.js` (Recommended for new code)

**File:** `frontend/src/services/api.js`

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,  // Value from .env file
  // ...
});
```

**Usage in components:**
```javascript
import api from '../services/api';

// Endpoints MUST include /api prefix
await api.post('/api/auth/register/', {...});
await api.post('/api/auth/login/', {...});
```

**Why `/api` is needed:**
- The baseURL is `http://localhost:8000` (no `/api`)
- So we must include `/api` in each endpoint path
- Example: `baseURL + '/api/auth/register/'` = `http://localhost:8000/api/auth/register/` ✅

**Files using this pattern:**
- `frontend/src/contexts/AuthContext.jsx` - All auth endpoints

**Benefits:**
- Includes request/response interceptors for token management
- Automatic token refresh on 401 errors
- Centralized axios configuration

---

### Pattern 2: Direct axios with `/api` in base URL

**File:** `frontend/src/context/GameContext.jsx`

```javascript
const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api`;
```

**Usage:**
```javascript
// Endpoints do NOT include /api prefix (it's already in API_BASE_URL)
await axios.post(`${API_BASE_URL}/draw/`, {...});
await axios.get(`${API_BASE_URL}/templates/`);
```

**Why `/api` is NOT needed:**
- The API_BASE_URL already includes `/api`: `http://localhost:8000/api`
- Endpoints only need the specific path after `/api`
- Example: `API_BASE_URL + '/draw/'` = `http://localhost:8000/api/draw/` ✅

**Files using this pattern:**
- `frontend/src/context/GameContext.jsx` - Game flow endpoints

**Trade-offs:**
- No automatic token management
- No interceptors
- Direct axios calls
- Used for public endpoints that don't need authentication

---

## Environment Variable Usage

Both patterns use the `VITE_API_URL` environment variable with NO hardcoded fallbacks:

**Pattern 1:**
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL;
// Result: Value from .env (e.g., http://localhost:8000)
```

**Pattern 2:**
```javascript
const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api`;
// Result: Value from .env + /api (e.g., http://localhost:8000/api)
```

**Why no fallbacks?**
- Prevents accidental production deployments pointing to localhost
- Forces explicit configuration in each environment
- Makes environment issues immediately visible during development

## Quick Reference

| File | Base URL | Endpoint Format | Example Full URL |
|------|----------|----------------|------------------|
| `AuthContext.jsx` | `http://localhost:8000` | `/api/auth/...` | `http://localhost:8000/api/auth/register/` |
| `GameContext.jsx` | `http://localhost:8000/api` | `/draw/` | `http://localhost:8000/api/draw/` |

## Changing the Backend URL

To point to a different backend (e.g., production), just update `.env`:

```env
# For production
VITE_API_URL=https://anifight-api.example.com

# For local backend on different port
VITE_API_URL=http://localhost:9000
```

Then restart the frontend dev server:
```bash
npm run dev
```

## Common Mistakes

### ❌ Wrong - Missing `/api` in AuthContext
```javascript
await api.post('/auth/register/', {...});
// Results in: http://localhost:8000/auth/register/ (404 error)
```

### ✅ Correct - Include `/api` in AuthContext
```javascript
await api.post('/api/auth/register/', {...});
// Results in: http://localhost:8000/api/auth/register/ (works!)
```

### ❌ Wrong - Including `/api` in GameContext
```javascript
await axios.post(`${API_BASE_URL}/api/draw/`, {...});
// Results in: http://localhost:8000/api/api/draw/ (404 error)
```

### ✅ Correct - No `/api` in GameContext
```javascript
await axios.post(`${API_BASE_URL}/draw/`, {...});
// Results in: http://localhost:8000/api/draw/ (works!)
```

## Recommendation for Future Code

For new features, prefer **Pattern 1** (using `services/api.js`) because:
1. Centralized configuration
2. Automatic token management
3. Request/response interceptors
4. Easier to maintain

Only use Pattern 2 for public endpoints that don't need authentication.
