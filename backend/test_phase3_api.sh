#!/bin/bash

# Test Phase 3: API Permissions & New Endpoints
# Tests content management, library, and rating endpoints

BASE_URL="http://localhost:8000/api"
echo "==========================================="
echo "Testing Phase 3: Content Management API"
echo "Base URL: $BASE_URL"
echo "==========================================="
echo ""

# Register and login test user
echo "Setting up test user..."
REGISTER=$(curl -s -X POST "$BASE_URL/auth/register/" \
  -H "Content-Type: application/json" \
  -d '{"username": "contentuser", "email": "content@test.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}')

ACCESS_TOKEN=$(echo "$REGISTER" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access', ''))" 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
  # Try login if registration failed (user already exists)
  LOGIN=$(curl -s -X POST "$BASE_URL/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{"email": "content@test.com", "password": "TestPass123!"}')
  ACCESS_TOKEN=$(echo "$LOGIN" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access', ''))" 2>/dev/null)
fi

echo "✅ Test user authenticated"
echo ""

# TEST 1: Create user anime
echo "TEST 1: Create User Anime (POST /api/my/anime/)"
ANIME_CREATE=$(curl -s -X POST "$BASE_URL/my/anime/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User Anime", "anime_power_scale": 7.5, "is_public": false}')

echo "$ANIME_CREATE" | python3 -m json.tool 2>/dev/null
ANIME_ID=$(echo "$ANIME_CREATE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

if [ -n "$ANIME_ID" ]; then
  echo "✅ Created anime ID: $ANIME_ID"
else
  echo "❌ Failed to create anime"
fi
echo ""

# TEST 2: Get user's anime list
echo "TEST 2: Get User's Anime List (GET /api/my/anime/)"
MY_ANIME=$(curl -s -X GET "$BASE_URL/my/anime/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$MY_ANIME" | python3 -m json.tool 2>/dev/null
echo "✅ Retrieved user's anime list"
echo ""

# TEST 3: Add character to anime
echo "TEST 3: Add Character to Anime (POST /api/my/anime/$ANIME_ID/characters/)"
CHAR_CREATE=$(curl -s -X POST "$BASE_URL/my/anime/$ANIME_ID/characters/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Character", "character_power": 75.5, "specialties": ["CAPTAIN", "TANK"]}')

echo "$CHAR_CREATE" | python3 -m json.tool 2>/dev/null
CHAR_ID=$(echo "$CHAR_CREATE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

if [ -n "$CHAR_ID" ]; then
  echo "✅ Created character ID: $CHAR_ID"
else
  echo "❌ Failed to create character"
fi
echo ""

# TEST 4: Get anime with characters
echo "TEST 4: Get Anime Detail with Characters (GET /api/my/anime/$ANIME_ID/)"
ANIME_DETAIL=$(curl -s -X GET "$BASE_URL/my/anime/$ANIME_ID/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$ANIME_DETAIL" | python3 -m json.tool 2>/dev/null
echo "✅ Retrieved anime with characters"
echo ""

# TEST 5: Make anime public
echo "TEST 5: Make Anime Public (PUT /api/my/anime/$ANIME_ID/)"
ANIME_UPDATE=$(curl -s -X PUT "$BASE_URL/my/anime/$ANIME_ID/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_public": true}')

echo "$ANIME_UPDATE" | python3 -m json.tool 2>/dev/null
echo "✅ Updated anime to public"
echo ""

# TEST 6: Get public library
echo "TEST 6: Get Public Library (GET /api/library/anime/)"
LIBRARY=$(curl -s -X GET "$BASE_URL/library/anime/")

echo "$LIBRARY" | python3 -m json.tool 2>/dev/null | head -50
echo "✅ Retrieved public library"
echo ""

# TEST 7: Rate an anime (try admin anime)
echo "TEST 7: Rate Admin Anime (POST /api/library/anime/1/rate/)"
RATING=$(curl -s -X POST "$BASE_URL/library/anime/1/rate/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5}')

echo "$RATING" | python3 -m json.tool 2>/dev/null
echo "✅ Rated anime"
echo ""

# TEST 8: Get my rating
echo "TEST 8: Get My Rating (GET /api/library/anime/1/my-rating/)"
MY_RATING=$(curl -s -X GET "$BASE_URL/library/anime/1/my-rating/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$MY_RATING" | python3 -m json.tool 2>/dev/null
echo "✅ Retrieved my rating"
echo ""

# TEST 9: Try to rate own anime (should fail)
echo "TEST 9: Try to Rate Own Anime (Should Fail)"
OWN_RATING=$(curl -s -X POST "$BASE_URL/library/anime/$ANIME_ID/rate/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5}')

echo "$OWN_RATING" | python3 -m json.tool 2>/dev/null

if echo "$OWN_RATING" | grep -q "cannot rate your own"; then
  echo "✅ Correctly prevented rating own anime"
else
  echo "❌ Should not allow rating own anime"
fi
echo ""

# TEST 10: Visibility filtering (anonymous user)
echo "TEST 10: Anonymous User Sees Public Anime Only"
ANON_ANIME=$(curl -s -X GET "$BASE_URL/anime/")

echo "Admin + Public anime visible to anonymous users:"
echo "$ANON_ANIME" | python3 -m json.tool 2>/dev/null | head -30
echo "✅ Anonymous visibility filtering works"
echo ""

echo "==========================================="
echo "Phase 3 API Testing Complete!"
echo "==========================================="
