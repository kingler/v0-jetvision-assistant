#!/bin/bash

# Avinode Environment Variable Verification Script
# Checks that all required Avinode env vars are configured correctly

set -e

echo "🔍 Verifying Avinode Environment Variable Configuration"
echo "========================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any issues found
ISSUES_FOUND=0

# Check local .env.local file
echo "📁 Checking .env.local file..."
echo ""

if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local file not found${NC}"
    echo "   Create it from .env.local.example"
    ISSUES_FOUND=1
else
    echo -e "${GREEN}✅ .env.local exists${NC}"
    
    # Check for required variables
    echo ""
    echo "Checking required environment variables:"
    echo ""
    
    # MCP Server requires these (in order of precedence):
    # 1. API_TOKEN or AVINODE_API_TOKEN
    # 2. AUTHENTICATION_TOKEN or AVINODE_BEARER_TOKEN  
    # 3. BASE_URI or AVINODE_BASE_URL
    
    # Check API_TOKEN / AVINODE_API_TOKEN
    if grep -q "^API_TOKEN=" .env.local || grep -q "^AVINODE_API_TOKEN=" .env.local; then
        API_TOKEN_VALUE=$(grep "^API_TOKEN=" .env.local | cut -d'=' -f2 || grep "^AVINODE_API_TOKEN=" .env.local | cut -d'=' -f2 || echo "")
        if [ -n "$API_TOKEN_VALUE" ] && [ "$API_TOKEN_VALUE" != "mock_" ]; then
            echo -e "${GREEN}✅ API_TOKEN or AVINODE_API_TOKEN set${NC}"
        else
            echo -e "${YELLOW}⚠️  API_TOKEN/AVINODE_API_TOKEN is empty or mock${NC}"
            ISSUES_FOUND=1
        fi
    else
        echo -e "${RED}❌ API_TOKEN or AVINODE_API_TOKEN not found${NC}"
        ISSUES_FOUND=1
    fi
    
    # Check AUTHENTICATION_TOKEN / AVINODE_BEARER_TOKEN / AVINODE_API_KEY
    if grep -q "^AUTHENTICATION_TOKEN=" .env.local || grep -q "^AVINODE_BEARER_TOKEN=" .env.local || grep -q "^AVINODE_API_KEY=" .env.local; then
        AUTH_TOKEN_VALUE=$(grep "^AUTHENTICATION_TOKEN=" .env.local | cut -d'=' -f2 || grep "^AVINODE_BEARER_TOKEN=" .env.local | cut -d'=' -f2 || grep "^AVINODE_API_KEY=" .env.local | cut -d'=' -f2 || echo "")
        if [ -n "$AUTH_TOKEN_VALUE" ]; then
            echo -e "${GREEN}✅ AUTHENTICATION_TOKEN or AVINODE_API_KEY set${NC}"
        else
            echo -e "${YELLOW}⚠️  AUTHENTICATION_TOKEN/AVINODE_API_KEY is empty${NC}"
            ISSUES_FOUND=1
        fi
    else
        echo -e "${RED}❌ AUTHENTICATION_TOKEN or AVINODE_API_KEY not found${NC}"
        ISSUES_FOUND=1
    fi
    
    # Check BASE_URI / AVINODE_BASE_URL
    if grep -q "^BASE_URI=" .env.local || grep -q "^AVINODE_BASE_URL=" .env.local; then
        BASE_URI_VALUE=$(grep "^BASE_URI=" .env.local | cut -d'=' -f2 || grep "^AVINODE_BASE_URL=" .env.local | cut -d'=' -f2 || echo "")
        if [ -n "$BASE_URI_VALUE" ]; then
            echo -e "${GREEN}✅ BASE_URI or AVINODE_BASE_URL set: $BASE_URI_VALUE${NC}"
        else
            echo -e "${YELLOW}⚠️  BASE_URI/AVINODE_BASE_URL is empty (will default to sandbox)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  BASE_URI or AVINODE_BASE_URL not found (will default to sandbox)${NC}"
    fi
fi

echo ""
echo "========================================================"
echo ""

# Check Vercel environment variables
echo "☁️  Checking Vercel Environment Variables..."
echo ""

if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not installed - skipping Vercel check${NC}"
    echo "   Install with: npm i -g vercel"
else
    echo "Fetching production environment variables from Vercel..."
    
    # Pull production env vars
    if vercel env pull .env.vercel.production --environment=production 2>/dev/null; then
        echo -e "${GREEN}✅ Successfully pulled Vercel production env vars${NC}"
        echo ""
        echo "Checking Vercel production variables:"
        echo ""
        
        # Check API_TOKEN
        if grep -q "^API_TOKEN=" .env.vercel.production; then
            echo -e "${GREEN}✅ API_TOKEN set in Vercel production${NC}"
        else
            echo -e "${RED}❌ API_TOKEN not set in Vercel production${NC}"
            echo "   Run: vercel env add API_TOKEN production"
            ISSUES_FOUND=1
        fi
        
        # Check AUTHENTICATION_TOKEN or AVINODE_API_KEY
        if grep -q "^AUTHENTICATION_TOKEN=" .env.vercel.production || grep -q "^AVINODE_API_KEY=" .env.vercel.production; then
            echo -e "${GREEN}✅ AUTHENTICATION_TOKEN or AVINODE_API_KEY set in Vercel production${NC}"
        else
            echo -e "${RED}❌ AUTHENTICATION_TOKEN or AVINODE_API_KEY not set in Vercel production${NC}"
            echo "   Run: vercel env add AUTHENTICATION_TOKEN production"
            ISSUES_FOUND=1
        fi
        
        # Check BASE_URI
        if grep -q "^BASE_URI=" .env.vercel.production; then
            BASE_URI_PROD=$(grep "^BASE_URI=" .env.vercel.production | cut -d'=' -f2)
            echo -e "${GREEN}✅ BASE_URI set in Vercel production: $BASE_URI_PROD${NC}"
        else
            echo -e "${YELLOW}⚠️  BASE_URI not set in Vercel production (will fail in production mode)${NC}"
            echo "   Run: vercel env add BASE_URI production"
            echo "   Value: https://api.avinode.com/api (for production) or https://sandbox.avinode.com/api (for testing)"
            ISSUES_FOUND=1
        fi
        
        # Clean up temp file
        rm -f .env.vercel.production
    else
        echo -e "${YELLOW}⚠️  Could not fetch Vercel environment variables${NC}"
        echo "   Make sure you're logged in: vercel login"
        echo "   And linked to project: vercel link"
    fi
fi

echo ""
echo "========================================================"
echo ""

# Summary
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Environment is configured correctly.${NC}"
    exit 0
else
    echo -e "${RED}❌ Issues found. Please fix the environment variables listed above.${NC}"
    echo ""
    echo "📖 Environment Variable Mapping:"
    echo "   MCP Server looks for (in order):"
    echo "   1. API_TOKEN → AVINODE_API_TOKEN"
    echo "   2. AUTHENTICATION_TOKEN → AVINODE_BEARER_TOKEN → AVINODE_API_KEY"
    echo "   3. BASE_URI → AVINODE_BASE_URL"
    echo ""
    echo "   Make sure Vercel has API_TOKEN, AUTHENTICATION_TOKEN, and BASE_URI set."
    exit 1
fi
