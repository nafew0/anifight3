#!/bin/bash

BASE_URL="http://localhost:8000/api"
echo "========================================="
echo "Testing Frontend Integration"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

# Test 1: Register a new user for frontend testing
echo "TEST 1: Register Frontend Test User"
echo "POST $BASE_URL/auth/register/"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "frontendtest2",
    "email": "frontendtest2@example.com",
    "password": "TestPassword123!",
    "password_confirm": "TestPassword123!"
  }')

echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""

ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access', ''))" 2>/dev/null)

if [ -n "$ACCESS_TOKEN" ]; then
  echo "✅ Registration successful!"
else
  echo "⚠️  User may already exist or registration failed"
fi
echo ""
echo "---"
echo ""

# Test 2: Test login
echo "TEST 2: Login with Frontend Test User"
echo "POST $BASE_URL/auth/login/"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "frontendtest2@example.com",
    "password": "TestPassword123!"
  }')

echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access', ''))" 2>/dev/null)
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('refresh', ''))" 2>/dev/null)

if [ -n "$ACCESS_TOKEN" ]; then
  echo "✅ Login successful!"
else
  echo "❌ Login failed"
fi
echo ""
echo "---"
echo ""

# Test 3: Test protected endpoint
echo "TEST 3: Access Protected Endpoint (/auth/me/)"
echo "GET $BASE_URL/auth/me/"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$ME_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ME_RESPONSE"
echo ""

if echo "$ME_RESPONSE" | grep -q "\"id\""; then
  echo "✅ Protected endpoint accessible with token!"
else
  echo "❌ Failed to access protected endpoint"
fi
echo ""
echo "---"
echo ""

# Test 4: Test token refresh
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
else
  echo "❌ Token refresh failed"
fi
echo ""
echo "---"
echo ""

echo "========================================="
echo "Frontend Integration Test Complete!"
echo "========================================="
echo ""
echo "Frontend is ready for testing at: http://localhost:5173"
echo "Backend API is ready at: $BASE_URL"
echo ""
echo "Test User Credentials:"
echo "  Email: frontendtest2@example.com"
echo "  Password: TestPassword123!"
