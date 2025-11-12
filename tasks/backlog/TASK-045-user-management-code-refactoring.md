# Task: User Management Code Refactoring
# Option A - Database Migration Code Implementation

**Task ID**: TASK-045
**Created**: 2025-10-26
**Assigned To**: Development Team
**Status**: `pending`
**Priority**: `critical`
**Estimated Time**: 16 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Refactor the entire codebase to migrate from `iso_agents` table to `users` table with multi-role support, including updating TypeScript types, API routes, webhook handlers, and all test files.

### User Story
**As a** developer
**I want** all code references updated from `iso_agents` to `users` with proper type safety
**So that** the application works seamlessly with the new multi-role user management system

### Business Value
Enables the transition from a single-role ISO agent system to a comprehensive multi-role user management system supporting sales representatives, administrators, customers, and operators. This is essential for expanding the platform's target market and supporting different user personas.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: TypeScript type definitions SHALL be updated
- Replace `IsoAgent` interface with `User` interface
- Update `UserRole` enum to include `sales_rep`, `customer`
- Update `ClientProfile` and `Request` interfaces to use `user_id`
- Update `Database` schema type to use `users` table

**FR-2**: API routes SHALL use new table/column names
- All Supabase queries updated from `iso_agents` to `users`
- All references to `iso_agent_id` changed to `user_id`
- Webhook handler updated to support role assignment from Clerk metadata
- Error messages updated to reflect new terminology

**FR-3**: All test files SHALL be updated
- Mock data updated to use `User` instead of `IsoAgent`
- Test assertions updated for new table/column names
- Webhook tests updated for role assignment logic
- Integration tests updated for new schema

### Acceptance Criteria

- [ ] **AC-1**: `lib/types/database.ts` updated with new User interface and types
- [ ] **AC-2**: All 8 API routes (`/api/agents`, `/api/clients`, `/api/requests`, `/api/quotes`, `/api/workflows`, `/api/analytics`, `/api/email`, `/api/webhooks/clerk`) refactored successfully
- [ ] **AC-3**: Clerk webhook supports role assignment from `public_metadata.role`
- [ ] **AC-4**: All 15+ test files updated with new types and table names
- [ ] **AC-5**: `__tests__/utils/mock-factories.ts` provides User mock factory
- [ ] **AC-6**: All existing tests pass after refactoring
- [ ] **AC-7**: No TypeScript errors or warnings
- [ ] **AC-8**: Code review approved

### Non-Functional Requirements

- **Type Safety**: 100% type coverage, no `any` types
- **Backward Compatibility**: None required (breaking change with database migration)
- **Performance**: No performance degradation from refactoring
- **Code Quality**: Follow existing code style and patterns

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

Update existing test files to expect new structure (they will fail until implementation is complete):

**Test Files to Update**:
```
__tests__/unit/api/agents/route.test.ts
__tests__/unit/api/clients/route.test.ts
__tests__/unit/api/requests/route.test.ts
__tests__/unit/api/quotes/route.test.ts
__tests__/unit/api/workflows/route.test.ts
__tests__/unit/api/webhooks/clerk.test.ts
__tests__/utils/mock-factories.ts
```

**Example Updated Test**:
```typescript
// __tests__/unit/api/clients/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/clients/route'

describe('Clients API Route', () => {
  const mockUser = {
    id: 'user-123',
    clerk_user_id: 'user_test123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'sales_rep', // Changed from iso_agent
  }

  beforeEach(() => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
        })
      })
    } as any)
  })

  it('should fetch user and their clients', async () => {
    const response = await GET(mockRequest)

    expect(supabase.from).toHaveBeenCalledWith('users') // Changed from iso_agents
    expect(response.status).toBe(200)
  })
})
```

**Run Tests** (they should FAIL):
```bash
npm test
# Expected: Tests fail because implementation still uses old table names
```

### Step 2: Implement Minimal Code (Green Phase)

Update implementation files to make tests pass:

**Implementation Checklist**:
- [ ] Update TypeScript types
- [ ] Refactor API routes
- [ ] Update webhook handler
- [ ] Update test utilities
- [ ] Make all tests pass

### Step 3: Refactor (Blue Phase)

After tests pass:
- [ ] Remove any code duplication
- [ ] Improve error messages
- [ ] Add JSDoc comments
- [ ] Ensure consistent naming

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] Review `docs/USER_MANAGEMENT_MIGRATION_PLAN.md`
- [ ] Verify database migrations 004-007 are ready
- [ ] Ensure backup strategy is in place
- [ ] Coordinate with team on deployment timeline

### Step-by-Step Implementation

**Step 1**: Update TypeScript Type Definitions
File: `lib/types/database.ts`

```typescript
// Update UserRole enum
export type UserRole =
  | 'sales_rep'      // Replaces iso_agent
  | 'admin'
  | 'customer'       // New role
  | 'operator';

// Rename IsoAgent to User
export interface User {  // Previously: IsoAgent
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  margin_type: MarginType | null;
  margin_value: number | null;
  is_active: boolean;
  avatar_url: string | null;         // New field
  phone: string | null;              // New field
  timezone: string;                  // New field
  preferences: Record<string, any>;  // New field
  metadata: Record<string, any>;
  last_login_at: string | null;      // New field
  created_at: string;
  updated_at: string;
}

// Update ClientProfile to use user_id
export interface ClientProfile {
  id: string;
  user_id: string;  // Previously: iso_agent_id
  company_name: string;
  // ... rest of fields
}

// Update Request to use user_id
export interface Request {
  id: string;
  user_id: string;  // Previously: iso_agent_id
  // ... rest of fields
}

// Update Database schema type
export interface Database {
  public: {
    Tables: {
      users: {  // Previously: iso_agents
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      // ... other tables
    };
  };
}
```

**Step 2**: Refactor API Routes

Pattern to apply to all routes:

```typescript
// Before:
const { data: isoAgent } = await supabase
  .from('iso_agents')
  .select('id')
  .eq('clerk_user_id', userId)
  .single();

if (!isoAgent) {
  return NextResponse.json({ error: 'ISO agent not found' }, { status: 404 });
}

const query = supabase
  .from('client_profiles')
  .select('*')
  .eq('iso_agent_id', isoAgent.id);

// After:
const { data: user } = await supabase
  .from('users')
  .select('id, role')
  .eq('clerk_user_id', userId)
  .single();

if (!user) {
  return NextResponse.json({ error: 'User not found' }, { status: 404 });
}

const query = supabase
  .from('client_profiles')
  .select('*')
  .eq('user_id', user.id);
```

**Files to Update**:
1. `app/api/agents/route.ts`
2. `app/api/clients/route.ts`
3. `app/api/requests/route.ts`
4. `app/api/quotes/route.ts`
5. `app/api/workflows/route.ts`
6. `app/api/analytics/route.ts`
7. `app/api/email/route.ts`

**Step 3**: Update Clerk Webhook Handler

File: `app/api/webhooks/clerk/route.ts`

```typescript
case 'user.created': {
  const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;

  // Extract primary email
  const email = email_addresses[0]?.email_address;
  if (!email) {
    console.error('No email address found for user:', id);
    return new Response('Error: No email address', { status: 400 });
  }

  // Extract role from Clerk public_metadata (default to 'customer')
  const role = (public_metadata?.role as UserRole) || 'customer';

  // Validate role
  const validRoles: UserRole[] = ['sales_rep', 'admin', 'customer', 'operator'];
  if (!validRoles.includes(role)) {
    console.warn(`Invalid role ${role} for user ${id}, defaulting to customer`);
    role = 'customer';
  }

  // Create user in Supabase users table
  const { data, error } = await supabase
    .from('users')  // Changed from 'iso_agents'
    .insert({
      clerk_user_id: id,
      email: email,
      full_name: `${first_name || ''} ${last_name || ''}`.trim() || email,
      role: role,
      is_active: true,
      timezone: (public_metadata?.timezone as string) || 'UTC',
      phone: (public_metadata?.phone as string) || null,
    })
    .select()
    .single();

  // ... rest of logic
}
```

**Step 4**: Update Test Mock Factories

File: `__tests__/utils/mock-factories.ts`

```typescript
import { User, ClientProfile, Request } from '@/lib/types/database';

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-123',
    clerk_user_id: 'user_test123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'sales_rep',
    margin_type: 'percentage',
    margin_value: 10.0,
    is_active: true,
    avatar_url: null,
    phone: null,
    timezone: 'UTC',
    preferences: {},
    metadata: {},
    last_login_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockClientProfile(overrides?: Partial<ClientProfile>): ClientProfile {
  return {
    id: 'client-123',
    user_id: 'user-123',  // Changed from iso_agent_id
    company_name: 'Test Company',
    contact_name: 'John Doe',
    email: 'john@testcompany.com',
    phone: '+1234567890',
    preferences: {},
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockRequest(overrides?: Partial<Request>): Request {
  return {
    id: 'request-123',
    user_id: 'user-123',  // Changed from iso_agent_id
    client_profile_id: 'client-123',
    departure_airport: 'JFK',
    arrival_airport: 'LAX',
    departure_date: new Date().toISOString(),
    return_date: null,
    passengers: 4,
    aircraft_type: null,
    budget: null,
    special_requirements: null,
    status: 'draft',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
```

**Step 5**: Update All Test Files

Apply the pattern from Step 1 to all test files:
- Replace `IsoAgent` with `User`
- Replace `iso_agents` with `users`
- Replace `iso_agent_id` with `user_id`
- Update mock data using new factories

**Step 6**: Validation

```bash
# Type check
npx tsc --noEmit

# Run tests
npm test

# Lint
npm run lint

# Build
npm run build
```

### Implementation Validation

After each step:
- [ ] Code compiles without errors
- [ ] Tests pass
- [ ] No TypeScript errors
- [ ] Linting passes

---

## 5. GIT WORKFLOW

### Branch Creation

```bash
git checkout main
git pull origin main
git checkout -b feat/user-management-code-refactoring
```

### Commit Guidelines

**Commit in Logical Groups**:

```bash
# Commit 1: TypeScript types
git add lib/types/database.ts
git commit -m "refactor(types): migrate from IsoAgent to User interface"

# Commit 2: API routes
git add app/api/agents/route.ts app/api/clients/route.ts app/api/requests/route.ts
git commit -m "refactor(api): update routes to use users table and user_id"

# Commit 3: Webhook
git add app/api/webhooks/clerk/route.ts
git commit -m "feat(webhook): add role assignment from Clerk metadata"

# Commit 4: Test utilities
git add __tests__/utils/mock-factories.ts
git commit -m "test: update mock factories for User model"

# Commit 5: All tests
git add __tests__
git commit -m "test: update all tests for user management migration"
```

### Pull Request Process

**PR Title**: `refactor: User management code refactoring for multi-role support`

**PR Description**:
```markdown
## Summary
Completes code refactoring for user management system migration from `iso_agents` to `users` table with multi-role support.

## Changes
- ✅ Updated TypeScript types (IsoAgent → User)
- ✅ Refactored 8 API routes to use new table/columns
- ✅ Enhanced Clerk webhook with role assignment
- ✅ Updated 15+ test files with new schema
- ✅ Updated mock factories

## Testing
- All tests passing (100% of existing tests)
- TypeScript compilation successful
- No linting errors

## Dependencies
- **Requires**: Database migrations 004-007 to be deployed
- **Related**: TASK-045, TASK-046, TASK-047

## Deployment Notes
⚠️ **IMPORTANT**: This code MUST be deployed simultaneously with database migrations 004-007. Do not deploy code without database migration or vice versa.

## Checklist
- [x] TypeScript types updated
- [x] API routes refactored
- [x] Webhook enhanced
- [x] Tests updated and passing
- [x] Documentation updated
- [x] Code review requested
```

---

## 6. CODE REVIEW CHECKLIST

### Reviewer Checklist

**Type Safety**:
- [ ] No `any` types introduced
- [ ] All interfaces properly defined
- [ ] Nullable types handled correctly
- [ ] No TypeScript errors

**Code Changes**:
- [ ] All references to `iso_agents` replaced with `users`
- [ ] All references to `iso_agent_id` replaced with `user_id`
- [ ] Error messages updated to new terminology
- [ ] Logging updated with new table names

**Testing**:
- [ ] All test files updated
- [ ] Mock data uses new structure
- [ ] Test coverage maintained or improved
- [ ] Tests pass locally

**Documentation**:
- [ ] JSDoc comments updated where needed
- [ ] Migration plan referenced
- [ ] Deployment notes clear

---

## 7. TESTING REQUIREMENTS

### Unit Tests

**Coverage Target**: Maintain existing 75%+ coverage

**Test Updates Required**:
```
__tests__/unit/api/agents/route.test.ts
__tests__/unit/api/clients/route.test.ts
__tests__/unit/api/requests/route.test.ts
__tests__/unit/api/quotes/route.test.ts
__tests__/unit/api/workflows/route.test.ts
__tests__/unit/api/webhooks/clerk.test.ts
__tests__/integration/mcp/supabase-tools.test.ts
__tests__/unit/mcp/supabase-mcp-server.test.ts
```

**Example Test Update**:
```typescript
describe('Clients API - GET', () => {
  it('should fetch user and return their clients', async () => {
    const mockUser = createMockUser({ role: 'sales_rep' });
    const mockClients = [createMockClientProfile({ user_id: mockUser.id })];

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
            })
          })
        } as any;
      }
      if (table === 'client_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockClients, error: null })
          })
        } as any;
      }
    });

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(data.clients).toHaveLength(1);
    expect(data.clients[0].user_id).toBe(mockUser.id);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- clients/route.test.ts

# Run with coverage
npm run test:coverage

# Verify coverage threshold
# Should maintain >75% for all categories
```

---

## 8. DEFINITION OF DONE

### Code Complete
- [ ] All TypeScript types updated
- [ ] All 8 API routes refactored
- [ ] Clerk webhook enhanced
- [ ] All test files updated
- [ ] No TypeScript errors
- [ ] Linting passes

### Testing Complete
- [ ] All existing tests updated and passing
- [ ] Test coverage maintained at 75%+
- [ ] No test failures
- [ ] Mock factories updated

### Documentation Complete
- [ ] Code comments updated
- [ ] Deployment notes in PR
- [ ] Migration plan referenced

### Code Review Complete
- [ ] PR created and reviewed
- [ ] At least 1 approval received
- [ ] All feedback addressed

### Deployment Ready
- [ ] Coordinated with database migration deployment
- [ ] Verified on staging environment
- [ ] Rollback plan documented

---

## 9. RESOURCES & REFERENCES

### Documentation
- [User Management Migration Plan](../../docs/USER_MANAGEMENT_MIGRATION_PLAN.md)
- [Database Migrations README](../../supabase/migrations/README_USER_MIGRATION.md)
- [Clerk Supabase Sync](../../docs/CLERK_SUPABASE_SYNC.md)
- [Database Types](../../lib/types/database.ts)

### Related Tasks
- TASK-046: RBAC Middleware Implementation (depends on this)
- TASK-047: User Profile UI (depends on this)
- Database Migrations 004-007 (must be deployed together)

---

## 10. NOTES & QUESTIONS

### Implementation Notes
- This is a breaking change that requires coordinated deployment with database migrations
- Cannot be deployed independently
- Requires database migration 004-007 to be run first on staging, then production

### Open Questions
- [ ] Timing of deployment window?
- [ ] Who will run database migrations?
- [ ] Rollback procedure if issues occur?

### Assumptions
- Database migrations 004-007 are tested and ready
- Staging environment available for testing
- Team coordinated on deployment timing

### Risks/Blockers
- **Risk 1**: Code deployed without database migration → Application breaks
  - **Mitigation**: Feature flag, coordinated deployment, staging testing
- **Risk 2**: Database migration fails during deployment
  - **Mitigation**: Rollback script 008 ready, backup created

---

## 11. COMPLETION SUMMARY

### What Was Accomplished
[Fill out after task completion]

### Changes Made
[List all files created/modified]

### Test Results
```
[Test output here]
```

### Time Tracking
- **Estimated**: 16 hours
- **Actual**: [Fill in]
- **Variance**: [Fill in]

---

**Task Status**: ⏳ PENDING
**Blocked By**: Database migrations must be ready
**Blocks**: TASK-046 (RBAC), TASK-047 (Profile UI)
