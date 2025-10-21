# Dashboard Pages Implementation

**Task ID**: TASK-020
**Created**: 2025-10-20
**Assigned To**: Frontend Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 12 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement all dashboard pages for the JetVision AI Assistant including the main dashboard layout with navigation, requests list page, new request creation page, and request detail view with responsive design using Next.js App Router and Tailwind CSS.

### User Story
**As an** ISO agent
**I want** intuitive dashboard pages to manage flight requests
**So that** I can efficiently track, create, and view request details with a professional interface

### Business Value
The dashboard is the primary interface for ISO agents to interact with the system. Well-designed, responsive pages improve user productivity, reduce errors, and enhance the overall user experience. Proper page structure enables efficient request management and supports the complete RFP workflow.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement main dashboard layout
- Responsive header with navigation and user profile
- Collapsible sidebar for request list
- Main content area for page rendering
- Footer with branding and links
- Mobile-first responsive design

**FR-2**: System SHALL implement main dashboard page (app/(dashboard)/page.tsx)
- Overview statistics (total requests, pending, completed)
- Recent requests list (last 5-10)
- Quick actions (New Request, View All)
- Status distribution chart
- Real-time data updates

**FR-3**: System SHALL implement requests list page (app/(dashboard)/requests/page.tsx)
- Paginated table of all requests
- Filter by status (All, Pending, Completed, Failed)
- Sort by date, status, route
- Search by route or client name
- Status badges with color coding
- Click row to view details

**FR-4**: System SHALL implement new request page (app/(dashboard)/requests/new/page.tsx)
- Form with fields: departure, arrival, passengers, date, special requirements
- Airport autocomplete with validation
- Date picker with future date validation
- Passenger count (1-20)
- Special requirements textarea
- Submit triggers workflow
- Loading state during submission
- Success redirect to request detail

**FR-5**: System SHALL implement request detail page (app/(dashboard)/requests/[id]/page.tsx)
- Display request information (route, passengers, date)
- Show workflow status with visual progression
- Display client profile (if returning customer)
- List received quotes in table
- Show generated proposals
- Action buttons (Cancel, Regenerate Proposal)
- Real-time updates for quote arrivals
- Breadcrumb navigation

**FR-6**: System SHALL implement responsive design
- Mobile breakpoint: 320px-768px (stacked layout, hamburger menu)
- Tablet breakpoint: 768px-1024px (partial sidebar)
- Desktop breakpoint: 1024px+ (full sidebar)
- Touch-friendly buttons (min 44x44px)
- Readable fonts (16px+ body text)

### Acceptance Criteria

- [ ] **AC-1**: Dashboard layout renders correctly on all screen sizes
- [ ] **AC-2**: Main dashboard page displays statistics and recent requests
- [ ] **AC-3**: Requests list page shows all requests with pagination
- [ ] **AC-4**: Filters and sorting work correctly on requests list
- [ ] **AC-5**: New request form validates input and submits successfully
- [ ] **AC-6**: Request detail page displays all request information
- [ ] **AC-7**: Navigation between pages works smoothly
- [ ] **AC-8**: Responsive design functions on mobile, tablet, desktop
- [ ] **AC-9**: Loading states display during data fetching
- [ ] **AC-10**: Error states show user-friendly messages
- [ ] **AC-11**: All components tested with React Testing Library (>70% coverage)
- [ ] **AC-12**: Code review approved

### Non-Functional Requirements

- **Performance**: Initial page load <3 seconds, client-side navigation <500ms
- **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation support
- **Usability**: Intuitive navigation, clear visual hierarchy
- **Responsive**: Works on mobile (320px) to desktop (2560px+)

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/components/dashboard/DashboardLayout.test.tsx
__tests__/components/dashboard/MainDashboard.test.tsx
__tests__/pages/requests/RequestsList.test.tsx
__tests__/pages/requests/NewRequest.test.tsx
__tests__/pages/requests/RequestDetail.test.tsx
__tests__/e2e/dashboard-navigation.spec.ts
```

**Example Tests**:
```typescript
// __tests__/components/dashboard/DashboardLayout.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DashboardLayout from '@/app/(dashboard)/layout'

describe('DashboardLayout', () => {
  it('should render header with navigation', () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByText('JetVision')).toBeInTheDocument()
  })

  it('should render sidebar with request list', () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    expect(screen.getByRole('complementary')).toBeInTheDocument()
    expect(screen.getByText('Requests')).toBeInTheDocument()
  })

  it('should render main content area', () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should toggle sidebar on mobile', async () => {
    const { user } = render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    const menuButton = screen.getByLabelText('Toggle menu')
    await user.click(menuButton)

    const sidebar = screen.getByRole('complementary')
    expect(sidebar).toHaveClass('open')
  })
})

// __tests__/pages/requests/RequestsList.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RequestsPage from '@/app/(dashboard)/requests/page'

vi.mock('@/lib/api-client', () => ({
  useRequests: () => ({
    data: {
      requests: [
        {
          id: 'req-1',
          departure_airport: 'TEB',
          arrival_airport: 'VNY',
          passengers: 4,
          departure_date: '2025-11-15',
          status: 'AWAITING_QUOTES'
        },
        {
          id: 'req-2',
          departure_airport: 'JFK',
          arrival_airport: 'LAX',
          passengers: 2,
          departure_date: '2025-11-20',
          status: 'COMPLETED'
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        total_pages: 1
      }
    },
    isLoading: false,
    error: null
  })
}))

describe('RequestsPage', () => {
  it('should render requests table', async () => {
    render(<RequestsPage />)

    await waitFor(() => {
      expect(screen.getByText('TEB → VNY')).toBeInTheDocument()
      expect(screen.getByText('JFK → LAX')).toBeInTheDocument()
    })
  })

  it('should display status badges', async () => {
    render(<RequestsPage />)

    await waitFor(() => {
      expect(screen.getByText('Awaiting Quotes')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  it('should filter by status', async () => {
    const { user } = render(<RequestsPage />)

    const statusFilter = screen.getByLabelText('Filter by status')
    await user.selectOptions(statusFilter, 'COMPLETED')

    await waitFor(() => {
      expect(screen.queryByText('TEB → VNY')).not.toBeInTheDocument()
      expect(screen.getByText('JFK → LAX')).toBeInTheDocument()
    })
  })

  it('should navigate to request detail on row click', async () => {
    const { user } = render(<RequestsPage />)

    const firstRow = screen.getByText('TEB → VNY').closest('tr')
    await user.click(firstRow!)

    // Verify navigation (mock router)
    expect(mockRouter.push).toHaveBeenCalledWith('/requests/req-1')
  })
})

// __tests__/pages/requests/NewRequest.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import NewRequestPage from '@/app/(dashboard)/requests/new/page'

describe('NewRequestPage', () => {
  it('should render request form', () => {
    render(<NewRequestPage />)

    expect(screen.getByLabelText('Departure Airport')).toBeInTheDocument()
    expect(screen.getByLabelText('Arrival Airport')).toBeInTheDocument()
    expect(screen.getByLabelText('Passengers')).toBeInTheDocument()
    expect(screen.getByLabelText('Departure Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Special Requirements')).toBeInTheDocument()
  })

  it('should validate required fields', async () => {
    const { user } = render(<NewRequestPage />)

    const submitButton = screen.getByRole('button', { name: 'Create Request' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Departure airport is required')).toBeInTheDocument()
      expect(screen.getByText('Arrival airport is required')).toBeInTheDocument()
      expect(screen.getByText('Passenger count is required')).toBeInTheDocument()
    })
  })

  it('should autocomplete airport codes', async () => {
    const { user } = render(<NewRequestPage />)

    const departureInput = screen.getByLabelText('Departure Airport')
    await user.type(departureInput, 'TEB')

    await waitFor(() => {
      expect(screen.getByText('TEB - Teterboro Airport')).toBeInTheDocument()
    })
  })

  it('should submit valid form', async () => {
    const { user } = render(<NewRequestPage />)

    await user.type(screen.getByLabelText('Departure Airport'), 'TEB')
    await user.type(screen.getByLabelText('Arrival Airport'), 'VNY')
    await user.type(screen.getByLabelText('Passengers'), '4')
    await user.type(screen.getByLabelText('Departure Date'), '2025-11-15')

    const submitButton = screen.getByRole('button', { name: 'Create Request' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringMatching(/\/requests\/req-/))
    })
  })
})

// __tests__/e2e/dashboard-navigation.spec.ts (Playwright)
import { test, expect } from '@playwright/test'

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/sign-in')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should navigate from dashboard to requests list', async ({ page }) => {
    await page.click('text=View All Requests')
    await expect(page).toHaveURL('/requests')
    await expect(page.locator('h1')).toContainText('Flight Requests')
  })

  test('should navigate to new request page', async ({ page }) => {
    await page.click('text=New Request')
    await expect(page).toHaveURL('/requests/new')
    await expect(page.locator('h1')).toContainText('Create New Request')
  })

  test('should navigate to request detail', async ({ page }) => {
    await page.goto('/requests')
    await page.click('table tbody tr:first-child')
    await expect(page).toHaveURL(/\/requests\/req-/)
    await expect(page.locator('h1')).toContainText('Request Details')
  })

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    // Open mobile menu
    await page.click('[aria-label="Toggle menu"]')
    await expect(page.locator('nav')).toBeVisible()

    // Navigate
    await page.click('text=Requests')
    await expect(page).toHaveURL('/requests')
  })
})
```

**Run Tests** (they should FAIL initially):
```bash
npm test
# Expected: Tests fail because pages don't exist yet
```

### Step 2: Implement Pages (Green Phase)

**Implementation Checklist**:
- [ ] Create dashboard layout component
- [ ] Implement main dashboard page
- [ ] Implement requests list page
- [ ] Implement new request page
- [ ] Implement request detail page
- [ ] Add responsive styles
- [ ] Make tests pass

**Dashboard Layout**:
```typescript
// app/(dashboard)/layout.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**Main Dashboard Page**:
```typescript
// app/(dashboard)/page.tsx
import { Suspense } from 'react'
import DashboardStats from '@/components/dashboard/DashboardStats'
import RecentRequests from '@/components/dashboard/RecentRequests'
import QuickActions from '@/components/dashboard/QuickActions'
import StatusChart from '@/components/dashboard/StatusChart'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <QuickActions />
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <DashboardStats />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<LoadingSpinner />}>
          <RecentRequests />
        </Suspense>

        <Suspense fallback={<LoadingSpinner />}>
          <StatusChart />
        </Suspense>
      </div>
    </div>
  )
}
```

**Requests List Page**:
```typescript
// app/(dashboard)/requests/page.tsx
'use client'

import { useState } from 'react'
import { useRequests } from '@/lib/api-client'
import RequestsTable from '@/components/requests/RequestsTable'
import RequestsFilters from '@/components/requests/RequestsFilters'
import Pagination from '@/components/ui/Pagination'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function RequestsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string | undefined>()
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, error } = useRequests({
    page,
    limit: 20,
    status,
    sort,
    order
  })

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Flight Requests</h1>
        <Link href="/requests/new">
          <Button>New Request</Button>
        </Link>
      </div>

      <RequestsFilters
        status={status}
        onStatusChange={setStatus}
        sort={sort}
        onSortChange={setSort}
        order={order}
        onOrderChange={setOrder}
      />

      <RequestsTable
        requests={data.requests}
        sort={sort}
        order={order}
        onSort={(field) => {
          if (field === sort) {
            setOrder(order === 'asc' ? 'desc' : 'asc')
          } else {
            setSort(field)
            setOrder('desc')
          }
        }}
      />

      <Pagination
        currentPage={data.pagination.page}
        totalPages={data.pagination.total_pages}
        onPageChange={setPage}
      />
    </div>
  )
}
```

**New Request Page**:
```typescript
// app/(dashboard)/requests/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createRequest } from '@/lib/api-client'
import AirportAutocomplete from '@/components/requests/AirportAutocomplete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const requestSchema = z.object({
  departure_airport: z.string().min(3, 'Departure airport is required'),
  arrival_airport: z.string().min(3, 'Arrival airport is required'),
  passengers: z.coerce.number().min(1).max(20, 'Passengers must be between 1 and 20'),
  departure_date: z.string().min(1, 'Departure date is required'),
  special_requirements: z.string().optional()
})

type RequestFormData = z.infer<typeof requestSchema>

export default function NewRequestPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema)
  })

  const onSubmit = async (data: RequestFormData) => {
    setIsSubmitting(true)
    try {
      const request = await createRequest(data)
      router.push(`/requests/${request.id}`)
    } catch (error) {
      console.error('Failed to create request:', error)
      // Show error toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Request</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="departure_airport">Departure Airport</Label>
          <AirportAutocomplete
            value=""
            onChange={(value) => setValue('departure_airport', value)}
            placeholder="Enter airport code or city"
          />
          {errors.departure_airport && (
            <p className="text-red-600 text-sm mt-1">{errors.departure_airport.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="arrival_airport">Arrival Airport</Label>
          <AirportAutocomplete
            value=""
            onChange={(value) => setValue('arrival_airport', value)}
            placeholder="Enter airport code or city"
          />
          {errors.arrival_airport && (
            <p className="text-red-600 text-sm mt-1">{errors.arrival_airport.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="passengers">Passengers</Label>
          <Input
            id="passengers"
            type="number"
            min="1"
            max="20"
            {...register('passengers')}
          />
          {errors.passengers && (
            <p className="text-red-600 text-sm mt-1">{errors.passengers.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="departure_date">Departure Date</Label>
          <Input
            id="departure_date"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            {...register('departure_date')}
          />
          {errors.departure_date && (
            <p className="text-red-600 text-sm mt-1">{errors.departure_date.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="special_requirements">Special Requirements</Label>
          <Textarea
            id="special_requirements"
            rows={4}
            placeholder="Any special requests, catering preferences, etc."
            {...register('special_requirements')}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Request'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
```

**Request Detail Page**:
```typescript
// app/(dashboard)/requests/[id]/page.tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import RequestHeader from '@/components/requests/RequestHeader'
import RequestInfo from '@/components/requests/RequestInfo'
import WorkflowStatus from '@/components/requests/WorkflowStatus'
import ClientProfile from '@/components/requests/ClientProfile'
import QuotesList from '@/components/requests/QuotesList'
import ProposalsList from '@/components/requests/ProposalsList'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

async function getRequest(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/requests/${id}`, {
    cache: 'no-store'
  })

  if (!res.ok) {
    if (res.status === 404) notFound()
    throw new Error('Failed to fetch request')
  }

  return res.json()
}

export default async function RequestDetailPage({
  params
}: {
  params: { id: string }
}) {
  const request = await getRequest(params.id)

  return (
    <div className="space-y-6">
      <RequestHeader request={request} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RequestInfo request={request} />

          <WorkflowStatus
            status={request.status}
            currentStep={request.current_step}
            totalSteps={request.total_steps}
          />

          <Suspense fallback={<LoadingSpinner />}>
            <QuotesList requestId={request.id} />
          </Suspense>

          <Suspense fallback={<LoadingSpinner />}>
            <ProposalsList requestId={request.id} />
          </Suspense>
        </div>

        <div className="space-y-6">
          {request.client_id && (
            <Suspense fallback={<LoadingSpinner />}>
              <ClientProfile clientId={request.client_id} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Run Tests Again**:
```bash
npm test
# Expected: Tests now pass ✓
```

### Step 3: Refactor (Blue Phase)

**Refactoring Checklist**:
- [ ] Extract reusable components
- [ ] Optimize re-renders with React.memo
- [ ] Add proper TypeScript types
- [ ] Improve accessibility (ARIA labels)
- [ ] Add loading skeletons
- [ ] Ensure responsive design

**Run Tests After Refactoring**:
```bash
npm test
# Expected: All tests still pass ✓
```

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] Review PRD.md section on UI/UX Requirements
- [ ] Review IMPLEMENTATION_PLAN.md for dashboard specifications
- [ ] TASK-001 (Clerk Authentication) completed
- [ ] TASK-018 (API Routes) completed
- [ ] Ensure Tailwind CSS and shadcn/ui configured

### Step-by-Step Implementation

**Step 1**: Create dashboard layout structure
```bash
mkdir -p app/\(dashboard\)
touch app/\(dashboard\)/layout.tsx
```

**Step 2**: Create shared dashboard components
```bash
mkdir -p components/dashboard
touch components/dashboard/DashboardHeader.tsx
touch components/dashboard/DashboardSidebar.tsx
touch components/dashboard/DashboardStats.tsx
touch components/dashboard/RecentRequests.tsx
```

**Step 3**: Implement main dashboard page
```bash
touch app/\(dashboard\)/page.tsx
```

**Step 4**: Create requests pages
```bash
mkdir -p app/\(dashboard\)/requests
touch app/\(dashboard\)/requests/page.tsx
touch app/\(dashboard\)/requests/new/page.tsx
touch app/\(dashboard\)/requests/\[id\]/page.tsx
```

**Step 5**: Create request components
```bash
mkdir -p components/requests
touch components/requests/RequestsTable.tsx
touch components/requests/RequestsFilters.tsx
touch components/requests/RequestHeader.tsx
touch components/requests/RequestInfo.tsx
touch components/requests/WorkflowStatus.tsx
touch components/requests/QuotesList.tsx
touch components/requests/ProposalsList.tsx
```

**Step 6**: Add responsive styling
- Mobile: Stack layout, hamburger menu
- Tablet: Partial sidebar
- Desktop: Full sidebar, multi-column layout

**Step 7**: Add loading and error states
- Loading skeletons
- Error boundaries
- Empty states

**Step 8**: Write comprehensive tests
- Component tests
- Page tests
- E2E tests

### Implementation Validation

After each step:
- [ ] Code compiles without errors (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Types are correct (no TypeScript errors)

---

## 5. GIT WORKFLOW

### Branch Creation

```bash
git checkout main
git pull origin main
git checkout -b feature/dashboard-pages-implementation
```

### Commit Guidelines

```bash
# Commit after layout
git add app/\(dashboard\)/layout.tsx components/dashboard/
git commit -m "feat(dashboard): implement dashboard layout with header and sidebar"

# Commit after main dashboard
git add app/\(dashboard\)/page.tsx components/dashboard/DashboardStats.tsx
git commit -m "feat(dashboard): implement main dashboard page with statistics"

# Commit after requests list
git add app/\(dashboard\)/requests/page.tsx components/requests/RequestsTable.tsx
git commit -m "feat(requests): implement requests list page with filters and pagination"

# Commit after new request page
git add app/\(dashboard\)/requests/new/page.tsx
git commit -m "feat(requests): implement new request creation form"

# Commit after request detail
git add app/\(dashboard\)/requests/\[id\]/page.tsx components/requests/
git commit -m "feat(requests): implement request detail page with workflow status"

# Commit tests
git add __tests__/
git commit -m "test(dashboard): add comprehensive tests for dashboard pages"

# Push
git push origin feature/dashboard-pages-implementation
```

### Pull Request Process

```bash
gh pr create --title "Feature: Dashboard Pages Implementation" \
  --body "Implements all dashboard pages including layout, main dashboard, requests list, new request form, and request detail page. Includes comprehensive tests with >70% coverage. Closes TASK-020"
```

---

## 6. CODE REVIEW CHECKLIST

### Reviewer Checklist

**Functionality**:
- [ ] All pages render correctly
- [ ] Navigation works between pages
- [ ] Forms validate and submit
- [ ] Data fetching and display works
- [ ] Real-time updates function

**Code Quality**:
- [ ] Components are properly structured
- [ ] No prop drilling (use context if needed)
- [ ] Proper TypeScript types
- [ ] Consistent naming conventions
- [ ] Reusable components extracted

**Testing**:
- [ ] Component tests cover all interactions
- [ ] Page tests verify rendering
- [ ] E2E tests cover user flows
- [ ] Test coverage >70%
- [ ] All tests pass

**Accessibility**:
- [ ] Semantic HTML used
- [ ] ARIA labels present
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader compatible

**Responsive Design**:
- [ ] Works on mobile (320px+)
- [ ] Works on tablet (768px+)
- [ ] Works on desktop (1024px+)
- [ ] Touch targets appropriate size
- [ ] Text readable on all sizes

**Performance**:
- [ ] No unnecessary re-renders
- [ ] Images optimized
- [ ] Code splitting implemented
- [ ] Loading states present

---

## 7. TESTING REQUIREMENTS

### Unit Tests

**Coverage Target**: 70%+ for UI components

**Component Tests**:
```typescript
// __tests__/components/dashboard/DashboardStats.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DashboardStats from '@/components/dashboard/DashboardStats'

describe('DashboardStats', () => {
  const mockStats = {
    total: 45,
    pending: 12,
    completed: 30,
    failed: 3
  }

  it('should display total requests', () => {
    render(<DashboardStats stats={mockStats} />)
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('Total Requests')).toBeInTheDocument()
  })

  it('should display pending requests', () => {
    render(<DashboardStats stats={mockStats} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('should apply correct styling to failed count', () => {
    render(<DashboardStats stats={mockStats} />)
    const failedStat = screen.getByText('3').closest('div')
    expect(failedStat).toHaveClass('text-red-600')
  })
})
```

### Integration Tests

```typescript
// __tests__/integration/dashboard-flow.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DashboardPage from '@/app/(dashboard)/page'

describe('Dashboard Flow', () => {
  it('should load and display dashboard data', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/Total Requests/i)).toBeInTheDocument()
      expect(screen.getByText(/Recent Requests/i)).toBeInTheDocument()
    })
  })
})
```

### E2E Tests

```typescript
// __tests__/e2e/create-request.spec.ts
import { test, expect } from '@playwright/test'

test('complete request creation flow', async ({ page }) => {
  await page.goto('/requests/new')

  await page.fill('[name="departure_airport"]', 'TEB')
  await page.click('text=TEB - Teterboro Airport')

  await page.fill('[name="arrival_airport"]', 'VNY')
  await page.click('text=VNY - Van Nuys Airport')

  await page.fill('[name="passengers"]', '4')
  await page.fill('[name="departure_date"]', '2025-11-15')

  await page.click('button:has-text("Create Request")')

  await expect(page).toHaveURL(/\/requests\/req-/)
  await expect(page.locator('h1')).toContainText('Request Details')
})
```

### Running Tests

```bash
# Run all tests
npm test

# Run component tests
npm test -- components/dashboard

# Run E2E tests
npx playwright test

# Coverage report
npm run test:coverage
```

---

## 8. DEFINITION OF DONE

This task is considered **DONE** when:

### Code Complete
- [ ] Dashboard layout implemented
- [ ] Main dashboard page functional
- [ ] Requests list page with filters and pagination
- [ ] New request form with validation
- [ ] Request detail page with all sections
- [ ] All pages responsive (mobile, tablet, desktop)
- [ ] Code compiles without errors
- [ ] No TypeScript errors

### Testing Complete
- [ ] Component tests written and passing
- [ ] Page tests written and passing
- [ ] E2E tests for critical flows
- [ ] Test coverage >70%
- [ ] Manual testing on multiple devices

### Documentation Complete
- [ ] Component props documented
- [ ] Page functionality documented
- [ ] README updated with page structure

### Code Review Complete
- [ ] Pull request created
- [ ] At least 1 approval received
- [ ] All review comments addressed

### Deployment Ready
- [ ] Merged to main branch
- [ ] CI/CD pipeline passes
- [ ] Deployed to preview environment
- [ ] Smoke testing passed

---

## 9. RESOURCES & REFERENCES

### Documentation
- [PRD - UI/UX Requirements](../../../docs/PRD.md#7-design-considerations)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright](https://playwright.dev/)

### Related Tasks
- TASK-001: Clerk Authentication Integration (dependency)
- TASK-018: Complete API Routes Layer (dependency)
- TASK-021: API Client & Data Fetching Layer (works with)
- TASK-023: Chat Interface Backend Integration (related)

### Design References
- Dashboard layout: Modern SaaS dashboard pattern
- Forms: Shadcn form components
- Tables: Tanstack Table (if needed)

---

## 10. NOTES & QUESTIONS

### Implementation Notes
- Use Next.js App Router for all pages
- Implement loading.tsx and error.tsx for better UX
- Use Suspense boundaries for async components
- Ensure proper SEO with metadata

### Open Questions
- [ ] Should we implement data table sorting on client or server?
- [ ] Do we need infinite scroll or is pagination sufficient?
- [ ] Should request status colors be configurable by user?

### Assumptions
- Users are authenticated (protected routes)
- API endpoints return data in expected format
- Real-time updates handled by separate task (TASK-022)

### Risks/Blockers
- None identified

---

## 11. COMPLETION SUMMARY

### What Was Accomplished
[Fill out after task completion]

### Changes Made
[List all files created/modified]

### Test Results
```
[Test output will go here]
```

### Known Issues/Future Work
- None

### Time Tracking
- **Estimated**: 12 hours
- **Actual**: - hours
- **Variance**: - hours

### Lessons Learned
[Add after completion]

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
**Reviewed By**: -
**Review Date**: -
