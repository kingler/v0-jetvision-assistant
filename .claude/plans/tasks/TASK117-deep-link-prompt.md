# Task ID: TASK117
# Task Name: Deep Link Instructional Prompt
# Parent User Story: [[US059-view-deep-link-prompt|US059 - Guide user to open Avinode deep link]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Create a prompt component that explains to the sales representative what the next step is after a trip has been created. The prompt provides clear instructions to open Avinode via the deep link, review available operators, select preferred aircraft, and send the RFP. This bridges the automated workflow with the manual Avinode interaction.

## Acceptance Criteria
- Displays a clear, instructional message explaining the next step
- Includes numbered steps: 1) Open Avinode, 2) Review operators, 3) Select aircraft, 4) Send RFP
- Appears in the chat after trip creation
- Visually distinct from regular chat messages (info/instructional styling)
- Includes the deep link button (TASK113) within the prompt
- Shows estimated time for the Avinode interaction
- Mentions that the system will automatically detect when quotes arrive

## Implementation Details
- **File(s)**: components/avinode/deep-link-prompt.tsx
- **Approach**: Create a React component that renders as an instructional card within the chat. Use an info-themed card style (blue accent/border). Structure with a header ("Next Step: Review in Avinode"), numbered instruction list, embedded deep link button, and a footer note about automatic quote detection. Use the design system's typography and color tokens.

## Dependencies
- [[TASK113-render-deep-link-button|TASK113]] (Deep link button) - embedded within this prompt
- Trip creation must have completed successfully
- Chat interface must support rendering custom components
