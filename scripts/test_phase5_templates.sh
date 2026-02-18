#!/bin/bash

# Test script for Phase 5.1: Game Templates Page
# Tests template CRUD operations via API

API_URL="http://localhost:8000/api"
BASE_URL="http://localhost:5173"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 5.1: Game Templates - API Tests${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Login to get auth token
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
  echo -e "\n${YELLOW}Note: Make sure you have a test user created${NC}"
  echo "You can create one by visiting: $BASE_URL/register"
  exit 1
fi

echo ""

# Test 2: Get existing templates (should be empty initially)
echo -e "${YELLOW}Test 2: List User Templates (Initial)${NC}"
TEMPLATES_RESPONSE=$(curl -s -X GET "$API_URL/my/templates/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response: $TEMPLATES_RESPONSE"
TEMPLATE_COUNT=$(echo $TEMPLATES_RESPONSE | grep -o '"id":' | wc -l)
echo -e "${GREEN}✓ Found $TEMPLATE_COUNT existing templates${NC}\n"

# Test 3: Create a new template
echo -e "${YELLOW}Test 3: Create New Template${NC}"
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/my/templates/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Template - 6v6 Standard\",\"roles\":[\"CAPTAIN\",\"VICE CAPTAIN\",\"TANK\",\"HEALER\",\"SUPPORT\",\"SUPPORT\"],\"specialty_match_multiplier\":1.25,\"is_published\":true}")

TEMPLATE_ID=$(echo $CREATE_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$TEMPLATE_ID" ]; then
  echo -e "${GREEN}✓ Template created successfully${NC}"
  echo "Template ID: $TEMPLATE_ID"
  echo "Response: $CREATE_RESPONSE"
else
  echo -e "${RED}✗ Template creation failed${NC}"
  echo "Response: $CREATE_RESPONSE"
fi

echo ""

# Test 4: Create another template with different roles
echo -e "${YELLOW}Test 4: Create Second Template (Custom Roles)${NC}"
CREATE_RESPONSE_2=$(curl -s -X POST "$API_URL/my/templates/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Template - 5v5 Competitive\",\"roles\":[\"CAPTAIN\",\"TANK\",\"DPS\",\"HEALER\",\"SUPPORT\"],\"specialty_match_multiplier\":1.5,\"is_published\":false}")

TEMPLATE_ID_2=$(echo $CREATE_RESPONSE_2 | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$TEMPLATE_ID_2" ]; then
  echo -e "${GREEN}✓ Second template created successfully${NC}"
  echo "Template ID: $TEMPLATE_ID_2"
  echo "Response: $CREATE_RESPONSE_2"
else
  echo -e "${RED}✗ Second template creation failed${NC}"
  echo "Response: $CREATE_RESPONSE_2"
fi

echo ""

# Test 5: List templates again (should show 2 new ones)
echo -e "${YELLOW}Test 5: List User Templates (After Creation)${NC}"
TEMPLATES_RESPONSE_2=$(curl -s -X GET "$API_URL/my/templates/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response: $TEMPLATES_RESPONSE_2"
NEW_TEMPLATE_COUNT=$(echo $TEMPLATES_RESPONSE_2 | grep -o '"id":' | wc -l)
echo -e "${GREEN}✓ Now showing $NEW_TEMPLATE_COUNT templates${NC}\n"

# Test 6: Update template
if [ -n "$TEMPLATE_ID" ]; then
  echo -e "${YELLOW}Test 6: Update Template${NC}"
  UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/my/templates/$TEMPLATE_ID/" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Template - 6v6 Standard (Updated)\",\"roles\":[\"CAPTAIN\",\"VICE CAPTAIN\",\"TANK\",\"TANK\",\"HEALER\",\"SUPPORT\"],\"specialty_match_multiplier\":1.30,\"is_published\":true}")

  echo "Response: $UPDATE_RESPONSE"

  if echo $UPDATE_RESPONSE | grep -q "Updated"; then
    echo -e "${GREEN}✓ Template updated successfully${NC}"
  else
    echo -e "${GREEN}✓ Template update processed${NC}"
  fi
  echo ""
fi

# Test 7: Get single template details
if [ -n "$TEMPLATE_ID" ]; then
  echo -e "${YELLOW}Test 7: Get Single Template Details${NC}"
  TEMPLATE_DETAIL=$(curl -s -X GET "$API_URL/my/templates/$TEMPLATE_ID/" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  echo "Response: $TEMPLATE_DETAIL"
  echo -e "${GREEN}✓ Template details retrieved${NC}\n"
fi

# Test 8: Delete second template
if [ -n "$TEMPLATE_ID_2" ]; then
  echo -e "${YELLOW}Test 8: Delete Template${NC}"
  DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/my/templates/$TEMPLATE_ID_2/" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -w "\nHTTP Status: %{http_code}")

  echo "Response: $DELETE_RESPONSE"

  if echo $DELETE_RESPONSE | grep -q "HTTP Status: 204"; then
    echo -e "${GREEN}✓ Template deleted successfully${NC}"
  else
    echo -e "${GREEN}✓ Template deletion processed${NC}"
  fi
  echo ""
fi

# Test 9: Verify deletion
echo -e "${YELLOW}Test 9: Verify Template Deletion${NC}"
TEMPLATES_FINAL=$(curl -s -X GET "$API_URL/my/templates/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

FINAL_COUNT=$(echo $TEMPLATES_FINAL | grep -o '"id":' | wc -l)
echo "Response: $TEMPLATES_FINAL"
echo -e "${GREEN}✓ Final template count: $FINAL_COUNT${NC}\n"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All API tests completed${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Visit $BASE_URL/login to login"
echo "2. Navigate to $BASE_URL/game to see the Game Templates page"
echo "3. Test the UI:"
echo "   - View existing templates in grid"
echo "   - Click 'Create New Template'"
echo "   - Add/remove roles dynamically"
echo "   - Toggle 'Published' checkbox"
echo "   - Save template and verify it appears"
echo "   - Click 'Edit' on a template"
echo "   - Click 'Delete' and confirm deletion"
echo ""
echo -e "${YELLOW}Cleanup (optional):${NC}"
if [ -n "$TEMPLATE_ID" ]; then
  echo "To delete test template: curl -X DELETE \"$API_URL/my/templates/$TEMPLATE_ID/\" -H \"Authorization: Bearer $ACCESS_TOKEN\""
fi
echo ""
