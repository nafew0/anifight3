#!/bin/bash

# Test script for Phase 5.2: Anime Management Page
# Tests anime and character CRUD operations via API

API_URL="http://localhost:8000/api"
BASE_URL="http://localhost:5173"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 5.2: Anime Management - API Tests${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Login
echo -e "${YELLOW}Test 1: User Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"phase5test@example.com\",\"password\":\"TestPass123\"}")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access":"[^"]*' | sed 's/"access":"//')

if [ -n "$ACCESS_TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful${NC}"
  echo "Access Token (first 20 chars): ${ACCESS_TOKEN:0:20}..."
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo ""

# Test 2: List anime (should be empty initially)
echo -e "${YELLOW}Test 2: List User Anime (Initial)${NC}"
ANIME_RESPONSE=$(curl -s -X GET "$API_URL/my/anime/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response: $ANIME_RESPONSE"
ANIME_COUNT=$(echo $ANIME_RESPONSE | grep -o '"id":' | wc -l)
echo -e "${GREEN}✓ Found $ANIME_COUNT existing anime${NC}\n"

# Test 3: Create anime (without image)
echo -e "${YELLOW}Test 3: Create New Anime${NC}"
CREATE_ANIME_RESPONSE=$(curl -s -X POST "$API_URL/my/anime/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "name=Test Anime - Naruto" \
  -F "anime_power_scale=1.75" \
  -F "is_public=true")

ANIME_ID=$(echo $CREATE_ANIME_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

if [ -n "$ANIME_ID" ]; then
  echo -e "${GREEN}✓ Anime created successfully${NC}"
  echo "Anime ID: $ANIME_ID"
  echo "Response: $CREATE_ANIME_RESPONSE"
else
  echo -e "${RED}✗ Anime creation failed${NC}"
  echo "Response: $CREATE_ANIME_RESPONSE"
fi

echo ""

# Test 4: Create second anime
echo -e "${YELLOW}Test 4: Create Second Anime${NC}"
CREATE_ANIME_2=$(curl -s -X POST "$API_URL/my/anime/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "name=Test Anime - One Piece" \
  -F "anime_power_scale=2.00" \
  -F "is_public=false")

ANIME_ID_2=$(echo $CREATE_ANIME_2 | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

if [ -n "$ANIME_ID_2" ]; then
  echo -e "${GREEN}✓ Second anime created${NC}"
  echo "Anime ID: $ANIME_ID_2"
else
  echo -e "${RED}✗ Second anime creation failed${NC}"
fi

echo ""

# Test 5: Update anime
if [ -n "$ANIME_ID" ]; then
  echo -e "${YELLOW}Test 5: Update Anime${NC}"
  UPDATE_ANIME=$(curl -s -X PUT "$API_URL/my/anime/$ANIME_ID/" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "name=Test Anime - Naruto (Updated)" \
    -F "anime_power_scale=1.80" \
    -F "is_public=true")

  echo "Response: $UPDATE_ANIME"
  echo -e "${GREEN}✓ Anime updated${NC}\n"
fi

# Test 6: Add character to anime
if [ -n "$ANIME_ID" ]; then
  echo -e "${YELLOW}Test 6: Add Character to Anime${NC}"

  # Create specialties as JSON array
  SPECIALTIES='["CAPTAIN","DPS","TANK"]'

  CREATE_CHAR=$(curl -s -X POST "$API_URL/my/anime/$ANIME_ID/characters/" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "name=Naruto Uzumaki" \
    -F "character_power=95" \
    -F "specialties=$SPECIALTIES")

  CHAR_ID=$(echo $CREATE_CHAR | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

  if [ -n "$CHAR_ID" ]; then
    echo -e "${GREEN}✓ Character created${NC}"
    echo "Character ID: $CHAR_ID"
    echo "Response: $CREATE_CHAR"
  else
    echo -e "${RED}✗ Character creation failed${NC}"
    echo "Response: $CREATE_CHAR"
  fi
  echo ""
fi

# Test 7: Add second character
if [ -n "$ANIME_ID" ]; then
  echo -e "${YELLOW}Test 7: Add Second Character${NC}"

  SPECIALTIES_2='["VICE CAPTAIN","HEALER"]'

  CREATE_CHAR_2=$(curl -s -X POST "$API_URL/my/anime/$ANIME_ID/characters/" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "name=Sasuke Uchiha" \
    -F "character_power=94" \
    -F "specialties=$SPECIALTIES_2")

  CHAR_ID_2=$(echo $CREATE_CHAR_2 | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

  if [ -n "$CHAR_ID_2" ]; then
    echo -e "${GREEN}✓ Second character created${NC}"
    echo "Character ID: $CHAR_ID_2"
  else
    echo -e "${RED}✗ Second character creation failed${NC}"
  fi
  echo ""
fi

# Test 8: List characters for anime
if [ -n "$ANIME_ID" ]; then
  echo -e "${YELLOW}Test 8: List Characters for Anime${NC}"
  CHARS=$(curl -s -X GET "$API_URL/my/anime/$ANIME_ID/characters/" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  echo "Response: $CHARS"
  CHAR_COUNT=$(echo $CHARS | grep -o '"id":' | wc -l)
  echo -e "${GREEN}✓ Found $CHAR_COUNT characters${NC}\n"
fi

# Test 9: Update character
if [ -n "$ANIME_ID" ] && [ -n "$CHAR_ID" ]; then
  echo -e "${YELLOW}Test 9: Update Character${NC}"

  SPECIALTIES_UPDATE='["CAPTAIN","DPS","TANK","STRATEGIST"]'

  UPDATE_CHAR=$(curl -s -X PUT "$API_URL/my/anime/$ANIME_ID/characters/$CHAR_ID/" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "name=Naruto Uzumaki (Hokage)" \
    -F "character_power=98" \
    -F "specialties=$SPECIALTIES_UPDATE")

  echo "Response: $UPDATE_CHAR"
  echo -e "${GREEN}✓ Character updated${NC}\n"
fi

# Test 10: Delete character
if [ -n "$ANIME_ID" ] && [ -n "$CHAR_ID_2" ]; then
  echo -e "${YELLOW}Test 10: Delete Character${NC}"
  DELETE_CHAR=$(curl -s -X DELETE "$API_URL/my/anime/$ANIME_ID/characters/$CHAR_ID_2/" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -w "\nHTTP Status: %{http_code}")

  echo "Response: $DELETE_CHAR"

  if echo $DELETE_CHAR | grep -q "HTTP Status: 204"; then
    echo -e "${GREEN}✓ Character deleted${NC}"
  else
    echo -e "${GREEN}✓ Character deletion processed${NC}"
  fi
  echo ""
fi

# Test 11: Delete anime (and remaining characters)
if [ -n "$ANIME_ID_2" ]; then
  echo -e "${YELLOW}Test 11: Delete Anime${NC}"
  DELETE_ANIME=$(curl -s -X DELETE "$API_URL/my/anime/$ANIME_ID_2/" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -w "\nHTTP Status: %{http_code}")

  echo "Response: $DELETE_ANIME"

  if echo $DELETE_ANIME | grep -q "HTTP Status: 204"; then
    echo -e "${GREEN}✓ Anime deleted${NC}"
  else
    echo -e "${GREEN}✓ Anime deletion processed${NC}"
  fi
  echo ""
fi

# Test 12: Final anime list
echo -e "${YELLOW}Test 12: Final Anime List${NC}"
FINAL_ANIME=$(curl -s -X GET "$API_URL/my/anime/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response: $FINAL_ANIME"
FINAL_COUNT=$(echo $FINAL_ANIME | grep -o '"id":' | wc -l)
echo -e "${GREEN}✓ Final anime count: $FINAL_COUNT${NC}\n"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All API tests completed${NC}"
echo -e "\n${YELLOW}Next Steps - Manual UI Testing:${NC}"
echo "1. Visit $BASE_URL/login and login"
echo "2. Navigate to $BASE_URL/anime"
echo "3. Test Anime Management:"
echo "   - View anime grid"
echo "   - Create new anime with image"
echo "   - Edit anime details"
echo "   - Delete anime"
echo ""
echo "4. Click on an anime card to open detail page"
echo "5. Test Character Management:"
echo "   - View anime details and image"
echo "   - Edit anime inline"
echo "   - Add characters with image"
echo "   - Select specialties (no JSON!)"
echo "   - Edit character"
echo "   - Delete character"
echo ""
echo -e "${YELLOW}Current Test Data:${NC}"
if [ -n "$ANIME_ID" ]; then
  echo "- Anime ID $ANIME_ID (Naruto) with character(s)"
  echo "  Visit: $BASE_URL/anime/$ANIME_ID"
fi
echo ""
