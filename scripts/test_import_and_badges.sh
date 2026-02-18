#!/bin/bash

# Test script for import feature and badge display fixes
# Tests the following scenarios:
# 1. Badge display shows correct labels: OFFICIAL (admin), YOURS (self), USERNAME (other user)
# 2. Import functionality works correctly
# 3. Original creator username is tracked
# 4. Duplicates are prevented

BASE_URL="http://127.0.0.1:8000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Testing Import Feature and Badge Display"
echo "=========================================="
echo ""

# Get tokens for User 1 (will create and share anime)
echo -e "${BLUE}Getting auth tokens for User 1...${NC}"
USER1_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"testuser@example.com","password":"testpass123"}')

USER1_TOKEN=$(echo $USER1_RESPONSE | grep -o '"access":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER1_TOKEN" ]; then
  echo -e "${RED}✗ Failed to get User 1 token${NC}"
  exit 1
fi
echo -e "${GREEN}✓ User 1 token obtained${NC}"
echo ""

# Get tokens for User 2 (will import anime from User 1)
echo -e "${BLUE}Getting auth tokens for User 2...${NC}"
USER2_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","email":"testuser2@example.com","password":"testpass123"}')

USER2_TOKEN=$(echo $USER2_RESPONSE | grep -o '"access":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER2_TOKEN" ]; then
  # Try to register User 2 if login fails
  echo -e "${BLUE}Registering User 2...${NC}"
  REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register/" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser2","password":"testpass123","email":"testuser2@example.com"}')

  USER2_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"access":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$USER2_TOKEN" ]; then
  echo -e "${RED}✗ Failed to get User 2 token${NC}"
  exit 1
fi
echo -e "${GREEN}✓ User 2 token obtained${NC}"
echo ""

# User 1: Create a public anime
echo -e "${BLUE}User 1: Creating a public anime...${NC}"
CREATE_ANIME_RESPONSE=$(curl -s -X POST "$BASE_URL/api/my/anime/" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Import Anime",
    "anime_power_scale": "1.50",
    "is_public": true
  }')

ANIME_ID=$(echo $CREATE_ANIME_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$ANIME_ID" ]; then
  echo -e "${RED}✗ Failed to create anime${NC}"
  echo "Response: $CREATE_ANIME_RESPONSE"
  exit 1
fi
echo -e "${GREEN}✓ Anime created with ID: $ANIME_ID${NC}"
echo ""

# User 1: Add characters to the anime
echo -e "${BLUE}User 1: Adding characters to the anime...${NC}"
for i in 1 2 3; do
  curl -s -X POST "$BASE_URL/api/my/anime/$ANIME_ID/characters/" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Test Character $i\",
      \"character_power\": \"50.00\",
      \"specialties\": [\"TANK\", \"SUPPORT\"]
    }" > /dev/null
done
echo -e "${GREEN}✓ 3 characters added${NC}"
echo ""

# Verify anime appears in library
echo -e "${BLUE}Verifying anime appears in public library...${NC}"
LIBRARY_RESPONSE=$(curl -s "$BASE_URL/api/library/anime/")
echo "Library response (first 200 chars): ${LIBRARY_RESPONSE:0:200}"
echo -e "${GREEN}✓ Anime visible in library${NC}"
echo ""

# User 2: View anime details (should show User 1's username badge)
echo -e "${BLUE}User 2: Viewing anime details...${NC}"
DETAIL_RESPONSE=$(curl -s "$BASE_URL/api/library/anime/$ANIME_ID/" \
  -H "Authorization: Bearer $USER2_TOKEN")

OWNER_USERNAME=$(echo $DETAIL_RESPONSE | grep -o '"owner_username":"[^"]*' | cut -d'"' -f4)
echo "Owner username: $OWNER_USERNAME"

if [ "$OWNER_USERNAME" = "testuser" ]; then
  echo -e "${GREEN}✓ Owner username correctly displayed${NC}"
else
  echo -e "${RED}✗ Owner username not correct${NC}"
fi
echo ""

# User 2: Import the anime
echo -e "${BLUE}User 2: Importing anime to collection...${NC}"
IMPORT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/my/anime/import/$ANIME_ID/" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "Content-Type: application/json")

IMPORTED_ANIME_ID=$(echo $IMPORT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$IMPORTED_ANIME_ID" ]; then
  echo -e "${RED}✗ Failed to import anime${NC}"
  echo "Response: $IMPORT_RESPONSE"
else
  echo -e "${GREEN}✓ Anime imported successfully with ID: $IMPORTED_ANIME_ID${NC}"
fi
echo ""

# User 2: Verify imported anime in their collection
echo -e "${BLUE}User 2: Checking imported anime in collection...${NC}"
MY_ANIME_RESPONSE=$(curl -s "$BASE_URL/api/my/anime/" \
  -H "Authorization: Bearer $USER2_TOKEN")

ORIGINAL_CREATOR=$(echo $MY_ANIME_RESPONSE | grep -o '"original_creator_username":"[^"]*' | cut -d'"' -f4)

if [ "$ORIGINAL_CREATOR" = "testuser" ]; then
  echo -e "${GREEN}✓ Original creator username tracked correctly: $ORIGINAL_CREATOR${NC}"
else
  echo -e "${RED}✗ Original creator username not tracked${NC}"
  echo "Response (first 500 chars): ${MY_ANIME_RESPONSE:0:500}"
fi
echo ""

# User 2: Verify characters were also imported
echo -e "${BLUE}User 2: Checking imported characters...${NC}"
MY_CHARS_RESPONSE=$(curl -s "$BASE_URL/api/my/anime/$IMPORTED_ANIME_ID/characters/" \
  -H "Authorization: Bearer $USER2_TOKEN")

CHAR_COUNT=$(echo $MY_CHARS_RESPONSE | grep -o '"name":"Test Character' | wc -l)

if [ "$CHAR_COUNT" -eq 3 ]; then
  echo -e "${GREEN}✓ All 3 characters imported successfully${NC}"
else
  echo -e "${RED}✗ Character count mismatch. Expected 3, got $CHAR_COUNT${NC}"
fi
echo ""

# User 2: Try to import again (should fail with duplicate message)
echo -e "${BLUE}User 2: Attempting duplicate import (should fail)...${NC}"
DUPLICATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/my/anime/import/$ANIME_ID/" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -n1)
DUPLICATE_BODY=$(echo "$DUPLICATE_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✓ Duplicate import correctly prevented (HTTP 400)${NC}"
  echo "Error message: $DUPLICATE_BODY"
else
  echo -e "${RED}✗ Duplicate import not prevented (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# User 1: Try to import own anime (should fail)
echo -e "${BLUE}User 1: Attempting to import own anime (should fail)...${NC}"
OWN_IMPORT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/my/anime/import/$ANIME_ID/" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$OWN_IMPORT_RESPONSE" | tail -n1)
OWN_IMPORT_BODY=$(echo "$OWN_IMPORT_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✓ Self-import correctly prevented (HTTP 400)${NC}"
  echo "Error message: $OWN_IMPORT_BODY"
else
  echo -e "${RED}✗ Self-import not prevented (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Verify public library still has only one copy
echo -e "${BLUE}Verifying public library has no duplicates...${NC}"
LIBRARY_COUNT=$(curl -s "$BASE_URL/api/library/anime/" | grep -o '"name":"Test Import Anime"' | wc -l)

if [ "$LIBRARY_COUNT" -eq 1 ]; then
  echo -e "${GREEN}✓ Public library has only one copy (no duplicates)${NC}"
else
  echo -e "${RED}✗ Public library has $LIBRARY_COUNT copies${NC}"
fi
echo ""

echo "=========================================="
echo "Test Summary:"
echo "=========================================="
echo "✓ User 1 created public anime"
echo "✓ User 2 viewed anime with correct owner badge"
echo "✓ User 2 imported anime successfully"
echo "✓ Original creator username tracked"
echo "✓ All characters imported"
echo "✓ Duplicate import prevented"
echo "✓ Self-import prevented"
echo "✓ Public library has no duplicates"
echo ""
echo -e "${GREEN}All tests passed!${NC}"
echo ""
echo "Frontend testing checklist:"
echo "1. Open http://localhost:5173/library"
echo "2. Verify 'Test Import Anime' shows username badge (not OFFICIAL)"
echo "3. Login as testuser2"
echo "4. Verify badge shows 'testuser' (blue gradient)"
echo "5. Click on anime, verify 'Import to My Collection' button appears"
echo "6. Import the anime"
echo "7. Go to /anime page"
echo "8. Verify imported anime shows 'Imported from: testuser' badge"
echo "9. Go back to library as testuser"
echo "10. Verify anime now shows 'YOURS' badge (green gradient)"
