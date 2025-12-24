# Avinode API Integration - Partner Update

**Date:** December 23, 2025
**From:** Jetvision Development Team
**To:** One Kaleidoscope Partners
**Subject:** Avinode Sandbox API Access Issue - Action Required

---

Dear Partners,

I wanted to update you on a blocking issue we've encountered with our Avinode API integration for the Jetvision application.

### Issue Summary

Following the weekly Avinode sandbox reset (which occurs every Monday between 6-8 AM UTC), we have lost access to the API and are unable to proceed with development. **This is an account/permissions issue on Avinode's side, not a code issue.**

### What Happened

In docs/communication/2025-12-23-avinode-issue-partner-update.md around lines 35 to 46, the phrase "for brevity" should be reworded to reflect audience appropriateness; change the sentence to say the detailed technical information is excluded "for clarity in this partner update" (or "to keep this partner update focused and clear for its audience"), while retaining a note that the full technical details remain available to Avinode Support in the referenced internal technical document.Following the weekly Avinode sandbox reset, we encountered an API access misconfiguration that is preventing authentication and API access. The issue appears to be related to account permissions and credential configuration on Avinode's side, rather than our integration code.

**Business Impact:**

- **Blocking Development Progress:** We cannot proceed with Avinode API integration development
- **Timeline Risk:** Delays in integration testing and feature completion
- **Resource Impact:** Development team time redirected to troubleshooting instead of feature development

### What We've Tried

Our development team has exhausted standard troubleshooting steps, including:

- Regenerating all authentication credentials
- Testing multiple authentication methods
- Reviewing Avinode documentation and integration guides
- Verifying account configuration settings

All attempts result in authentication failures, confirming this requires Avinode Support intervention to resolve account-level configuration issues.

**Note:** Detailed technical information, including specific error codes, authentication flows, and diagnostic logs, can be found in the internal technical document referenced below. This information is available for Avinode Support but has been excluded from this partner update for brevity.

### Action Required

We need Avinode Support to resolve the account configuration and permission issues. The detailed technical support request has been prepared and includes all necessary information for Avinode to diagnose and resolve the issue.

### Technical Documentation (Internal Reference)

**For Avinode Support:** A comprehensive technical support document has been prepared and is available for sharing with Avinode Support. This internal document contains:

- Complete diagnostic logs and API response details
- Authentication flow testing results
- Account configuration details
- Screenshots of permission issues
- Test commands and verification steps

**Location:** `docs/communication/2025-12-23-avinode-sandbox-access-issue.md`

This technical document should be included when contacting Avinode Support to ensure they have all necessary information to diagnose and resolve the issue efficiently.

### Impact on Development

This issue is **blocking critical Avinode integration development work**, preventing:

- API integration testing and validation
- Flight request and quote processing workflows
- End-to-end feature testing
- Integration milestone completion

### Next Steps & Owners

| Step | Owner | Timeline | Status |
|------|-------|----------|--------|
| 1. Review internal technical document | Partner Lead | Immediate | Pending |
| 2. Forward support request to Avinode Support | Partner Lead / Account Manager | Within 24 hours | Pending |
| 3. Follow up with Avinode for status update | Partner Lead | 48 hours after submission | Pending |
| 4. Coordinate resolution timeline with Avinode | Partner Lead | As needed | Pending |
| 5. Verify API access restored | Development Team | Upon Avinode confirmation | Pending |
| 6. Resume integration development | Development Team | After access restored | Blocked |

**Contact:** Please coordinate with the Development Team Lead for any technical questions or clarifications needed before contacting Avinode Support.

Best regards,

Jetvision Development Team

---
