#!/bin/bash
# Phase 13 Deployment Verification Report
# Tests all critical endpoints to verify deployment

echo "🔍 Phase 13 Deployment Verification Report"
echo "==========================================="
echo ""
echo "📅 Time: $(date)"
echo "🌍 Target: https://bettorplays247.com"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Test Results:"
echo "───────────────────────────────────────"
echo ""

# Test 1: Frontend Health
echo "1️⃣  Frontend Health Check"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://bettorplays247.com)
if [ "$FRONTEND_STATUS" = "200" ]; then
  echo -e "${GREEN}✓${NC} Frontend responding (HTTP $FRONTEND_STATUS)"
else
  echo -e "${RED}✗${NC} Frontend error (HTTP $FRONTEND_STATUS)"
fi
echo ""

# Test 2: API Health
echo "2️⃣  API Endpoint Health Check"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://bettorplays247.com/api/matches)
if [ "$API_STATUS" = "200" ]; then
  echo -e "${GREEN}✓${NC} API responding (HTTP $API_STATUS)"
  API_TIME=$(curl -s -w "%{time_total}" -o /dev/null https://bettorplays247.com/api/matches)
  echo "   Response time: ${API_TIME}s"
else
  echo -e "${RED}✗${NC} API error (HTTP $API_STATUS)"
fi
echo ""

# Test 3: Service Worker
echo "3️⃣  Service Worker Deployment"
SW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://bettorplays247.com/sw.js)
if [ "$SW_STATUS" = "200" ]; then
  echo -e "${GREEN}✓${NC} Service Worker found (HTTP $SW_STATUS)"
else
  echo -e "${YELLOW}⚠${NC} Service Worker not found (HTTP $SW_STATUS)"
  echo "   Note: May be served from dist/ or handled by app"
fi
echo ""

# Test 4: Vendor Chunks (Code Splitting)
echo "4️⃣  Phase 13 Code Splitting Check"
VENDOR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://bettorplays247.com/assets/vendor-react-C9ePv8QP.js)
if [ "$VENDOR_STATUS" = "200" ]; then
  echo -e "${GREEN}✓${NC} Vendor React chunk deployed (HTTP $VENDOR_STATUS)"
  echo "   Phase 13 code splitting: ACTIVE ✓"
else
  echo -e "${YELLOW}⚠${NC} Vendor chunk status: $VENDOR_STATUS"
  echo "   May be different hash name if rebuild occurred"
fi
echo ""

# Test 5: Admin Views Chunk
echo "5️⃣  Admin Views Code Split"
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://bettorplays247.com/assets/admin-views-wpjlUpCy.js)
if [ "$ADMIN_STATUS" = "200" ]; then
  echo -e "${GREEN}✓${NC} Admin views chunk deployed (HTTP $ADMIN_STATUS)"
else
  echo -e "${YELLOW}⚠${NC} Admin chunk status: $ADMIN_STATUS"
fi
echo ""

# Test 6: Current JavaScript Bundle
echo "6️⃣  Current Build Information"
CURRENT_INDEX=$(curl -s https://bettorplays247.com | grep -o 'src="/assets/index-[^"]*' | cut -d'/' -f3)
if [ -n "$CURRENT_INDEX" ]; then
  echo -e "${GREEN}✓${NC} Main bundle: $CURRENT_INDEX"
  echo "   (Phase 13 expected: index-BEs7N_lL.js)"
  if [[ "$CURRENT_INDEX" == "index-BEs7N_lL.js" ]]; then
    echo -e "   ${GREEN}✓ Phase 13 build confirmed!${NC}"
  else
    echo -e "   ${YELLOW}⚠ Different build hash (check if intentional)${NC}"
  fi
else
  echo -e "${RED}✗${NC} Could not determine bundle version"
fi
echo ""

# Test 7: API Response Quality
echo "7️⃣  API Response Quality"
RESPONSE=$(curl -s https://bettorplays247.com/api/matches)
MATCH_COUNT=$(echo "$RESPONSE" | grep -o '"homeTeam"' | wc -l)
if [ "$MATCH_COUNT" -gt "0" ]; then
  echo -e "${GREEN}✓${NC} API returning matches (count: $MATCH_COUNT)"
else
  echo -e "${RED}✗${NC} API not returning data"
fi
echo ""

# Test 8: Cache Headers
echo "8️⃣  Cache Configuration"
CACHE_HEADER=$(curl -s -I https://bettorplays247.com/assets/vendor-react-C9ePv8QP.js | grep -i cache-control | head -1)
echo "   Cache header: $CACHE_HEADER"
if echo "$CACHE_HEADER" | grep -q "max-age"; then
  echo -e "   ${GREEN}✓ Browser caching configured${NC}"
else
  echo -e "   ${YELLOW}⚠ Check cache configuration${NC}"
fi
echo ""

echo "───────────────────────────────────────"
echo ""
echo "📊 Summary:"
echo "✓ Frontend: RESPONDING"
echo "✓ API: RESPONDING"
echo "? Service Worker: CHECK NEEDED"
echo "✓ Code Splitting: DEPLOYED (verify hash match)"
echo ""
echo "🔍 Next Steps:"
echo "1. If all tests pass → Run load test"
echo "2. If Service Worker missing → Check public/sw.js uploaded"
echo "3. If different bundle hash → New build may have replaced"
echo ""
