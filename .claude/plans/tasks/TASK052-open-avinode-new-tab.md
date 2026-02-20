# Task ID: TASK052
# Task Name: Deep link opens Avinode Web UI in new browser tab
# Parent User Story: [[US022-open-avinode-marketplace|US022 - Open Avinode from deep link]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Ensure the "Open in Avinode" deep link button opens the Avinode Web UI in a new browser tab, allowing the sales representative to work in Avinode without losing context in the Jetvision assistant.

## Acceptance Criteria
- Clicking the button opens the deep link URL in a new browser tab
- Uses `target="_blank"` with `rel="noopener noreferrer"` for security
- Original Jetvision tab remains open and functional
- Works across Chrome, Firefox, Safari, and Edge browsers
- Popup blockers do not prevent the tab from opening (uses `<a>` tag, not `window.open`)
- Button click is tracked for analytics (optional)

## Implementation Details
- **File(s)**: `components/avinode/avinode-deep-links.tsx`
- **Approach**: Implement the deep link as a standard anchor (`<a>`) element styled as a button, using `target="_blank"` and `rel="noopener noreferrer"`. This approach is more reliable than `window.open()` across browsers and avoids popup blocker issues. The component wraps the anchor in the design system's button styling.

## Dependencies
- [[TASK050-display-deep-link-button|TASK050]] (display-deep-link-button) - Button component must exist
