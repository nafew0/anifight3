#!/bin/bash

# Test Authentication Endpoints for AniFight API
# This script tests registration, login, logout, and user profile endpoints

BASE_URL="http://localhost:8000/api"
echo "========================================="
echo "Testing AniFight Authentication API"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

# Test 1: Register a new user
echo "TEST 1: Register New User"
echo "POST $BASE_URL/auth/register/"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "TestPassword123!",
    "password_confirm": "TestPassword123!"
  }')

echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""

# Extract access token from registration response
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access', ''))" 2>/dev/null)
REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('refresh', ''))" 2>/dev/null)

if [ -n "$ACCESS_TOKEN" ]; then
  echo "✅ Registration successful! Access token received."
else
  echo "❌ Registration failed or token not received."
fi
echo ""
echo "---"
echo ""

# Test 2: Login with the registered user
echo "TEST 2: Login User"
echo "POST $BASE_URL/auth/login/"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123!"
  }')

echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# Update tokens from login response
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access', ''))" 2>/dev/null)
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('refresh', ''))" 2>/dev/null)

if [ -n "$ACCESS_TOKEN" ]; then
  echo "✅ Login successful! Access token received."
else
  echo "❌ Login failed or token not received."
fi
echo ""
echo "---"
echo ""

# Test 3: Get current user info (requires authentication)
echo "TEST 3: Get Current User Info"
echo "GET $BASE_URL/auth/me/"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$ME_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ME_RESPONSE"
echo ""

if echo "$ME_RESPONSE" | grep -q "\"id\""; then
  echo "✅ Successfully retrieved user info!"
else
  echo "❌ Failed to retrieve user info."
fi
echo ""
echo "---"
echo ""

# Test 4: Refresh access token
echo "TEST 4: Refresh Access Token"
echo "POST $BASE_URL/auth/token/refresh/"
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/token/refresh/" \
  -H "Content-Type: application/json" \
  -d "{\"refresh\": \"$REFRESH_TOKEN\"}")

echo "$REFRESH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REFRESH_RESPONSE"
echo ""

NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access', ''))" 2>/dev/null)

if [ -n "$NEW_ACCESS_TOKEN" ]; then
  echo "✅ Token refresh successful!"
  ACCESS_TOKEN="$NEW_ACCESS_TOKEN"
else
  echo "❌ Token refresh failed."
fi
echo ""
echo "---"
echo ""

# Test 5: Logout (blacklist refresh token)
echo "TEST 5: Logout User"
echo "POST $BASE_URL/auth/logout/"
LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refresh\": \"$REFRESH_TOKEN\"}")

echo "$LOGOUT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGOUT_RESPONSE"
echo ""

if echo "$LOGOUT_RESPONSE" | grep -q "Successfully logged out"; then
  echo "✅ Logout successful!"
else
  echo "❌ Logout failed."
fi
echo ""
echo "---"
echo ""

# Test 6: Try to use blacklisted token (should fail)
echo "TEST 6: Try Using Blacklisted Refresh Token (Should Fail)"
echo "POST $BASE_URL/auth/token/refresh/"
BLACKLIST_TEST=$(curl -s -X POST "$BASE_URL/auth/token/refresh/" \
  -H "Content-Type: application/json" \
  -d "{\"refresh\": \"$REFRESH_TOKEN\"}")

echo "$BLACKLIST_TEST" | python3 -m json.tool 2>/dev/null || echo "$BLACKLIST_TEST"
echo ""

if echo "$BLACKLIST_TEST" | grep -q "blacklisted\|invalid"; then
  echo "✅ Blacklisted token correctly rejected!"
else
  echo "❌ Blacklisted token was not rejected (this is a problem)."
fi
echo ""
echo "---"
echo ""

# Test 7: Try to access protected endpoint without token (should fail)
echo "TEST 7: Access Protected Endpoint Without Token (Should Fail)"
echo "GET $BASE_URL/auth/me/"
NO_AUTH_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me/")

echo "$NO_AUTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$NO_AUTH_RESPONSE"
echo ""

if echo "$NO_AUTH_RESPONSE" | grep -q "credentials were not provided\|Authentication credentials"; then
  echo "✅ Protected endpoint correctly requires authentication!"
else
  echo "❌ Protected endpoint did not require authentication (this is a problem)."
fi
echo ""
echo "---"
echo ""

# Test 8: Try to register with existing email (should fail)
echo "TEST 8: Register With Existing Email (Should Fail)"
echo "POST $BASE_URL/auth/register/"
DUPLICATE_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser2",
    "email": "testuser@example.com",
    "password": "TestPassword123!",
    "password_confirm": "TestPassword123!"
  }')

echo "$DUPLICATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DUPLICATE_RESPONSE"
echo ""

if echo "$DUPLICATE_RESPONSE" | grep -q "already exists"; then
  echo "✅ Duplicate email correctly rejected!"
else
  echo "❌ Duplicate email was not rejected (this is a problem)."
fi
echo ""
echo "---"
echo ""

echo "========================================="
echo "Authentication API Testing Complete!"
echo "========================================="
