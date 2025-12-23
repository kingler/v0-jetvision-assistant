# Avinode API Integration - Partner Update

**Date:** December 23, 2025
**From:** Jetvision Development Team
**To:** One Kaleidoscope Partners
**Subject:** Avinode Sandbox API Access Issue - Action Required

---

## Email to One Kaleidoscope Partners

**To:** One Kaleidoscope Partners
**Subject:** Avinode API Integration Blocked - Account/Permission Issue Requiring Avinode Support

---

Dear Partners,

I wanted to update you on a blocking issue we've encountered with our Avinode API integration for the Jetvision application.

### Issue Summary

Following the weekly Avinode sandbox reset (which occurs every Monday between 6-8 AM UTC), we have lost access to the API and are unable to proceed with development. **This is an account/permissions issue on Avinode's side, not a code issue.**

### What Happened

1. **Account Access Lost:** We can no longer switch accounts from "Jetvision LLC" to "Sandbox Dev Operator" where API permissions are configured.

2. **Permission Downgrade:** The "Company APIs" permission now shows as "View Only" instead of "Full" access, and is non-editable.

3. **Both Token Types Failing:** We tested two different authentication token types after regenerating credentials:
   - `avitype=16` (Interactive) → `AUTHENTICATION_COMPANY_ACCESS` error
   - `avitype=15` (REST/Sandbox) → `ERR_INPUT_GENERIC_INVALID` on buyer endpoints

4. **OAuth Also Failing:** The OAuth Client Credentials flow returns `invalid_client` even with freshly regenerated credentials.

### What We've Tried

- Regenerated API Token, Authentication Secret (JWT), and OAuth credentials from the Avinode Sandbox UI
- Tested both token types (avitype 15 and 16)
- Tested OAuth 2.0 Client Credentials flow
- Reviewed Avinode documentation thoroughly

All approaches fail with different errors, indicating the issue is on Avinode's account configuration side.

### Action Required

We need to contact Avinode Support to request:

1. **Restore account switching** to "Sandbox Dev Operator" account
2. **Upgrade "Company APIs" permission** from "View Only" to "Full"
3. **Verify OAuth credentials** are properly activated after the sandbox reset
4. **Clarify which token type** (`avitype=15` vs `avitype=16`) should be used for REST API integration as a buyer/broker

### Attached Documentation

Please find attached the detailed support email we've prepared for Avinode Support:
- [2025-12-23-avinode-sandbox-access-issue.md](./2025-12-23-avinode-sandbox-access-issue.md)

This document includes:
- Complete error logs and API responses
- Both authentication token types tested with their specific errors
- curl commands used for testing
- Screenshots showing the permission issues
- Our account configuration details

### Impact on Development

This issue is **blocking our Avinode integration development**. We cannot:

- Create trips via the API
- Retrieve RFQ data and operator quotes
- Test the deep link workflow
- Process webhook events

### Recommended Next Steps

1. **Review the attached support email** and let me know if any changes are needed
2. **Forward the email to Avinode Support** (or let me know who should send it)
3. **Follow up with Avinode** to ensure timely resolution

Please let me know if you have any questions or need additional information.

Best regards,

Jetvision Development Team

---

## Attachment Reference

The detailed Avinode support email is located at:
`docs/communication/2025-12-23-avinode-sandbox-access-issue.md`

This contains the complete technical documentation needed for Avinode to diagnose and resolve the issue.
