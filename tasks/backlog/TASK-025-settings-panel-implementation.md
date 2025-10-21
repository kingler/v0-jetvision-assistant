# Settings Panel Implementation

**Task ID**: TASK-025
**Created**: 2025-10-20
**Assigned To**: Frontend Developer
**Status**: `pending`
**Priority**: `normal`
**Estimated Time**: 6 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement user settings panel with profile settings page, notification preferences, API key management (if applicable), markup configuration, and theme preferences for the JetVision AI Assistant.

### User Story
**As an** ISO agent
**I want** to customize my application settings and preferences
**So that** I can personalize the system to match my workflow and business requirements

### Business Value
Settings empower users to customize the application to their specific needs, improving satisfaction and productivity. Markup configuration is critical for business operations, allowing ISO agents to control their profit margins on proposals.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement user profile settings
- Display user name and email (from Clerk)
- Edit profile information
- Upload profile photo
- Change password (via Clerk)
- Logout functionality

**FR-2**: System SHALL implement notification preferences
- Toggle email notifications
- Toggle browser notifications
- Configure notification types (quotes, proposals, errors)
- Set quiet hours for notifications

**FR-3**: System SHALL implement markup configuration
- Choose markup type (fixed amount or percentage)
- Set default markup value
- Preview markup calculation
- Save and apply to new proposals

**FR-4**: System SHALL implement theme preferences
- Toggle light/dark mode
- Persist theme choice in localStorage
- Apply theme across all pages
- Support system theme detection

**FR-5**: System SHALL implement API key management (optional)
- Display API keys (masked)
- Generate new API keys
- Revoke API keys
- Copy to clipboard

**FR-6**: System SHALL validate and save settings
- Validate input before saving
- Show success/error messages
- Persist to database
- Sync across sessions

### Acceptance Criteria

- [ ] **AC-1**: Settings page renders with all sections
- [ ] **AC-2**: User can update profile information
- [ ] **AC-3**: Notification preferences save correctly
- [ ] **AC-4**: Markup configuration updates proposals
- [ ] **AC-5**: Theme toggle works and persists
- [ ] **AC-6**: Settings form validates input
- [ ] **AC-7**: Success/error messages display
- [ ] **AC-8**: Settings persist across sessions
- [ ] **AC-9**: Responsive design on all devices
- [ ] **AC-10**: Unit tests achieve >70% coverage
- [ ] **AC-11**: Integration tests verify settings flow
- [ ] **AC-12**: Code review approved

### Non-Functional Requirements

- **Performance**: Settings load <1 second
- **Security**: Sensitive data encrypted
- **Usability**: Clear labels, helpful tooltips
- **Accessibility**: WCAG 2.1 AA compliant

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files**:
```
__tests__/pages/settings/SettingsPage.test.tsx
__tests__/components/settings/ProfileSettings.test.tsx
__tests__/components/settings/NotificationSettings.test.tsx
__tests__/components/settings/MarkupSettings.test.tsx
__tests__/components/settings/ThemeSettings.test.tsx
```

**Example Tests**:
```typescript
// __tests__/pages/settings/SettingsPage.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SettingsPage from '@/app/(dashboard)/settings/page'

describe('SettingsPage', () => {
  it('should render all settings sections', () => {
    render(<SettingsPage />)

    expect(screen.getByText('Profile Settings')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('Markup Configuration')).toBeInTheDocument()
    expect(screen.getByText('Theme')).toBeInTheDocument()
  })

  it('should display user information', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    })
  })
})

// __tests__/components/settings/MarkupSettings.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import MarkupSettings from '@/components/settings/MarkupSettings'

describe('MarkupSettings', () => {
  it('should display markup type options', () => {
    render(<MarkupSettings />)

    expect(screen.getByLabelText('Fixed Amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Percentage')).toBeInTheDocument()
  })

  it('should switch between markup types', async () => {
    const user = userEvent.setup()
    render(<MarkupSettings />)

    const percentageRadio = screen.getByLabelText('Percentage')
    await user.click(percentageRadio)

    expect(screen.getByLabelText('Markup Percentage')).toBeInTheDocument()
  })

  it('should show markup preview', async () => {
    const user = userEvent.setup()
    render(<MarkupSettings />)

    // Select percentage
    await user.click(screen.getByLabelText('Percentage'))

    // Enter value
    const input = screen.getByLabelText('Markup Percentage')
    await user.type(input, '15')

    // Check preview
    await waitFor(() => {
      expect(screen.getByText(/base.*15000/i)).toBeInTheDocument()
      expect(screen.getByText(/markup.*2250/i)).toBeInTheDocument()
      expect(screen.getByText(/total.*17250/i)).toBeInTheDocument()
    })
  })

  it('should save markup configuration', async () => {
    const user = userEvent.setup()
    const mockSave = vi.fn().mockResolvedValue({ success: true })

    render(<MarkupSettings onSave={mockSave} />)

    await user.click(screen.getByLabelText('Percentage'))
    await user.type(screen.getByLabelText('Markup Percentage'), '15')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        markup_type: 'percentage',
        markup_value: 15
      })
    })
  })

  it('should validate markup value', async () => {
    const user = userEvent.setup()
    render(<MarkupSettings />)

    await user.click(screen.getByLabelText('Percentage'))

    const input = screen.getByLabelText('Markup Percentage')
    await user.type(input, '150')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText(/percentage must be between 0 and 100/i)).toBeInTheDocument()
    })
  })
})

// __tests__/components/settings/ThemeSettings.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import ThemeSettings from '@/components/settings/ThemeSettings'

describe('ThemeSettings', () => {
  it('should toggle theme', async () => {
    const user = userEvent.setup()
    render(<ThemeSettings />)

    const toggle = screen.getByRole('switch', { name: /dark mode/i })

    await user.click(toggle)

    expect(document.documentElement).toHaveClass('dark')

    await user.click(toggle)

    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('should persist theme to localStorage', async () => {
    const user = userEvent.setup()
    render(<ThemeSettings />)

    const toggle = screen.getByRole('switch', { name: /dark mode/i })
    await user.click(toggle)

    expect(localStorage.getItem('theme')).toBe('dark')
  })
})

// __tests__/components/settings/NotificationSettings.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import NotificationSettings from '@/components/settings/NotificationSettings'

describe('NotificationSettings', () => {
  it('should render notification toggles', () => {
    render(<NotificationSettings />)

    expect(screen.getByLabelText('Email Notifications')).toBeInTheDocument()
    expect(screen.getByLabelText('Browser Notifications')).toBeInTheDocument()
    expect(screen.getByLabelText('Quote Alerts')).toBeInTheDocument()
  })

  it('should save notification preferences', async () => {
    const user = userEvent.setup()
    const mockSave = vi.fn().mockResolvedValue({ success: true })

    render(<NotificationSettings onSave={mockSave} />)

    await user.click(screen.getByLabelText('Email Notifications'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        email_notifications: true,
        browser_notifications: expect.any(Boolean),
        quote_alerts: expect.any(Boolean)
      })
    })
  })

  it('should request browser notification permission', async () => {
    const user = userEvent.setup()
    const mockRequestPermission = vi.fn().mockResolvedValue('granted')
    global.Notification = { requestPermission: mockRequestPermission } as any

    render(<NotificationSettings />)

    await user.click(screen.getByLabelText('Browser Notifications'))

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalled()
    })
  })
})
```

### Step 2: Implement Settings (Green Phase)

**Settings Page**:
```typescript
// app/(dashboard)/settings/page.tsx
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProfileSettings from '@/components/settings/ProfileSettings'
import NotificationSettings from '@/components/settings/NotificationSettings'
import MarkupSettings from '@/components/settings/MarkupSettings'
import ThemeSettings from '@/components/settings/ThemeSettings'
import { User, Bell, DollarSign, Palette } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="markup">
            <DollarSign className="h-4 w-4 mr-2" />
            Markup
          </TabsTrigger>
          <TabsTrigger value="theme">
            <Palette className="h-4 w-4 mr-2" />
            Theme
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="markup" className="mt-6">
          <MarkupSettings />
        </TabsContent>

        <TabsContent value="theme" className="mt-6">
          <ThemeSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Markup Settings Component**:
```typescript
// components/settings/MarkupSettings.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

const markupSchema = z.object({
  markup_type: z.enum(['fixed', 'percentage']),
  markup_value: z.coerce.number().min(0)
}).refine(data => {
  if (data.markup_type === 'percentage') {
    return data.markup_value <= 100
  }
  return true
}, {
  message: 'Percentage must be between 0 and 100',
  path: ['markup_value']
})

type MarkupFormData = z.infer<typeof markupSchema>

export default function MarkupSettings() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<MarkupFormData>({
    resolver: zodResolver(markupSchema),
    defaultValues: {
      markup_type: 'percentage',
      markup_value: 15
    }
  })

  const markupType = watch('markup_type')
  const markupValue = watch('markup_value')

  // Calculate preview
  const basePrice = 15000
  const markup = markupType === 'percentage'
    ? basePrice * (markupValue / 100)
    : markupValue
  const total = basePrice + markup

  const onSubmit = async (data: MarkupFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/settings/markup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Failed to save')

      toast({
        title: 'Settings Saved',
        description: 'Your markup configuration has been updated.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Markup Configuration</CardTitle>
        <CardDescription>
          Set your default markup for proposals
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label>Markup Type</Label>
            <RadioGroup
              value={markupType}
              onValueChange={(value) => register('markup_type').onChange({ target: { value } })}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed">Fixed Amount ($)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage">Percentage (%)</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="markup_value">
              {markupType === 'percentage' ? 'Markup Percentage' : 'Markup Amount'}
            </Label>
            <Input
              id="markup_value"
              type="number"
              min="0"
              max={markupType === 'percentage' ? 100 : undefined}
              {...register('markup_value')}
            />
            {errors.markup_value && (
              <p className="text-red-600 text-sm mt-1">{errors.markup_value.message}</p>
            )}
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Preview</h4>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Base Price:</span>
              <span className="font-medium">${basePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Markup ({markupType === 'percentage' ? `${markupValue}%` : '$' + markupValue}):</span>
              <span className="font-medium text-green-600">+${markup.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-900">Total Price:</span>
              <span className="font-bold text-gray-900">${total.toLocaleString()}</span>
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Theme Settings Component**:
```typescript
// components/settings/ThemeSettings.tsx
'use client'

import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Moon, Sun } from 'lucide-react'

export default function ThemeSettings() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check localStorage and system preference
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    const shouldBeDark = stored === 'dark' || (!stored && prefersDark)
    setIsDark(shouldBeDark)

    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = (checked: boolean) => {
    setIsDark(checked)

    if (checked) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Preferences</CardTitle>
        <CardDescription>
          Customize the appearance of the application
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDark ? (
              <Moon className="h-5 w-5 text-gray-600" />
            ) : (
              <Sun className="h-5 w-5 text-gray-600" />
            )}
            <div>
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <p className="text-sm text-gray-500">
                {isDark ? 'Dark theme enabled' : 'Light theme enabled'}
              </p>
            </div>
          </div>
          <Switch
            id="dark-mode"
            checked={isDark}
            onCheckedChange={toggleTheme}
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

**Notification Settings Component**:
```typescript
// components/settings/NotificationSettings.tsx
'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    browser_notifications: false,
    quote_alerts: true,
    proposal_alerts: true,
    error_alerts: true
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }))

    // Request browser permission if enabling browser notifications
    if (key === 'browser_notifications' && !preferences.browser_notifications) {
      if ('Notification' in window) {
        Notification.requestPermission()
      }
    }
  }

  const handleSave = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      })

      if (!response.ok) throw new Error('Failed to save')

      toast({
        title: 'Settings Saved',
        description: 'Your notification preferences have been updated.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to be notified
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email">Email Notifications</Label>
            <Switch
              id="email"
              checked={preferences.email_notifications}
              onCheckedChange={() => handleToggle('email_notifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="browser">Browser Notifications</Label>
            <Switch
              id="browser"
              checked={preferences.browser_notifications}
              onCheckedChange={() => handleToggle('browser_notifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="quotes">Quote Alerts</Label>
            <Switch
              id="quotes"
              checked={preferences.quote_alerts}
              onCheckedChange={() => handleToggle('quote_alerts')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="proposals">Proposal Alerts</Label>
            <Switch
              id="proposals"
              checked={preferences.proposal_alerts}
              onCheckedChange={() => handleToggle('proposal_alerts')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="errors">Error Alerts</Label>
            <Switch
              id="errors"
              checked={preferences.error_alerts}
              onCheckedChange={() => handleToggle('error_alerts')}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  )
}
```

---

## 4-11. STANDARD SECTIONS

[Following template structure]

**Dependencies**:
- TASK-001: Clerk Authentication Integration
- TASK-021: API Client & Data Fetching Layer

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
