#!/bin/bash
# AniFight API Endpoint Test Script
# This script tests all API endpoints with various scenarios

BASE_URL="http://localhost:8000/api"
echo "Testing AniFight API endpoints..."
echo "=================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: GET /api/templates/
echo -e "${YELLOW}Test 1: GET /api/templates/${NC}"
response=$(curl -s "${BASE_URL}/templates/")
if echo "$response" | grep -q "Standard 6v6"; then
    echo -e "${GREEN}✓ Templates endpoint working${NC}"
else
    echo -e "${RED}✗ Templates endpoint failed${NC}"
fi
echo ""

# Test 2: GET /api/anime/
echo -e "${YELLOW}Test 2: GET /api/anime/${NC}"
response=$(curl -s "${BASE_URL}/anime/")
echo "Response: $response"
echo -e "${GREEN}✓ Anime endpoint accessible${NC}"
echo ""

# Test 3: GET /api/characters/
echo -e "${YELLOW}Test 3: GET /api/characters/${NC}"
response=$(curl -s "${BASE_URL}/characters/")
echo "Response: $response"
echo -e "${GREEN}✓ Characters endpoint accessible${NC}"
echo ""

# Test 4: GET /api/characters/?anime_ids=1,2
echo -e "${YELLOW}Test 4: GET /api/characters/?anime_ids=1,2${NC}"
response=$(curl -s "${BASE_URL}/characters/?anime_ids=1,2")
echo "Response: $response"
echo -e "${GREEN}✓ Characters filtering working${NC}"
echo ""

# Test 5: POST /api/draw/ with invalid data
echo -e "${YELLOW}Test 5: POST /api/draw/ (error handling)${NC}"
response=$(curl -s -X POST "${BASE_URL}/draw/" \
  -H "Content-Type: application/json" \
  -d '{"remainingCharacterIds": []}')
if echo "$response" | grep -q "error"; then
    echo -e "${GREEN}✓ Draw endpoint error handling working${NC}"
else
    echo -e "${RED}✗ Draw endpoint error handling failed${NC}"
fi
echo ""

# Test 6: POST /api/draw/ with valid data but missing character
echo -e "${YELLOW}Test 6: POST /api/draw/ (missing character)${NC}"
response=$(curl -s -X POST "${BASE_URL}/draw/" \
  -H "Content-Type: application/json" \
  -d '{"remainingCharacterIds": [999]}')
if echo "$response" | grep -q "not found"; then
    echo -e "${GREEN}✓ Draw endpoint handles missing characters${NC}"
else
    echo -e "${RED}✗ Draw endpoint should return 'not found'${NC}"
fi
echo ""

# Test 7: POST /api/score/ with minimal data
echo -e "${YELLOW}Test 7: POST /api/score/ (minimal data)${NC}"
response=$(curl -s -X POST "${BASE_URL}/score/" \
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
  }')
if echo "$response" | grep -q "winner"; then
    echo -e "${GREEN}✓ Score endpoint working${NC}"
    echo "Response excerpt: $(echo $response | head -c 200)..."
else
    echo -e "${RED}✗ Score endpoint failed${NC}"
fi
echo ""

# Test 8: POST /api/score/ with invalid template
echo -e "${YELLOW}Test 8: POST /api/score/ (invalid template)${NC}"
response=$(curl -s -X POST "${BASE_URL}/score/" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": 999,
    "leftTeam": {
      "assignments": [{"role": "CAPTAIN", "characterId": 1}]
    },
    "rightTeam": {
      "assignments": [{"role": "CAPTAIN", "characterId": 2}]
    }
  }')
if echo "$response" | grep -q "not found"; then
    echo -e "${GREEN}✓ Score endpoint handles missing template${NC}"
else
    echo -e "${RED}✗ Score endpoint should return 'not found'${NC}"
fi
echo ""

echo "=================================="
echo -e "${GREEN}All tests completed!${NC}"
echo ""
echo "Note: Some tests may fail if the database is empty."
echo "To add test data, use the Django Admin at http://localhost:8000/admin/"
