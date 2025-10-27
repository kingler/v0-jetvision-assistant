#!/bin/bash
# Script to refactor all API routes from iso_agents to users table
# This implements the code to make TDD tests pass

echo "Refactoring API routes to use users table..."

# Store the route files
ROUTES=(
  "app/api/agents/route.ts"
  "app/api/clients/route.ts"
  "app/api/requests/route.ts"
  "app/api/quotes/route.ts"
  "app/api/workflows/route.ts"
)

# Refactor each route
for route in "${ROUTES[@]}"; do
  if [ -f "$route" ]; then
    echo "Refactoring $route..."

    # Replace iso_agents table references with users
    sed -i '' "s/from('iso_agents')/from('users')/g" "$route"

    # Replace iso_agent_id with user_id
    sed -i '' "s/iso_agent_id/user_id/g" "$route"

    # Update error messages
    sed -i '' "s/ISO agent not found/User not found/g" "$route"

    # Update select statements to include role
    sed -i '' "s/select('id')/select('id, role')/g" "$route"

    # Update join syntax
    sed -i '' "s/iso_agent:iso_agents/user:users/g" "$route"

    echo "✓ $route refactored"
  else
    echo "✗ $route not found"
  fi
done

echo "API route refactoring complete!"
