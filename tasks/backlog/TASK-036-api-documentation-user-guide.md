# API Documentation & User Guide

**Task ID**: TASK-036
**Created**: 2025-10-20
**Assigned To**: Technical Writer / Senior Developer
**Status**: `pending`
**Priority**: `normal`
**Estimated Time**: 8 hours
**Actual Time**: - (update when complete)

**Dependencies**: All previous tasks

---

## 1. TASK OVERVIEW

### Objective
Create comprehensive technical documentation including OpenAPI/Swagger API documentation, end-user guide with tutorials, administrator guide for system configuration, troubleshooting guide for common issues, FAQ section, optional video tutorials, and changelog maintenance system to ensure users and developers can effectively use and maintain the system.

### User Story
**As a** new user or developer
**I want** comprehensive, clear documentation
**So that** I can quickly learn the system, integrate with APIs, and troubleshoot issues independently

### Business Value
High-quality documentation reduces support tickets by 70% and accelerates user onboarding by 80%. Well-documented APIs enable partner integrations and expand market reach. Comprehensive guides empower users to solve problems independently, reducing support costs from $50,000/year to $15,000/year. Documentation is essential for enterprise adoption and passing security audits.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL have OpenAPI/Swagger API documentation
- All API endpoints documented
- Request/response schemas defined
- Authentication methods explained
- Code examples in TypeScript and cURL
- Interactive API explorer (Swagger UI)
- Versioning strategy documented

**FR-2**: System SHALL have user guide with tutorials
- Getting started guide (5 minutes)
- Core workflows documented:
  - Creating a flight request
  - Viewing quotes
  - Analyzing proposals
  - Sending proposals to clients
- Step-by-step screenshots
- Common use cases
- Best practices

**FR-3**: System SHALL have administrator guide
- Installation and setup
- Environment configuration
- User management
- Database maintenance
- Backup and restore procedures
- Monitoring and alerting setup
- Performance tuning
- Security hardening

**FR-4**: System SHALL have troubleshooting guide
- Common issues and solutions
- Error code reference
- Debugging procedures
- Log analysis guide
- Performance troubleshooting
- Database issues
- Integration problems

**FR-5**: System SHALL have FAQ section
- 20+ frequently asked questions
- Organized by category:
  - General usage
  - Technical questions
  - Billing and pricing
  - Security and privacy
  - Integration and APIs
- Search functionality
- Links to relevant documentation

**FR-6**: System SHALL have optional video tutorials
- 5-minute getting started video
- Workflow demonstration videos
- Admin setup video
- Embedded in documentation
- Hosted on YouTube/Vimeo

**FR-7**: System SHALL maintain changelog
- CHANGELOG.md file
- Semantic versioning
- Release notes for each version
- Breaking changes highlighted
- Migration guides for major versions

### Acceptance Criteria

- [ ] **AC-1**: OpenAPI spec file generated and valid
- [ ] **AC-2**: Swagger UI accessible at /api/docs
- [ ] **AC-3**: All API endpoints documented with examples
- [ ] **AC-4**: User guide covers all core workflows
- [ ] **AC-5**: Administrator guide complete with all setup steps
- [ ] **AC-6**: Troubleshooting guide has 15+ solutions
- [ ] **AC-7**: FAQ has 20+ questions answered
- [ ] **AC-8**: Changelog up to date with all releases
- [ ] **AC-9**: Documentation site deployed and accessible
- [ ] **AC-10**: Search functionality working
- [ ] **AC-11**: All screenshots current (not outdated)
- [ ] **AC-12**: Code examples tested and working
- [ ] **AC-13**: Code review approved

### Non-Functional Requirements

- **Clarity**: 8th-grade reading level for user-facing docs
- **Completeness**: 100% of features documented
- **Accuracy**: Zero incorrect information
- **Accessibility**: WCAG 2.1 AA compliant
- **Searchability**: Full-text search enabled

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Create Documentation Structure FIRST (Red Phase)

**Documentation Files to Create**:
```
docs/
├── api/
│   ├── openapi.yaml
│   ├── authentication.md
│   ├── endpoints.md
│   └── webhooks.md
├── user-guide/
│   ├── getting-started.md
│   ├── creating-requests.md
│   ├── viewing-quotes.md
│   ├── analyzing-proposals.md
│   └── sending-proposals.md
├── admin-guide/
│   ├── installation.md
│   ├── configuration.md
│   ├── user-management.md
│   ├── database-maintenance.md
│   ├── monitoring.md
│   └── security.md
├── troubleshooting/
│   ├── common-issues.md
│   ├── error-codes.md
│   ├── debugging.md
│   └── performance.md
├── faq.md
├── changelog.md
└── videos/
    ├── getting-started.md
    └── admin-setup.md
```

**OpenAPI Specification**:
```yaml
# docs/api/openapi.yaml
openapi: 3.0.0
info:
  title: JetVision AI Assistant API
  description: |
    REST API for JetVision AI Assistant - Multi-Agent RFP Automation System.

    This API enables ISO agents to automate the private jet charter booking workflow
    from flight request to proposal delivery.

    ## Authentication
    All API endpoints require authentication using Clerk JWT tokens.
    Include the token in the Authorization header:
    `Authorization: Bearer <your-jwt-token>`

    ## Rate Limiting
    API requests are limited to 100 requests per minute per user.
    Authentication endpoints are limited to 5 requests per minute.

    ## Versioning
    API version is included in the URL path: `/api/v1/...`
    Current version: v1

  version: 1.0.0
  contact:
    name: JetVision Support
    email: support@jetvision-assistant.com
    url: https://jetvision-assistant.com/support

servers:
  - url: https://jetvision-assistant.com/api/v1
    description: Production server
  - url: https://staging.jetvision-assistant.com/api/v1
    description: Staging server
  - url: http://localhost:3000/api/v1
    description: Development server

tags:
  - name: Requests
    description: Flight request management
  - name: Quotes
    description: Operator quote management
  - name: Proposals
    description: Proposal generation and delivery
  - name: Clients
    description: Client profile management
  - name: Admin
    description: Administrative operations

paths:
  /requests:
    get:
      summary: List flight requests
      description: Retrieve all flight requests for the authenticated user
      tags:
        - Requests
      security:
        - BearerAuth: []
      parameters:
        - name: status
          in: query
          description: Filter by request status
          schema:
            type: string
            enum: [CREATED, ANALYZING, SEARCHING_FLIGHTS, AWAITING_QUOTES, COMPLETED]
        - name: limit
          in: query
          description: Number of results to return (max 100)
          schema:
            type: integer
            default: 20
            maximum: 100
        - name: offset
          in: query
          description: Pagination offset
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: List of flight requests
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/FlightRequest'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
              examples:
                success:
                  value:
                    data:
                      - id: "123e4567-e89b-12d3-a456-426614174000"
                        departure_airport: "KTEB"
                        arrival_airport: "KVNY"
                        passengers: 6
                        departure_date: "2025-11-15"
                        status: "COMPLETED"
                        created_at: "2025-10-20T10:30:00Z"
                    pagination:
                      total: 45
                      limit: 20
                      offset: 0
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '429':
          $ref: '#/components/responses/RateLimitError'

    post:
      summary: Create flight request
      description: Create a new flight request and trigger automated workflow
      tags:
        - Requests
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateFlightRequest'
            examples:
              basic:
                value:
                  departure_airport: "KTEB"
                  arrival_airport: "KVNY"
                  passengers: 6
                  departure_date: "2025-11-15T14:00:00Z"
              with_client:
                value:
                  departure_airport: "KTEB"
                  arrival_airport: "KVNY"
                  passengers: 6
                  departure_date: "2025-11-15T14:00:00Z"
                  client_email: "john@example.com"
                  notes: "Client prefers vegetarian catering"
      responses:
        '201':
          description: Flight request created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FlightRequest'
        '400':
          $ref: '#/components/responses/BadRequestError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '429':
          $ref: '#/components/responses/RateLimitError'

  /requests/{id}:
    get:
      summary: Get flight request
      description: Retrieve details of a specific flight request
      tags:
        - Requests
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          description: Flight request ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Flight request details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FlightRequest'
        '404':
          $ref: '#/components/responses/NotFoundError'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    FlightRequest:
      type: object
      properties:
        id:
          type: string
          format: uuid
        user_id:
          type: string
          format: uuid
        client_id:
          type: string
          format: uuid
          nullable: true
        departure_airport:
          type: string
          pattern: '^[A-Z]{4}$'
          example: "KTEB"
        arrival_airport:
          type: string
          pattern: '^[A-Z]{4}$'
          example: "KVNY"
        passengers:
          type: integer
          minimum: 1
          maximum: 50
          example: 6
        departure_date:
          type: string
          format: date-time
        status:
          type: string
          enum:
            - CREATED
            - ANALYZING
            - FETCHING_CLIENT_DATA
            - SEARCHING_FLIGHTS
            - AWAITING_QUOTES
            - ANALYZING_PROPOSALS
            - GENERATING_EMAIL
            - SENDING_PROPOSAL
            - COMPLETED
            - FAILED
            - CANCELLED
        current_step:
          type: integer
        total_steps:
          type: integer
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    CreateFlightRequest:
      type: object
      required:
        - departure_airport
        - arrival_airport
        - passengers
        - departure_date
      properties:
        departure_airport:
          type: string
          pattern: '^[A-Z]{4}$'
        arrival_airport:
          type: string
          pattern: '^[A-Z]{4}$'
        passengers:
          type: integer
          minimum: 1
          maximum: 50
        departure_date:
          type: string
          format: date-time
        client_email:
          type: string
          format: email
        notes:
          type: string
          maxLength: 10000

    Pagination:
      type: object
      properties:
        total:
          type: integer
        limit:
          type: integer
        offset:
          type: integer

    Error:
      type: object
      properties:
        error:
          type: string
        message:
          type: string
        code:
          type: string

  responses:
    UnauthorizedError:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "Unauthorized"
            message: "Authentication token required"
            code: "AUTH_REQUIRED"

    BadRequestError:
      description: Invalid request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "Bad Request"
            message: "Invalid airport code"
            code: "INVALID_INPUT"

    NotFoundError:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    RateLimitError:
      description: Rate limit exceeded
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "Too Many Requests"
            message: "Rate limit exceeded. Please try again later."
            code: "RATE_LIMIT_EXCEEDED"
```

**Getting Started Guide**:
```markdown
# Getting Started with JetVision AI Assistant

Welcome to JetVision AI Assistant! This guide will help you get started in 5 minutes.

## What is JetVision AI Assistant?

JetVision AI Assistant automates the private jet charter booking workflow for ISO agents. Instead of spending 2-4 hours manually processing each flight request, our AI-powered system completes the entire workflow in under 5 minutes.

## Quick Start

### Step 1: Sign In

1. Go to [https://jetvision-assistant.com](https://jetvision-assistant.com)
2. Click "Sign In" in the top right
3. Enter your email and password
4. You'll be redirected to the dashboard

![Sign In Screen](./images/signin.png)

### Step 2: Create Your First Flight Request

1. On the dashboard, click "New Request"
2. Enter flight details:
   - **Departure Airport**: KTEB (Teterboro)
   - **Arrival Airport**: KVNY (Van Nuys)
   - **Passengers**: 6
   - **Date**: Select a future date
3. Click "Create Request"

![Create Request](./images/create-request.png)

### Step 3: Watch the AI Work

The system will automatically:

1. **Analyze** your request (5 seconds)
2. **Search** for available aircraft (30 seconds)
3. **Create RFPs** and send to operators (1 minute)
4. **Collect quotes** from operators (2-5 minutes)
5. **Analyze** and rank quotes (30 seconds)
6. **Generate** personalized proposal email (1 minute)

You can watch the progress in real-time:

![Workflow Progress](./images/workflow-progress.png)

### Step 4: Review and Send Proposal

Once quotes arrive:

1. Review the top 3 recommended options
2. See detailed comparison table
3. Click "Send Proposal" to email your client
4. Track email delivery status

![Quote Analysis](./images/quote-analysis.png)

## What's Next?

- **Add Client Profiles**: Import your client database for automatic personalization
- **Customize Settings**: Configure markup, email signature, and preferences
- **Explore Reports**: View analytics and performance metrics
- **Integrate APIs**: Connect your existing systems

## Common Questions

**How long does it take?**
Typically 3-5 minutes from request to proposal.

**Can I edit the proposal before sending?**
Yes! Click "Edit" before sending to customize the email.

**What if I need help?**
Click the "Help" button in the bottom right to chat with support.

## Video Tutorial

[▶️ Watch: Getting Started in 5 Minutes](https://youtube.com/watch?v=xxx)

## Need Help?

- 📧 Email: support@jetvision-assistant.com
- 💬 Chat: Click help button in app
- 📚 Docs: [Full Documentation](https://docs.jetvision-assistant.com)
```

**Troubleshooting Guide**:
```markdown
# Troubleshooting Guide

This guide helps you solve common issues quickly.

## Table of Contents

1. [Authentication Issues](#authentication-issues)
2. [Request Creation Errors](#request-creation-errors)
3. [Quote Not Arriving](#quote-not-arriving)
4. [Performance Issues](#performance-issues)
5. [Email Delivery Problems](#email-delivery-problems)

---

## Authentication Issues

### Cannot Sign In

**Problem**: "Invalid email or password" error

**Solutions**:
1. Verify email spelling
2. Try "Forgot Password" to reset
3. Check if account is active (contact admin)
4. Clear browser cache and cookies
5. Try incognito/private mode

**Still not working?**
Contact support with error screenshot.

### Session Expires Quickly

**Problem**: Being logged out frequently

**Solutions**:
1. Check browser cookie settings (must allow cookies)
2. Disable browser extensions (ad blockers may interfere)
3. Update browser to latest version

---

## Request Creation Errors

### "Invalid Airport Code"

**Problem**: Airport code not recognized

**Solutions**:
1. Use ICAO codes (4 letters), not IATA codes
   - ✅ Correct: KTEB, KVNY, KJFK
   - ❌ Incorrect: TEB, VNY, JFK
2. Ensure all caps
3. Verify airport code exists: [ICAO Code Lookup](https://www.world-airport-codes.com)

### "Date Must Be in Future"

**Problem**: Cannot select departure date

**Solutions**:
1. Select date at least 1 day in future
2. Check timezone (system uses UTC)
3. Refresh page and try again

### "Invalid Passenger Count"

**Problem**: Passenger count rejected

**Solutions**:
1. Enter number between 1 and 50
2. Remove any spaces or special characters
3. Enter whole numbers only (no decimals)

---

## Quote Not Arriving

### Stuck on "Awaiting Quotes"

**Problem**: Request stuck waiting for operator responses

**Expected Time**: 2-5 minutes typically, up to 30 minutes maximum

**Solutions**:
1. **Wait 5 minutes**: Operators may take time to respond
2. **Check status**: Click request to see detailed status
3. **Verify route**: Some routes may have limited availability
4. **Contact support**: If >30 minutes with no quotes

### No Quotes Received

**Problem**: Workflow completes but no quotes

**Possible Causes**:
1. No available aircraft for route/date
2. Route not serviced by operators
3. Too many passengers for available aircraft
4. Short notice booking (operators unavailable)

**Solutions**:
1. Try different dates (more flexibility)
2. Reduce passenger count if possible
3. Try alternate airports nearby
4. Contact support for manual search

---

## Performance Issues

### Slow Page Loading

**Problem**: Pages take >5 seconds to load

**Solutions**:
1. Check internet connection speed
2. Clear browser cache:
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Settings → Privacy → Clear Data
   - Safari: Settings → Clear History
3. Disable browser extensions
4. Try different browser
5. Check [Status Page](https://status.jetvision-assistant.com)

### Real-Time Updates Not Working

**Problem**: Quote status not updating automatically

**Solutions**:
1. Refresh page manually (F5)
2. Check browser console for errors:
   - Press F12 → Console tab
   - Screenshot errors and send to support
3. Verify WebSocket connection:
   - Look for "WebSocket connected" in console
4. Disable VPN/proxy (may block WebSockets)

---

## Email Delivery Problems

### Proposal Email Not Sent

**Problem**: "Email failed to send" error

**Solutions**:
1. Verify client email address format
2. Check email character limit (10,000 chars)
3. Verify Gmail connection:
   - Settings → Integrations → Gmail
   - Reconnect if needed
4. Check spam folder (may be flagged)
5. Try resending (click "Resend" button)

### Email Sent But Client Didn't Receive

**Problem**: Email shows as sent but client reports not receiving

**Solutions**:
1. Check client's spam/junk folder
2. Verify email address spelling
3. Check email delivery status:
   - Click request → Communications tab
   - Look for delivery confirmation
4. Ask client to whitelist: noreply@jetvision-assistant.com
5. Resend proposal

---

## Error Codes Reference

| Code | Meaning | Solution |
|------|---------|----------|
| `AUTH_REQUIRED` | Not logged in | Sign in again |
| `AUTH_EXPIRED` | Session expired | Sign in again |
| `INVALID_INPUT` | Invalid data format | Check input formatting |
| `NOT_FOUND` | Resource doesn't exist | Verify ID/URL |
| `RATE_LIMIT` | Too many requests | Wait 1 minute, try again |
| `SERVER_ERROR` | Internal server error | Try again, contact support if persists |

---

## Getting More Help

### Before Contacting Support

Gather this information:
1. Screenshot of error
2. Steps to reproduce issue
3. Browser and version
4. Time issue occurred
5. Request ID (if applicable)

### Contact Methods

- **Email**: support@jetvision-assistant.com (Response: 24 hours)
- **Chat**: Click Help button in app (Response: 1 hour during business hours)
- **Phone**: +1-555-JETV-ISION (Emergency only)

### Status Page

Check system status: [status.jetvision-assistant.com](https://status.jetvision-assistant.com)

---

*Last Updated: October 20, 2025*
```

### Step 2: Deploy Documentation (Green Phase)

**Documentation Site Setup**:
```bash
# Install documentation framework (e.g., Docusaurus)
npx create-docusaurus@latest docs classic

# Configure
cd docs
npm install

# Add Swagger UI
npm install docusaurus-plugin-openapi-docs
npm install docusaurus-theme-openapi-docs

# Configure docusaurus.config.js
# Add OpenAPI plugin configuration

# Build docs
npm run build

# Deploy to Vercel
vercel --prod
```

**Package.json Scripts**:
```json
{
  "scripts": {
    "docs:dev": "cd docs && npm run start",
    "docs:build": "cd docs && npm run build",
    "docs:deploy": "cd docs && vercel --prod",
    "openapi:validate": "swagger-cli validate docs/api/openapi.yaml",
    "openapi:bundle": "swagger-cli bundle docs/api/openapi.yaml -o docs/api/openapi-bundled.yaml"
  }
}
```

### Step 3: Maintain and Update (Blue Phase)

- Keep docs in sync with code
- Update screenshots
- Add new tutorials
- Gather user feedback

---

## 4-11. STANDARD SECTIONS

[Following template structure]

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
**Reviewed By**: -
**Review Date**: -

**Dependencies**: All previous tasks
