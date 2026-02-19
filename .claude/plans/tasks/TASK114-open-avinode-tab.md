# Task ID: TASK114
# Task Name: Open Avinode in New Tab
# Parent User Story: [[US057-open-avinode-via-deep-link|US057 - Open Avinode trip via deep link]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Implement the click handler that opens the Avinode deep link URL in a new browser tab. Uses window.open with the Avinode URL, ensuring the link opens correctly and the current session context is preserved.

## Acceptance Criteria
- Clicking the deep link button calls window.open with the Avinode URL
- Opens in a new tab (target="_blank" equivalent)
- Includes security attributes (noopener, noreferrer)
- Handles the case where popup is blocked (shows fallback link)
- Logs the deep link click event for analytics
- Does not navigate away from the current page
- Works across supported browsers (Chrome, Safari, Firefox)

## Implementation Details
- **File(s)**: components/avinode/avinode-deep-links.tsx
- **Approach**: Add an onClick handler to the deep link button that calls window.open(deepLinkUrl, '_blank', 'noopener,noreferrer'). Check if the returned window reference is null (popup blocked) and show a fallback clickable link if so. Log the click event for analytics tracking.

## Dependencies
- [[TASK113-render-deep-link-button|TASK113]] (Render deep link button) - button component
- Valid Avinode deep link URL from create_trip response
