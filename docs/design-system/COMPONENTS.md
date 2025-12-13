# Jetvision Group Design System - Component Library

**Version:** 1.0.0
**Last Updated:** December 2025

Comprehensive documentation for all UI components in the Jetvision design system, following Atomic Design methodology.

---

## Table of Contents

1. [Atoms](#atoms) - Basic building blocks
2. [Molecules](#molecules) - Simple component combinations
3. [Organisms](#organisms) - Complex UI sections
4. [Templates](#templates) - Page layouts
5. [Component Guidelines](#component-guidelines)

---

## Atoms

Atoms are the basic building blocks of the interface. They cannot be broken down further without losing their meaning.

### Button

Primary interactive element for user actions.

**Variants:**

```tsx
import { Button } from '@/components/ui/button'

// Default (primary)
<Button variant="default">Book Flight</Button>

// Secondary
<Button variant="secondary">View Details</Button>

// Outline
<Button variant="outline">Cancel</Button>

// Ghost (minimal)
<Button variant="ghost">Skip</Button>

// Destructive (dangerous actions)
<Button variant="destructive">Delete Booking</Button>

// Link style
<Button variant="link">Learn More</Button>
```

**Sizes:**

```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><PlaneTakeoff /></Button>
```

**States:**

```tsx
// Disabled
<Button disabled>Unavailable</Button>

// Loading
<Button disabled>
  <Loader2 className="animate-spin" />
  Processing...
</Button>

// With icon
<Button>
  <Send className="mr-2" />
  Send Proposal
</Button>
```

**Specifications:**

| Size | Height | Padding X | Font Size | Use Case |
|------|--------|-----------|-----------|----------|
| sm | 32px | 12px | 14px | Compact spaces, secondary actions |
| default | 36px | 16px | 16px | Standard buttons |
| lg | 40px | 24px | 18px | Primary CTAs, hero sections |
| icon | 36x36px | - | - | Icon-only actions |

**Accessibility:**
- Minimum touch target: 36x36px (exceeds 24px AA standard)
- Focus ring: 3px solid outline
- Semantic `<button>` element
- Disabled state communicated visually and via `aria-disabled`

**Do:**
- Use "default" variant for primary actions
- Include descriptive text (not just icons)
- One primary button per section
- Use size="lg" for main CTAs

**Don't:**
- Use more than one "default" button in close proximity
- Create buttons smaller than 32px height
- Use red/destructive for non-dangerous actions
- Stack multiple icon-only buttons without labels

---

### Input

Text input field for user data entry.

**Basic Usage:**

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

<div>
  <Label htmlFor="email">Email Address</Label>
  <Input
    id="email"
    type="email"
    placeholder="your@email.com"
    aria-required="true"
  />
</div>
```

**Types:**

```tsx
<Input type="text" placeholder="Full Name" />
<Input type="email" placeholder="Email" />
<Input type="password" placeholder="Password" />
<Input type="number" placeholder="Passengers" />
<Input type="tel" placeholder="Phone" />
<Input type="date" />
<Input type="time" />
```

**States:**

```tsx
// Disabled
<Input disabled placeholder="Unavailable" />

// Read-only
<Input readOnly value="Confirmed" />

// Error state
<Input
  aria-invalid="true"
  className="border-destructive"
/>

// With validation
<Input
  required
  pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
/>
```

**Specifications:**

| Size | Height | Padding X | Font Size |
|------|--------|-----------|-----------|
| sm | 32px | 12px | 14px |
| default | 36px | 12px | 16px |
| lg | 44px | 16px | 18px |

**Accessibility:**
- Always pair with `<Label>` using `htmlFor`
- Use `aria-invalid` for error states
- Include `aria-describedby` for helper text
- Placeholder text should not replace labels

**Do:**
- Always include visible labels
- Use appropriate input types
- Provide clear placeholder examples
- Show error messages below field

**Don't:**
- Use placeholder as label replacement
- Create inputs narrower than 120px
- Hide validation errors
- Use vague placeholder text

---

### Badge

Small status indicator or label.

**Variants:**

```tsx
import { Badge } from '@/components/ui/badge'

<Badge variant="default">New</Badge>
<Badge variant="secondary">In Progress</Badge>
<Badge variant="destructive">Cancelled</Badge>
<Badge variant="outline">Draft</Badge>
```

**With Icons:**

```tsx
<Badge>
  <CheckCircle className="w-3 h-3" />
  Confirmed
</Badge>

<Badge variant="destructive">
  <XCircle className="w-3 h-3" />
  Failed
</Badge>
```

**Specifications:**
- Height: Auto (padding 2px vertical, 8px horizontal)
- Font size: 12px
- Border radius: 6px
- Font weight: 500

**Do:**
- Use for status indicators
- Keep text concise (1-2 words)
- Use semantic variant colors
- Pair with icons when helpful

**Don't:**
- Use for clickable elements (use Button)
- Include long text (wrap in multiple badges)
- Override semantic colors

---

### Avatar

User profile image or placeholder.

**Basic Usage:**

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

<Avatar>
  <AvatarImage src="/user.jpg" alt="User Name" />
  <AvatarFallback>UN</AvatarFallback>
</Avatar>
```

**Sizes:**

```tsx
<Avatar className="w-8 h-8">...</Avatar>   {/* Small - 32px */}
<Avatar className="w-10 h-10">...</Avatar> {/* Default - 40px */}
<Avatar className="w-12 h-12">...</Avatar> {/* Large - 48px */}
<Avatar className="w-16 h-16">...</Avatar> {/* XL - 64px */}
```

**With Status Indicator:**

```tsx
<div className="relative">
  <Avatar>
    <AvatarImage src="/user.jpg" />
    <AvatarFallback>JD</AvatarFallback>
  </Avatar>
  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
</div>
```

**Specifications:**
- Default size: 40x40px
- Border radius: Full circle (9999px)
- Fallback: User initials, centered

**Accessibility:**
- Always include `alt` text for images
- Fallback shows initials if image fails
- Sufficient contrast for fallback text

---

### Label

Form field label.

**Usage:**

```tsx
import { Label } from '@/components/ui/label'

<Label htmlFor="input-id">Field Name</Label>
<Input id="input-id" />
```

**Required Field:**

```tsx
<Label>
  Email Address <span className="text-destructive">*</span>
</Label>
```

**Accessibility:**
- Always use `htmlFor` to associate with input
- Position above or beside input
- Sufficient contrast (WCAG AA)

---

## Molecules

Molecules are combinations of atoms that form simple, functional units.

### Form Field

Complete input with label, helper text, and error message.

**Usage:**

```tsx
<div className="space-y-2">
  <Label htmlFor="passengers">Number of Passengers</Label>
  <Input
    id="passengers"
    type="number"
    min="1"
    max="19"
    aria-describedby="passengers-help"
  />
  <p id="passengers-help" className="text-sm text-muted-foreground">
    Maximum 19 passengers per aircraft
  </p>
</div>
```

**With Error State:**

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email Address</Label>
  <Input
    id="email"
    type="email"
    aria-invalid="true"
    aria-describedby="email-error"
  />
  <p id="email-error" className="text-sm text-destructive">
    Please enter a valid email address
  </p>
</div>
```

**Specifications:**
- Gap between elements: 8px
- Error text color: `text-destructive`
- Helper text color: `text-muted-foreground`
- Font size: 14px

---

### Search Input

Input field with search icon.

**Usage:**

```tsx
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    type="search"
    placeholder="Search flights..."
    className="pl-10"
  />
</div>
```

**With Clear Button:**

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
  <Input
    type="search"
    placeholder="Search..."
    className="pl-10 pr-10"
  />
  <Button
    variant="ghost"
    size="icon"
    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
  >
    <X className="h-4 w-4" />
  </Button>
</div>
```

---

### Icon Button

Button with icon and tooltip.

**Usage:**

```tsx
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Settings } from 'lucide-react'

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Settings">
        <Settings className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Settings</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Accessibility:**
- Always include `aria-label` for icon-only buttons
- Tooltip provides additional context
- Minimum 36x36px touch target

---

### Card Header

Card title and description.

**Usage:**

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Flight Details</CardTitle>
    <CardDescription>
      Review your flight information below
    </CardDescription>
  </CardHeader>
</Card>
```

**With Action:**

```tsx
import { CardAction } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Booking Summary</CardTitle>
    <CardDescription>Order #12345</CardDescription>
    <CardAction>
      <Button variant="ghost" size="sm">Edit</Button>
    </CardAction>
  </CardHeader>
</Card>
```

---

### Badge with Icon

Status badge with leading icon.

**Usage:**

```tsx
<Badge variant="default">
  <CheckCircle className="w-3 h-3" />
  Confirmed
</Badge>

<Badge variant="secondary">
  <Clock className="w-3 h-3" />
  Pending
</Badge>

<Badge variant="destructive">
  <XCircle className="w-3 h-3" />
  Cancelled
</Badge>
```

**Animated Badge:**

```tsx
<Badge variant="secondary">
  <Loader2 className="w-3 h-3 animate-spin" />
  Processing
</Badge>
```

---

## Organisms

Organisms are complex UI components composed of molecules and atoms.

### Navigation Header

Main application navigation.

**Structure:**

```tsx
<header className="border-b bg-white dark:bg-gray-900">
  <div className="container mx-auto px-4 py-4">
    <div className="flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center space-x-2">
        <Plane className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">Jetvision</span>
      </div>

      {/* Navigation Links */}
      <nav className="hidden md:flex items-center space-x-6">
        <a href="/dashboard" className="text-sm font-medium hover:text-primary">
          Dashboard
        </a>
        <a href="/bookings" className="text-sm font-medium hover:text-primary">
          Bookings
        </a>
        <a href="/clients" className="text-sm font-medium hover:text-primary">
          Clients
        </a>
      </nav>

      {/* User Menu */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <Avatar>
          <AvatarImage src="/user.jpg" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      </div>
    </div>
  </div>
</header>
```

**Specifications:**
- Height: 64px
- Container max-width: 1280px
- Padding: 16px horizontal
- Border: 1px bottom, `border-border`

---

### Card with Content

Complete card component.

**Usage:**

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Flight Quote</CardTitle>
    <CardDescription>Citation X - NetJets</CardDescription>
  </CardHeader>

  <CardContent>
    <div className="space-y-4">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Price</span>
        <span className="font-semibold">$12,500</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Flight Time</span>
        <span className="font-semibold">2h 30m</span>
      </div>
    </div>
  </CardContent>

  <CardFooter>
    <Button className="w-full">Select Quote</Button>
  </CardFooter>
</Card>
```

**Specifications:**
- Border radius: 12px (xl)
- Padding: 24px
- Gap: 24px
- Shadow: `shadow-sm`
- Border: 1px solid `border`

---

### Quote Comparison Card

Aviation-specific quote display.

**Usage:**

```tsx
import { QuoteCard } from '@/components/aviation'

<QuoteCard
  operatorName="NetJets"
  aircraftType="Citation X"
  price={12500}
  currency="USD"
  score={92}
  ranking={1}
  totalQuotes={5}
  departureTime="10:30 AM"
  arrivalTime="1:00 PM"
  flightDuration="2h 30m"
  operatorRating={4.8}
  isRecommended={true}
  onSelect={() => handleSelect()}
/>
```

**Specifications:**
- Displays operator name, aircraft type
- Price prominently displayed (right-aligned, 2xl font)
- AI score with progress bar
- Ranking badge (e.g., "#1 of 5")
- Flight time details
- Operator rating (stars)
- "Recommended" badge for top choice
- Select button in footer

---

### Form Section

Multi-field form group.

**Usage:**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Passenger Information</CardTitle>
    <CardDescription>
      Enter details for all passengers
    </CardDescription>
  </CardHeader>

  <CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name</Label>
        <Input id="firstName" placeholder="John" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input id="lastName" placeholder="Doe" />
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="john@example.com" />
    </div>

    <div className="space-y-2">
      <Label htmlFor="phone">Phone</Label>
      <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" />
    </div>
  </CardContent>

  <CardFooter className="flex justify-between">
    <Button variant="outline">Cancel</Button>
    <Button>Save Information</Button>
  </CardFooter>
</Card>
```

---

### Data Table

Tabular data display.

**Usage:**

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Flight #</TableHead>
      <TableHead>Route</TableHead>
      <TableHead>Date</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Price</TableHead>
    </TableRow>
  </TableHeader>

  <TableBody>
    <TableRow>
      <TableCell className="font-medium">JV-001</TableCell>
      <TableCell>LAX → JFK</TableCell>
      <TableCell>Dec 15, 2025</TableCell>
      <TableCell>
        <Badge variant="default">Confirmed</Badge>
      </TableCell>
      <TableCell className="text-right">$12,500</TableCell>
    </TableRow>
    {/* More rows... */}
  </TableBody>
</Table>
```

**With Sorting:**

```tsx
<TableHead>
  <Button variant="ghost" className="h-8 p-0">
    Date
    <ArrowUpDown className="ml-2 h-4 w-4" />
  </Button>
</TableHead>
```

---

### Modal Dialog

Overlay for focused interactions.

**Usage:**

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger asChild>
    <Button>Confirm Booking</Button>
  </DialogTrigger>

  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Your Booking</DialogTitle>
      <DialogDescription>
        Review the details below before confirming your flight.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4 py-4">
      {/* Dialog content */}
    </div>

    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm Booking</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Specifications:**
- Max width: 500px
- Padding: 24px
- Border radius: 16px
- Shadow: `shadow-xl`
- Backdrop: Semi-transparent overlay
- Z-index: 1400

**Accessibility:**
- Focus trap (tab cycles within modal)
- Escape key closes modal
- Click outside closes modal
- ARIA attributes (`role="dialog"`, `aria-labelledby`)

---

## Templates

Templates are page-level structures combining organisms, molecules, and atoms.

### Dashboard Layout

**Structure:**

```tsx
<div className="min-h-screen bg-background">
  {/* Header */}
  <NavigationHeader />

  {/* Main Content */}
  <main className="container mx-auto px-4 py-8">
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your recent activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>...</Card>
        <Card>...</Card>
        <Card>...</Card>
      </div>

      {/* Main Content */}
      <Card>
        {/* Content */}
      </Card>
    </div>
  </main>
</div>
```

---

### Auth Layout

**Structure:**

```tsx
<div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
  <Card className="w-full max-w-md">
    <CardHeader className="text-center">
      <div className="flex justify-center mb-4">
        <Plane className="h-12 w-12 text-primary" />
      </div>
      <CardTitle>Welcome to Jetvision</CardTitle>
      <CardDescription>
        Sign in to access your account
      </CardDescription>
    </CardHeader>

    <CardContent>
      {/* Auth form */}
    </CardContent>
  </Card>
</div>
```

---

### Landing Page Layout

**Structure:**

```tsx
<div className="min-h-screen">
  {/* Hero Section */}
  <section className="bg-gradient-to-br from-primary to-secondary text-white py-20">
    <div className="container mx-auto px-4 text-center">
      <h1 className="text-5xl font-bold mb-4">
        Private Aviation Made Simple
      </h1>
      <p className="text-xl mb-8">
        Book luxury jets in minutes
      </p>
      <Button size="lg">Get Started</Button>
    </div>
  </section>

  {/* Features Section */}
  <section className="py-20">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Feature cards */}
      </div>
    </div>
  </section>
</div>
```

---

## Component Guidelines

### Design Principles

1. **Consistency** - Use established patterns across all components
2. **Accessibility** - WCAG AA minimum for all components
3. **Responsiveness** - Mobile-first, works on all screen sizes
4. **Performance** - Optimize for fast rendering
5. **Composability** - Components work together seamlessly

### Component Checklist

Before creating or modifying a component, ensure:

- [ ] Follows existing design tokens (colors, spacing, typography)
- [ ] Supports all necessary variants and states
- [ ] Fully accessible (keyboard, screen reader, focus states)
- [ ] Responsive across breakpoints
- [ ] Documented with examples
- [ ] Tested with dark mode
- [ ] Includes TypeScript types
- [ ] Uses semantic HTML

### State Management

All components should handle these states:

- **Default** - Normal state
- **Hover** - Mouse over (desktop)
- **Active** - Click/press state
- **Focus** - Keyboard focus (visible outline)
- **Disabled** - Non-interactive state
- **Loading** - Processing state (when applicable)
- **Error** - Invalid or failed state (forms)

### Responsive Behavior

Components should adapt across breakpoints:

- **Mobile (< 640px)** - Stacked, full-width layouts
- **Tablet (640px - 1024px)** - 2-column grids, compact spacing
- **Desktop (> 1024px)** - Multi-column, spacious layouts

### Dark Mode

All components must support dark mode via the `dark:` variant:

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  {/* Component content */}
</div>
```

Test all components in both light and dark modes before deployment.

---

## Resources

- [Style Guide](./STYLE_GUIDE.md)
- [Accessibility Guidelines](./ACCESSIBILITY.md)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)

---

**Maintained by:** Jetvision Group UX Team
**Questions?** Contact the design system team or open a discussion in the project repository.
