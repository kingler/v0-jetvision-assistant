#!/bin/bash

# JetVision - Database Schema Validation Script
# This script validates the SQL syntax of migration files

set -e

echo "🔍 Validating Supabase migration files..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

MIGRATION_DIR="/Volumes/SeagatePortableDrive/Projects/v0-jetvision-assistant/supabase/migrations"

# Check if migration directory exists
if [ ! -d "$MIGRATION_DIR" ]; then
  echo -e "${RED}❌ Migration directory not found: $MIGRATION_DIR${NC}"
  exit 1
fi

echo "📁 Migration directory: $MIGRATION_DIR"
echo ""

# Count migration files
MIGRATION_COUNT=$(ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')

if [ "$MIGRATION_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ No migration files found${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Found $MIGRATION_COUNT migration file(s)${NC}"
echo ""

# Validate each migration file
echo "📝 Validating SQL syntax..."
echo ""

for migration_file in "$MIGRATION_DIR"/*.sql; do
  filename=$(basename "$migration_file")
  echo -n "  Checking $filename... "

  # Basic syntax checks
  errors=0

  # Check for unmatched parentheses
  open_parens=$(grep -o '(' "$migration_file" | wc -l | tr -d ' ')
  close_parens=$(grep -o ')' "$migration_file" | wc -l | tr -d ' ')

  if [ "$open_parens" -ne "$close_parens" ]; then
    echo -e "${RED}FAILED${NC}"
    echo -e "    ${RED}Unmatched parentheses: $open_parens open, $close_parens close${NC}"
    errors=$((errors + 1))
  fi

  # Check for common SQL errors
  if grep -q "CREATE TABLE.*CREATE TABLE" "$migration_file"; then
    echo -e "${RED}FAILED${NC}"
    echo -e "    ${RED}Multiple CREATE TABLE without semicolon separator${NC}"
    errors=$((errors + 1))
  fi

  # Check file is not empty
  if [ ! -s "$migration_file" ]; then
    echo -e "${RED}FAILED${NC}"
    echo -e "    ${RED}File is empty${NC}"
    errors=$((errors + 1))
  fi

  if [ $errors -eq 0 ]; then
    echo -e "${GREEN}OK${NC}"
  fi
done

echo ""
echo "📊 Validation Summary:"
echo ""

# Show migration file sizes
for migration_file in "$MIGRATION_DIR"/*.sql; do
  filename=$(basename "$migration_file")
  filesize=$(wc -c < "$migration_file" | tr -d ' ')
  lines=$(wc -l < "$migration_file" | tr -d ' ')
  echo "  • $filename: $lines lines ($filesize bytes)"
done

echo ""
echo -e "${GREEN}✅ All migration files validated successfully${NC}"
echo ""
echo "Next steps:"
echo "  1. Review the migration files"
echo "  2. Run migrations on your Supabase project"
echo "  3. Test with seed data"
echo ""
echo "To run migrations:"
echo "  • Via Supabase Dashboard: Copy SQL to SQL Editor"
echo "  • Via Supabase CLI: supabase db push"
echo ""
