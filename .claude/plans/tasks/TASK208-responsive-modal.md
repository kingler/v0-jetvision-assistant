# Task ID: TASK208
# Task Name: Responsive Modal
# Parent User Story: [[US108-responsive-modal|US108 - Responsive Modal Component]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Create a ResponsiveModal component that renders as a Dialog on desktop and a Drawer (bottom sheet) on mobile. The component uses the useIsMobile hook to determine the appropriate presentation.

## Acceptance Criteria
- On desktop (>768px): Renders as a centered Dialog with overlay
- On mobile (<=768px): Renders as a bottom Drawer with drag-to-dismiss
- Both modes support: title, description, content, footer sections
- Smooth open/close animations using Framer Motion or CSS transitions
- Drawer supports drag handle and swipe-down to close
- Dialog supports click-outside and Escape key to close
- Accessible: proper ARIA roles, focus trapping, screen reader support
- Controlled and uncontrolled modes (open prop + onOpenChange callback)

## Implementation Details
- **File(s)**: components/ui/responsive-modal.tsx
- **Approach**: Create a wrapper component that conditionally renders Dialog (from Radix) or Drawer (from vaul) based on useIsMobile(). Share common props interface (open, onOpenChange, title, description, children). Use compound component pattern with ResponsiveModal.Trigger, ResponsiveModal.Content, ResponsiveModal.Header, ResponsiveModal.Footer.

## Dependencies
- [[TASK209-use-is-mobile-hook|TASK209]] (use-is-mobile-hook)
- @radix-ui/react-dialog for Dialog
- vaul for Drawer
- Framer Motion for animations (optional)
