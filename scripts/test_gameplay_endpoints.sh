#!/bin/bash

# Test script to verify gameplay endpoints only show admin + user's own content

API_URL="http://localhost:8000/api"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=================================="
echo "Testing Gameplay Endpoints Filter"
echo "=================================="
echo ""

# First, let's get a user token (assuming testuser exists)
echo -e "${YELLOW}1. Getting authentication token...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}')

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access'])" 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}Failed to get access token. Creating test user...${NC}"

  # Try to register the user
  REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register/" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}')

  # Try logging in again
  TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"testpass123"}')

  ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access'])" 2>/dev/null)

  if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}Still failed to get access token. Exiting.${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✓ Successfully authenticated${NC}"
echo ""

# Test 1: List templates without authentication
echo -e "${YELLOW}2. Testing /api/templates/ WITHOUT authentication...${NC}"
TEMPLATES_UNAUTH=$(curl -s "$API_URL/templates/")
TEMPLATE_COUNT_UNAUTH=$(echo $TEMPLATES_UNAUTH | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null)
echo "   Found $TEMPLATE_COUNT_UNAUTH templates (should be admin templates only)"
echo ""

# Test 2: List templates with authentication
echo -e "${YELLOW}3. Testing /api/templates/ WITH authentication...${NC}"
TEMPLATES_AUTH=$(curl -s "$API_URL/templates/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
TEMPLATE_COUNT_AUTH=$(echo $TEMPLATES_AUTH | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null)
echo "   Found $TEMPLATE_COUNT_AUTH templates (should be admin + user's own templates)"
echo ""

# Test 3: List anime without authentication
echo -e "${YELLOW}4. Testing /api/anime/ WITHOUT authentication...${NC}"
ANIME_UNAUTH=$(curl -s "$API_URL/anime/")
ANIME_COUNT_UNAUTH=$(echo $ANIME_UNAUTH | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null)
echo "   Found $ANIME_COUNT_UNAUTH anime (should be admin anime only)"
echo ""

# Test 4: List anime with authentication
echo -e "${YELLOW}5. Testing /api/anime/ WITH authentication...${NC}"
ANIME_AUTH=$(curl -s "$API_URL/anime/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
ANIME_COUNT_AUTH=$(echo $ANIME_AUTH | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null)
echo "   Found $ANIME_COUNT_AUTH anime (should be admin + user's own anime)"
echo ""

# Test 5: Check for public anime from other users (should NOT appear)
echo -e "${YELLOW}6. Checking anime details...${NC}"
echo "$ANIME_AUTH" | python3 -c "
import sys, json
data = json.load(sys.stdin)
admin_count = sum(1 for a in data if a.get('owner') is None)
user_count = sum(1 for a in data if a.get('owner') is not None and a.get('owner_username') == 'testuser')
other_count = sum(1 for a in data if a.get('owner') is not None and a.get('owner_username') != 'testuser')
print(f'   - Admin anime: {admin_count}')
print(f'   - User\\'s own anime: {user_count}')
print(f'   - Other users\\' public anime: {other_count} (should be 0!)')
"
echo ""

# Summary
echo "=================================="
echo -e "${GREEN}Test Summary:${NC}"
echo "=================================="
echo "The gameplay endpoints should now only show:"
echo "  • Admin-created content (owner=null)"
echo "  • User's own content (including imported anime)"
echo ""
echo "Public content from OTHER users should NOT appear."
echo "=================================="
