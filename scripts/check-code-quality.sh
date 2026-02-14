#!/bin/bash

# Code Quality Check Script
# Attitudes.vip - Comprehensive code quality verification

set -e

echo "🔍 Running Code Quality Checks..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0

# Function to run a check
run_check() {
    local name=$1
    local command=$2
    
    echo -e "\n${BLUE}▶ $name${NC}"
    if eval "$command"; then
        echo -e "${GREEN}✅ $name passed${NC}"
    else
        echo -e "${RED}❌ $name failed${NC}"
        ((ERRORS++))
    fi
}

# ESLint Check
run_check "ESLint" "npm run lint"

# TypeScript Check
run_check "TypeScript" "npx tsc --noEmit"

# Prettier Check
run_check "Prettier" "npx prettier --check 'src/**/*.{js,jsx,ts,tsx,json,css,scss,md}'"

# Unit Tests
run_check "Unit Tests" "npm test -- --passWithNoTests"

# Security Audit
echo -e "\n${BLUE}▶ Security Audit${NC}"
npm audit --production || echo -e "${YELLOW}⚠️  Some vulnerabilities found${NC}"

# Check for console.logs
echo -e "\n${BLUE}▶ Console.log Check${NC}"
if grep -r "console\.log" src/ --exclude-dir=node_modules --exclude-dir=dist; then
    echo -e "${YELLOW}⚠️  console.log statements found${NC}"
else
    echo -e "${GREEN}✅ No console.log statements${NC}"
fi

# Check for TODO comments
echo -e "\n${BLUE}▶ TODO Comments${NC}"
if grep -r "TODO\|FIXME\|XXX" src/ --exclude-dir=node_modules --exclude-dir=dist; then
    echo -e "${YELLOW}⚠️  TODO/FIXME comments found${NC}"
else
    echo -e "${GREEN}✅ No TODO comments${NC}"
fi

# Complexity Check
echo -e "\n${BLUE}▶ Complexity Analysis${NC}"
npx eslint src/ --rule 'complexity: ["error", 10]' || echo -e "${YELLOW}⚠️  Complex functions detected${NC}"

# Dependency Check
echo -e "\n${BLUE}▶ Dependency Check${NC}"
npx depcheck || echo -e "${YELLOW}⚠️  Unused dependencies detected${NC}"

# Bundle Size (if build exists)
if [ -d "dist" ]; then
    echo -e "\n${BLUE}▶ Bundle Size${NC}"
    du -sh dist/
fi

# Coverage Report
if [ -d "coverage" ]; then
    echo -e "\n${BLUE}▶ Test Coverage${NC}"
    npx nyc report --reporter=text-summary
fi

# Summary
echo -e "\n${BLUE}════════════════════════════════════════${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All quality checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS quality checks failed${NC}"
    exit 1
fi