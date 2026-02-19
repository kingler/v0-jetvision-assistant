# ONEK Linear Issue → Feature Decomposition Mapping

## JetVision AI Assistant Project

**Last Updated**: February 16, 2026
**Linear Team**: One Kaleidoscope (ONEK)
**Total Linear Issues**: 290 (ONEK-1 through ONEK-290)
**Plan Items**: 15 Features, 35 Epics, 147 User Stories, 265 Tasks

---

## Status Legend

| Symbol | Status |
|--------|--------|
| ✅ | Done |
| 🔄 | In Progress |
| 👀 | In Review |
| 📋 | Backlog |
| 📌 | Todo |
| ❌ | Canceled |
| 🔁 | Duplicate |

---

## Summary Statistics

### Issue Breakdown by Status

| Status | Count | Percentage |
|--------|-------|------------|
| **Done** | ~210 | 72% |
| **Backlog** | ~30 | 10% |
| **Duplicate** | ~20 | 7% |
| **Canceled** | ~8 | 3% |
| **In Review** | 4 | 1% |
| **In Progress** | 1 | <1% |
| **Todo** | 1 | <1% |

### Issue Breakdown by Feature Area

| Feature | Linear Issues | Percentage |
|---------|--------------|------------|
| **F001 - AI Chat Assistant** | 38 | 13% |
| **F002 - Flight Request Mgmt** | 28 | 10% |
| **F003 - Quote Management** | 8 | 3% |
| **F004 - Proposal Generation** | 18 | 6% |
| **F005 - Contract & Payment** | 24 | 8% |
| **F006 - Avinode Integration** | 19 | 7% |
| **F007 - CRM / Client Mgmt** | 3 | 1% |
| **F008 - Email Communication** | 5 | 2% |
| **F009 - Auth & Onboarding** | 16 | 6% |
| **F010 - Multi-Agent Infra** | 22 | 8% |
| **F011 - Design System** | 22 | 8% |
| **F012 - Notifications** | 2 | 1% |
| **F013 - Chat Session Mgmt** | 14 | 5% |
| **F014 - Analytics & Monitoring** | 10 | 3% |
| **F015 - Testing & Quality** | 9 | 3% |
| **Cross-Cutting / Ops** | 42 | 14% |

---

## Feature Mapping

### F001 - AI Chat Assistant Interface (CRITICAL)

> Plan: `.claude/plans/features/F001-ai-chat-assistant.md`
> Epics: EPIC001 (Chat Interface Core), EPIC002 (Streaming & Real-time), EPIC003 (Rich Message Components)
> Tasks: TASK001–TASK037

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-92** | ✅ | [EPIC] Unified Chat Interface | EPIC001, EPIC002, EPIC003 |
| **ONEK-93** | ✅ | Message Component System | TASK003, TASK005, US003, US004 |
| **ONEK-94** | ✅ | Interactive Action Buttons | TASK032, TASK033, US013, US014 |
| **ONEK-95** | ✅ | Conversational RFP Flow | US016 (cross-ref F002), TASK038 |
| **ONEK-96** | ✅ | Rich Message Renderer | EPIC003, TASK025–TASK031 |
| **ONEK-97** | ✅ | Chat API Enhancement | TASK001, TASK002, TASK007 |
| **ONEK-98** | ✅ | Orchestrator Agent Updates | TASK006 (cross-ref F010) |
| **ONEK-99** | ✅ | Conversation State Manager | TASK007, TASK009 |
| **ONEK-100** | ✅ | [DASH] Inline Flight Deal Pipeline Dashboard in Chat Thread | TASK036, TASK037, US015 |
| **ONEK-101** | ✅ | Routing Updates for Unified Chat | TASK001 (routing integration) |
| **ONEK-102** | ✅ | Navigation Component Updates | US127 (cross-ref F013) |
| **ONEK-137** | ✅ | Connect Chat Interface to Multi-Agent System with Direct OpenAI Integration | EPIC001, TASK001–TASK006 |
| **ONEK-139** | ✅ | Inline Deals/Pipeline View in Chat | TASK036, TASK037, US015 |
| **ONEK-155** | ✅ | Enhanced Conversation Starters - Feature Epic | TASK010, TASK011, US005 |
| **ONEK-156** | ✅ | [FOUND] Create StarterCard Component (Card-Style) | TASK010 |
| **ONEK-157** | ✅ | [FOUND] Create ConversationStarterHub Container | TASK010, TASK011 |
| **ONEK-158** | ✅ | [FOUND] Create useSmartStarters Hook | TASK011 |
| **ONEK-159** | ✅ | [FOUND] Integrate Starters into ChatInterface | TASK010, TASK011 |
| **ONEK-160** | ✅ | [FLIGHT] Implement New Flight Request Starter | TASK010 |
| **ONEK-161** | ✅ | [FLIGHT] Implement Active Requests Starter | TASK010 |
| **ONEK-162** | ✅ | [DEALS] Implement Show My Deals Starter | TASK010 |
| **ONEK-163** | ✅ | [DEALS] Implement Hot Opportunities Starter | TASK037 |
| **ONEK-164** | ✅ | [PIPE] Enhance Pipeline Summary Starter | TASK036, TASK037 |
| **ONEK-166** | ✅ | [CHAT] Implement Flight Booking Handler | TASK027 (cross-ref F005) |
| **ONEK-167** | ✅ | [CHAT] Implement Proposal Generation Handler | TASK030, TASK031 (cross-ref F004) |
| **ONEK-168** | 🔁 | [AUDIT] ONEK-92 Unified Chat Interface - Gap Analysis | — (superseded) |
| **ONEK-190** | ✅ | Bug: Chat messages display out of chronological order | TASK008 |
| **ONEK-191** | ✅ | Add formatMessageTimestamp() utility | TASK008 |
| **ONEK-192** | ✅ | Fix safeParseTimestamp fallback + timestamp display | TASK008, TASK007 |
| **ONEK-193** | ✅ | Update agent-message.tsx to use formatMessageTimestamp | TASK003 |
| **ONEK-194** | ✅ | Update extracted UserMessage + OperatorMessage components | TASK003 |
| **ONEK-195** | ✅ | Fix messageTransformers.ts safe timestamp parsing | TASK007, TASK017 |
| **ONEK-196** | ✅ | Add/update unit tests for all timestamp changes | TASK007 (tests) |
| **ONEK-205** | ✅ | Mobile responsive modals with iOS-style bottom sheet drawers | US114 (cross-ref F011) |
| **ONEK-206** | ✅ | MCP UI-Inspired Tool UI Registry Migration | TASK006 |
| **ONEK-209** | ✅ | Fix duplicated proposal & email cards in chat UI | TASK030, TASK031 |
| **ONEK-56** | ❌ | Integrate OpenAI ChatKit React components | — (canceled) |

---

### F002 - Flight Request Management (CRITICAL)

> Plan: `.claude/plans/features/F002-flight-request-management.md`
> Epics: EPIC004 (Request Submission), EPIC005 (Trip Creation & Deep Links), EPIC006 (Request Lifecycle)
> Tasks: TASK038–TASK062

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-70** | ✅ | Transform RFP submission from form-based to conversational AI workflow | EPIC004, US016–US020 |
| **ONEK-84** | ✅ | ONEK-70.1: RFP Entity Extraction Service | TASK038, TASK039 |
| **ONEK-85** | ✅ | ONEK-70.2: Conversational Clarification Flow | TASK039, US017 |
| **ONEK-86** | ✅ | ONEK-70.3: RFP Orchestrator Integration | TASK040 (cross-ref F010) |
| **ONEK-87** | ✅ | ONEK-70.4: Workflow State Visualization | TASK028, TASK029, US025 |
| **ONEK-88** | ✅ | ONEK-70.5: Proposal Preview in Chat | TASK030 (cross-ref F004) |
| **ONEK-130** | ✅ | Implement RFP Chat Flow - Webhook to Proposal Generation Pipeline | EPIC004, EPIC006 |
| **ONEK-138** | ✅ | Implement RFQ Workflow Steps 3 & 4: View RFQ Flights & Send Proposal | TASK056–TASK060 |
| **ONEK-141** | ✅ | Implement Flight Booking Backend Flow | TASK040 (cross-ref F005) |
| **ONEK-143** | ✅ | Enhance Agent System Prompts with Chat Messaging & Booking Tools | — (agent tooling) |
| **ONEK-144** | ✅ | [Epic] Multi-City Trips & Empty Leg Subscriptions | EPIC005, US021–US024 |
| **ONEK-145** | ✅ | [US-001] Create Multi-City Trip | US021, TASK049 |
| **ONEK-146** | ✅ | [US-002] Create Round-Trip with Return Details | US022, TASK050 |
| **ONEK-147** | ✅ | [US-003] Subscribe to Empty Leg Alerts | US023 |
| **ONEK-148** | ✅ | [US-004] View Empty Leg Matches | US024 |
| **ONEK-149** | ✅ | [US-005] Backward Compatibility | US021 (compat) |
| **ONEK-150** | ✅ | [Task] Create trip_segments database migration | TASK049 |
| **ONEK-151** | ✅ | [Task] Add TripSegment interface to MCP types | TASK049 |
| **ONEK-152** | ✅ | [Task] Update create_trip MCP handler for segments[] | TASK040, TASK049 |
| **ONEK-153** | ✅ | [Task] Update FlightSearchAgent for multi-segment trips | TASK049, TASK050 |
| **ONEK-154** | ✅ | [Task] Integration tests for multi-segment trips | TASK055 (tests) |
| **ONEK-174** | ✅ | BUG: Round-trip proposals show only one leg | US022, TASK050 |
| **ONEK-197** | ✅ | [Bug] TripSummaryCard shows one-way for round-trip requests | TASK019, US022 |
| **ONEK-200** | ✅ | [Bug] Sidebar and header show → instead of ⇄ for round-trip sessions | TASK056 |
| **ONEK-202** | 📋 | [Gap] No frontend UI for empty leg watch feature (ONEK-147/148) | US023, US024 |
| **ONEK-210** | ✅ | BUG: Agent create_trip tool definition missing segments[] param | TASK049, TASK040 |
| **ONEK-211** | ✅ | BUG: Agent system prompt lacks multi-city and round-trip instructions | TASK049 (agent prompt) |
| **ONEK-227** | ✅ | Verify multi-leg/round-trip deep link opens correct Avinode tab | TASK049, TASK051 |
| **ONEK-228** | 📋 | Reconcile TripCreatedUI and FlightSearchProgress into shared TripRequestCard | TASK019 |

---

### F003 - Quote Management (CRITICAL)

> Plan: `.claude/plans/features/F003-quote-management.md`
> Epics: EPIC007 (Quote Reception & Display), EPIC008 (Quote Comparison & Selection)
> Tasks: TASK063–TASK076

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-134** | ✅ | Implement use-avinode-quotes Hook for Real-time Quote Updates | TASK063, TASK064, US030 |
| **ONEK-175** | ✅ | BUG: RFQ price updates by operator do not refresh in Chat UI | TASK063, TASK064 |
| **ONEK-201** | ✅ | [Bug] RFQ quote cards missing outbound/return leg badge | TASK025, US033 |
| **ONEK-235** | 📋 | Upgrade RfqResultsUI to use RFQFlightsList matching Step 3 style | TASK071, US035 |
| **ONEK-129** | ✅ | Implement Avinode Flight Request Workflow UI Components | EPIC007, TASK025, TASK063 |
| **ONEK-138** | ✅ | Implement RFQ Workflow Steps 3 & 4: View RFQ Flights & Send Proposal | TASK071–TASK076 |
| **ONEK-289** | 👀 | Pricing on Proposal | TASK071 (cross-ref F004) |

---

### F004 - Proposal Generation & Delivery (CRITICAL)

> Plan: `.claude/plans/features/F004-proposal-generation.md`
> Epics: EPIC009 (Proposal Generation), EPIC010 (Proposal Delivery)
> Tasks: TASK077–TASK097

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-165** | ❌ | Integrate Avinode PDF with Customer Proposal Generation | TASK077 (canceled) |
| **ONEK-169** | 🔁 | Add generate_proposal tool to Chat Agent | TASK077 (duplicate) |
| **ONEK-170** | ✅ | Add send_proposal tool to Chat Agent | TASK087, US044 |
| **ONEK-171** | 🔁 | Update Chat Agent System Prompt for Proposal Workflow | — (duplicate) |
| **ONEK-172** | ✅ | Add get_customer tool to Chat Agent for proposal workflows | TASK087, TASK088 |
| **ONEK-177** | ✅ | ENHANCEMENT: Configurable Jetvision service charge % | TASK079, US041 |
| **ONEK-178** | ✅ | ENHANCEMENT: Add proposal + email preview before sending | TASK089, US078 (cross-ref F008) |
| **ONEK-185** | ✅ | Remove Jetvision Service Fee line from client-facing PDF | TASK081 |
| **ONEK-186** | ✅ | Add preset service charge % buttons (8%, 10%, 20%, custom) | TASK079 |
| **ONEK-187** | ✅ | Add operator/service/total cost breakdown to internal SendProposalStep | TASK079, TASK080 |
| **ONEK-188** | ✅ | Align ProposalPreview labels to "Operator Cost" / "Service Cost" / "Total Cost" | TASK080 |
| **ONEK-198** | ✅ | [Bug] Proposal Sent confirmation shows "One-Way" for round-trip proposals | TASK081, US039 |
| **ONEK-207** | ✅ | ENHANCEMENT: Rich Contract Card in chat thread + auto-open PDF | TASK081, TASK083 |
| **ONEK-277** | 📋 | Enhance PDF Proposal Template with Aircraft Images & Branding | TASK081, TASK082 |
| **ONEK-278** | 📋 | Epic: Dark Header & Footer Branding | EPIC009 (enhancement) |
| **ONEK-279** | 📋 | Epic: Aircraft Image Fallback System | TASK082 |
| **ONEK-280** | 📋 | Epic: Inline Aircraft Images in Flight Cards | TASK082 |
| **ONEK-281** | 📋 | Epic: Aircraft Showcase Gallery Page | TASK082 |
| **ONEK-282** | 📋 | As a sales rep, I want a premium dark-branded header on every proposal page | US039 (enhancement) |
| **ONEK-283** | 📋 | As a sales rep, I want a branded dark footer with contact info | US039 (enhancement) |
| **ONEK-284** | 📋 | As a developer, I want an image resolver that fetches aircraft photos with fallback | TASK082 |
| **ONEK-285** | 📋 | As a developer, I want a curated set of stock aircraft images | TASK082 |
| **ONEK-286** | 📋 | As a client, I want to see a photo of each aircraft option | US039, US040 |
| **ONEK-287** | 📋 | As a client, I want a dedicated aircraft gallery page | US039 (enhancement) |
| **ONEK-288** | 📋 | As a developer, I want the proposal generator to wire up the image resolver | TASK082, TASK081 |

---

### F005 - Contract & Payment Management (CRITICAL)

> Plan: `.claude/plans/features/F005-contract-payment.md`
> Epics: EPIC011 (Contract Generation), EPIC012 (Payment & Deal Closure)
> Tasks: TASK098–TASK112

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-224** | 👀 | Feature: Add email preview/approval step to Book Flight contract workflow | TASK098, US049 (cross-ref F008) |
| **ONEK-225** | 👀 | Feature: Include proposal as first page of trip contract PDF | TASK099, US050 |
| **ONEK-229** | ✅ | Wire Payment Confirmation Flow in Chat UI | TASK106, US053 |
| **ONEK-230** | ✅ | Relax Payment API to Accept 'sent' Contract Status | TASK098, TASK106 |
| **ONEK-231** | ✅ | Persist Payment & Deal Closure Messages to Chat History | TASK107, TASK109 |
| **ONEK-232** | 📋 | Customer Reply Detection via Gmail Polling | TASK097 (cross-ref F008) |
| **ONEK-233** | 📋 | Gate Book Flight Button on Customer Reply Status | TASK098 |
| **ONEK-234** | 📋 | Add Wire Transfer Payment Instructions to Contract PDF | TASK099, US050 |
| **ONEK-236** | ✅ | Verify and close: 'sent' status already in payableStatuses array | TASK106 |
| **ONEK-237** | ✅ | Pass requestId, customerName, flightRoute from chat-interface to payment API | TASK106, TASK107 |
| **ONEK-238** | ✅ | Consolidate duplicate message persistence paths (server vs client) | TASK107, TASK109 |
| **ONEK-239** | 📋 | Populate proposalSentAt in ClosedWonConfirmation timeline | TASK112 |
| **ONEK-240** | 📋 | Create seed data or mock chat demo for payment flow E2E testing | TASK112 (testing) |
| **ONEK-242** | ✅ | Add proposal→contract→payment→deal closure workflow to JetvisionAgent system prompt | EPIC011, EPIC012 |
| **ONEK-243** | ✅ | Write unit tests for POST /api/contract/[id]/payment route | TASK106 (tests) |
| **ONEK-244** | ✅ | Write unit tests for contract-service payment functions | TASK098, TASK106 (tests) |
| **ONEK-245** | ✅ | Write unit tests for mapDbMessageToChatMessage payment/deal mapping | TASK107 (tests) |
| **ONEK-246** | 📋 | Write unit tests for saveMessage with payment content types | TASK109 (tests) |
| **ONEK-247** | 📋 | Write component tests for PaymentConfirmationModal | TASK106 (tests) |
| **ONEK-248** | 📋 | Write component tests for PaymentConfirmedCard + ClosedWonConfirmation | TASK112 (tests) |
| **ONEK-257** | ✅ | [Feature] Offline Payment Confirmation → Closed Won Status + Auto-Archive | EPIC012, US053–US056 |

---

### F006 - Avinode Marketplace Integration (CRITICAL)

> Plan: `.claude/plans/features/F006-avinode-marketplace-integration.md`
> Epics: EPIC013 (Deep Link Workflow), EPIC014 (Webhook Processing), EPIC015 (Operator Messaging)
> Tasks: TASK113–TASK132

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-116** | ✅ | Avinode API Integration Redesign & 3-Party Chat System | EPIC013, EPIC014, EPIC015 |
| **ONEK-117** | ✅ | Build RFQ ID Input Component for Avinode Chat Integration | TASK113, US057 |
| **ONEK-118** | ✅ | Build Avinode Chat Thread Component for Operator Messages | TASK125, TASK126, US064 |
| **ONEK-119** | ✅ | Implement Real-time Webhook-to-Frontend Bridge for Avinode Events | TASK118, TASK119, US060 |
| **ONEK-120** | ✅ | Enhance Chat Interface with Avinode Integration Components | EPIC013, TASK113–TASK117 |
| **ONEK-121** | ✅ | Create Database Schema for Avinode Trip and Message Persistence | TASK118 (schema) |
| **ONEK-129** | ✅ | Implement Avinode Flight Request Workflow UI Components | EPIC013, TASK113–TASK117 |
| **ONEK-132** | ✅ | Build DeepLinkPrompt Component for Avinode Workflow | TASK117, US059 |
| **ONEK-133** | ✅ | Build TripIDInput Component for Avinode Trip Submission | TASK113, TASK114 |
| **ONEK-134** | ✅ | Implement use-avinode-quotes Hook for Real-time Quote Updates | TASK119 (cross-ref F003) |
| **ONEK-135** | ✅ | Build WebhookStatusIndicator Component for Connection Monitoring | TASK120, US061 |
| **ONEK-136** | ✅ | Build AvinodeActionRequired Component for Workflow Guidance | TASK117 |
| **ONEK-75** | ✅ | ONEK-71.1: Create Aircraft Database with 20+ Aircraft Models | TASK191 (mock data) |
| **ONEK-76** | ✅ | ONEK-71.2: Create Avinode API Response Mocks for All MCP Tools | TASK191, TASK198 |
| **ONEK-77** | ✅ | ONEK-71.3: Implement Mock/Real API Toggle System | TASK191 |
| **ONEK-71** | ✅ | Mock Data Infrastructure for Avinode API Simulation | TASK191, TASK198 |

---

### F007 - CRM / Client Management (HIGH)

> Plan: `.claude/plans/features/F007-crm-client-management.md`
> Epics: EPIC016 (Client Profiles), EPIC017 (Operator Management)
> Tasks: TASK133–TASK144

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-172** | ✅ | Add get_customer tool to Chat Agent for proposal workflows | TASK133, TASK135, US068 |
| **ONEK-176** | ✅ | BUG: Book Flight - Customer name is not populating | TASK139, US071 |
| **ONEK-208** | ✅ | BUG: ChatSessionRow type missing rfqFlights | TASK140 (type fix) |

---

### F008 - Email Communication (HIGH)

> Plan: `.claude/plans/features/F008-email-communication.md`
> Epics: EPIC018 (Email Sending), EPIC019 (Email Approval Workflow)
> Tasks: TASK145–TASK156

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-140** | ✅ | Integrate Gmail MCP with Email Service (Production Ready) | EPIC018, TASK145, TASK146 |
| **ONEK-178** | ✅ | ENHANCEMENT: Add proposal + email preview before sending | TASK149, US078 |
| **ONEK-224** | 👀 | Feature: Add email preview/approval step to Book Flight contract workflow | TASK149, US078 |
| **ONEK-232** | 📋 | Customer Reply Detection via Gmail Polling | TASK155, TASK156, US081 |
| **ONEK-290** | 👀 | Send Email Function Not Working | TASK145 (bug) |

---

### F009 - Authentication & Onboarding (CRITICAL)

> Plan: `.claude/plans/features/F009-authentication-onboarding.md`
> Epics: EPIC020 (Authentication), EPIC021 (User Onboarding)
> Tasks: TASK157–TASK173

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-49** | ✅ | User Management Code Refactoring (TASK-045) | TASK157, TASK158 |
| **ONEK-50** | ✅ | RBAC Middleware Implementation (TASK-046) | TASK161, US084 |
| **ONEK-51** | ✅ | User Profile UI Implementation (TASK-047) | TASK165, TASK166, US086 |
| **ONEK-52** | ✅ | (User Management completion) | EPIC020 |
| **ONEK-53** | ✅ | Create client-side auth utilities | TASK157, TASK158 |
| **ONEK-54** | ✅ | (Auth integration) | EPIC020 |
| **ONEK-203** | ✅ | [Bug] /api/users/me endpoint returns 403 Forbidden | TASK161 |
| **ONEK-212** | ✅ | [Epic] ISO Agent Onboarding Experience | EPIC021 |
| **ONEK-213** | ✅ | [Bug] Fix role enum mismatch in Clerk webhook | TASK160 |
| **ONEK-214** | ✅ | [Bug] Add onboarding routes to middleware public routes | TASK157 |
| **ONEK-215** | ✅ | [Database] Onboarding migration — enum, columns, tables | TASK165 |
| **ONEK-216** | ✅ | [Enhancement] TypeScript database types + Zod validation schema | TASK166 |
| **ONEK-217** | ✅ | [Enhancement] Employment commission contract PDF template + generator | TASK171 |
| **ONEK-218** | ✅ | [Enhancement] Onboarding API routes — atomic submit, status, contract token, signing | TASK165, TASK166, TASK167 |
| **ONEK-219** | ✅ | [Frontend] Onboarding multi-step form page | TASK168, TASK169, US087 |
| **ONEK-220** | ✅ | [Frontend] Public contract review and signature page | TASK170, US088 |
| **ONEK-221** | ✅ | [Enhancement] Home page onboarding guard + sign-in success banner | TASK172, US089 |
| **ONEK-222** | ✅ | [Test] Comprehensive unit + integration tests for onboarding flow | TASK173 (tests) |

---

### F010 - Multi-Agent System Infrastructure (CRITICAL)

> Plan: `.claude/plans/features/F010-multi-agent-infrastructure.md`
> Epics: EPIC022 (Agent Core), EPIC023 (Agent Coordination), EPIC024 (MCP Server Infrastructure)
> Tasks: TASK174–TASK198

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-72** | ✅ | stdio Process Spawning for MCP Server Connection | TASK191, TASK192 |
| **ONEK-73** | ✅ | GPT-4o Tool Calling with MCP Integration | TASK174, TASK175 |
| **ONEK-74** | ✅ | Chat Interface Real API Integration | TASK174 |
| **ONEK-78** | ✅ | ONEK-72.1: Create MCPServerManager Singleton | TASK191 |
| **ONEK-79** | ✅ | ONEK-72.2: Implement stdio Transport Connection in API Route | TASK192 |
| **ONEK-80** | ✅ | ONEK-72.3: Add Health Check Endpoint for MCP Server Status | TASK193, US100 |
| **ONEK-81** | ✅ | ONEK-73.1: Implement executeTool() Function for MCP Tool Invocation | TASK175 |
| **ONEK-82** | ✅ | ONEK-73.2: Add Retry Logic and Error Handling for Tool Execution | TASK176, TASK177 |
| **ONEK-83** | ✅ | ONEK-73.3: Integrate Tool Execution into OpenAI Streaming Loop | TASK175 |
| **ONEK-55** | 📌 | Convert MCP servers to hosted HTTP+SSE transport | TASK192 (enhancement) |
| **ONEK-115** | ✅ | Replace in-memory session store with Supabase | TASK182, TASK183 |
| **ONEK-131** | 🔁 | Establish V0 project upstream sync workflow | — (ops) |
| **ONEK-137** | ✅ | Connect Chat Interface to Multi-Agent System | TASK174, TASK175 |
| **ONEK-143** | ✅ | Enhance Agent System Prompts with Chat Messaging & Booking Tools | TASK174, TASK175 |
| **ONEK-184** | ✅ | Implement Working Memory for Cross-Turn Trip/Entity Retention | TASK183 |
| **ONEK-242** | ✅ | Add proposal→contract→payment→deal closure workflow to JetvisionAgent system prompt | TASK174 |

**Migrated DES → ONEK Agent Infrastructure Issues:**

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-6** | ✅ | [Migrated] SubAgent:Coder — MCP Base Server Infrastructure | TASK191 |
| **ONEK-10** | ✅ | [Migrated] SubAgent:Coder — Avinode MCP Server | TASK191 |
| **ONEK-11** | ✅ | [Migrated] SubAgent:Coder — Gmail MCP Server | TASK194 |
| **ONEK-12** | ✅ | [Migrated] SubAgent:Coder — Google Sheets MCP Server | TASK195 |
| **ONEK-22** | ✅ | [Migrated] SubAgent:Coder — RFP Orchestrator Agent | TASK174 |
| **ONEK-23** | ✅ | [Migrated] SubAgent:Coder — API Client & Data Fetching | TASK175 |
| **ONEK-24** | ✅ | [Migrated] SubAgent:Coder — Client Data Manager Agent | TASK175 |
| **ONEK-25** | ✅ | [Migrated] SubAgent:Coder — Flight Search Agent | TASK175 |
| **ONEK-26** | ✅ | [Migrated] SubAgent:Coder — Proposal Analysis Agent | TASK175 |
| **ONEK-27** | ✅ | [Migrated] SubAgent:Coder — Communication Manager Agent | TASK175 |
| **ONEK-28** | ✅ | [Migrated] SubAgent:Coder — Error Monitor Agent | TASK176 |
| **ONEK-32** | ✅ | [Migrated] SubAgent:Coder — Agent Tools & Guardrails | TASK176, TASK177 |

---

### F011 - Design System & UI Framework (HIGH)

> Plan: `.claude/plans/features/F011-design-system.md`
> Epics: EPIC025 (Design Tokens & Theme), EPIC026 (Base UI Components), EPIC027 (Accessibility & Responsive)
> Tasks: TASK199–TASK217

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-122** | ✅ | Create Tailwind Configuration with Design System Tokens | TASK199, TASK205, US106 |
| **ONEK-123** | ✅ | Update CSS Variables & Theme for Tailwind Integration | TASK200, TASK201, US103 |
| **ONEK-124** | ✅ | Create Token-to-Tailwind Bridge Utilities | TASK205 |
| **ONEK-125** | ✅ | Update Core UI Components (Atoms) with Design System Tokens | TASK206, TASK207, US107 |
| **ONEK-126** | ✅ | Update Composite UI Components (Molecules/Organisms) | TASK208, TASK209, US108 |
| **ONEK-127** | ✅ | Add Component Tests for Design System Integration | TASK206 (tests) |
| **ONEK-128** | ✅ | Update Design System Documentation with Tailwind Integration Guide | TASK205 (docs) |
| **ONEK-265** | ✅ | Design System Token Migration: Replace ~1,140 hardcoded colors | EPIC025 |
| **ONEK-266** | 📋 | Epic 0: Extend Design System Tokens (Foundation) | EPIC025 (extension) |
| **ONEK-267** | 📋 | Epic 1: Fix UI Primitives (~10 instances) | EPIC026 |
| **ONEK-268** | 📋 | Epic 2: Migrate Chat Core (~80 instances) | EPIC026 (cross-ref F001) |
| **ONEK-269** | 📋 | Epic 3: Migrate Flight Workflow Components (~130 instances) | EPIC026 (cross-ref F002) |
| **ONEK-270** | 📋 | Epic 4: Migrate Avinode & Quote Components (~90 instances) | EPIC026 (cross-ref F006) |
| **ONEK-271** | 📋 | Epic 5: Migrate Proposal & Contract Components (~45 instances) | EPIC026 (cross-ref F004) |
| **ONEK-272** | 📋 | Epic 6: Migrate Conversation Starters & Landing (~85 instances) | EPIC026 (cross-ref F001) |
| **ONEK-273** | 📋 | Epic 7: Migrate Message Components & Supporting UI (~80 instances) | EPIC026 (cross-ref F001) |
| **ONEK-274** | 📋 | Epic 8: Migrate Remaining Active Components (~35 instances) | EPIC026 |
| **ONEK-180** | ❌ | [CRITICAL] Fix Color Contrast for WCAG AA Compliance | EPIC027, US111 (canceled) |
| **ONEK-181** | ❌ | [CRITICAL] Implement Accessibility Labels and ARIA Attributes | EPIC027, US112 (canceled) |
| **ONEK-205** | ✅ | Mobile responsive modals with iOS-style bottom sheet drawers | TASK215, US114 |
| **ONEK-226** | ✅ | [Bug] Input component missing forwardRef breaks react-hook-form | TASK206 |

---

### F012 - Real-Time Notifications & Events (HIGH)

> Plan: `.claude/plans/features/F012-realtime-notifications.md`
> Epics: EPIC028 (Webhook Subscription), EPIC029 (Notification Display)
> Tasks: TASK218–TASK229

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-173** | 🔄 | Refactor notifications to be agent-mediated instead of UI-direct | EPIC029, US119–US122 |
| **ONEK-119** | ✅ | Implement Real-time Webhook-to-Frontend Bridge for Avinode Events | EPIC028, TASK218–TASK223 |

---

### F013 - Chat Session Management (HIGH)

> Plan: `.claude/plans/features/F013-chat-session-management.md`
> Epics: EPIC030 (Session CRUD), EPIC031 (Sidebar Navigation)
> Tasks: TASK230–TASK245

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-115** | ✅ | Replace in-memory session store with Supabase | TASK230, TASK231, US123 |
| **ONEK-199** | ✅ | [Bug] Sidebar status stuck on "Pending" after proposals sent | TASK237, US127 |
| **ONEK-204** | ✅ | [Perf] App eagerly loads messages for ALL sessions on page load | TASK230 (perf fix) |
| **ONEK-255** | ✅ | Fix Chat Session Load Performance (~7s → ~1.5s) | TASK230, TASK237 |
| **ONEK-256** | ✅ | [Bug] Sidebar badges show placeholder data until card clicked | TASK237, TASK238 |
| **ONEK-257** | ✅ | [Feature] Offline Payment Confirmation → Auto-Archive + Archive Tab | EPIC030 (cross-ref F005) |
| **ONEK-258** | ✅ | [Epic] Backend: Archive API Fix + Auto-Archive After Payment | TASK233, TASK234 |
| **ONEK-259** | ✅ | [Epic] Frontend: Sidebar Archive Tab + Read-Only Archived View | TASK240, TASK241 |
| **ONEK-260** | ✅ | Fix PATCH archive handler to update session_status in database | TASK233 |
| **ONEK-261** | ✅ | Auto-archive chat session after payment confirmation succeeds | TASK234 |
| **ONEK-262** | ✅ | Add Active/Archive tab UI to chat sidebar | TASK240, US127 |
| **ONEK-263** | ✅ | Load archived sessions on demand in page.tsx | TASK241 |
| **ONEK-264** | ✅ | Display archived chat sessions in read-only mode | TASK242, US128 |
| **ONEK-275** | ✅ | [Bug] ONEK-256 follow-up: incomplete fallback mappings + missing unit tests | TASK238 |

---

### F014 - Analytics & Monitoring (MEDIUM)

> Plan: `.claude/plans/features/F014-analytics-monitoring.md`
> Epics: EPIC032 (Health & Monitoring), EPIC033 (Analytics Dashboard)
> Tasks: TASK246–TASK253

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-91** | ✅ | Performance Optimization - Next.js Build & Bundle Size | TASK249, TASK250 |
| **ONEK-249** | ✅ | [Perf] Optimize flight request card → chat session loading | TASK249, TASK250 |
| **ONEK-250** | ✅ | [Perf] Phase 1: Skeleton loading UI with react-loading-skeleton | TASK250 |
| **ONEK-251** | ✅ | [Perf] Phase 2: Fix wasteful all-requests message fetch | TASK250, TASK251 |
| **ONEK-252** | ✅ | [Perf] Phase 3: Parallelize sequential data loading | TASK250 |
| **ONEK-253** | ✅ | [Perf] Phase 4: Fix N+1 query in getOperatorThreads | TASK251 |
| **ONEK-254** | ✅ | [Perf] Phase 5: Direct Avinode trip endpoint (eliminate SSE parsing) | TASK252 |

---

### F015 - Testing & Quality Assurance (HIGH)

> Plan: `.claude/plans/features/F015-testing-quality.md`
> Epics: EPIC034 (Test Infrastructure), EPIC035 (Code Review & CI/CD)
> Tasks: TASK254–TASK265

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-89** | ✅ | CI Test Environment Setup | TASK254, TASK260 |
| **ONEK-90** | ✅ | Test Coverage Improvements | TASK259 |
| **ONEK-103** | ✅ | E2E Chat Workflow Testing | TASK258 |
| **ONEK-104** | ✅ | Mobile Responsiveness Testing | TASK258 (mobile) |
| **ONEK-105** | ✅ | Accessibility Audit | TASK258 (a11y) |
| **ONEK-106** | ✅ | Performance Testing | TASK258 (perf) |
| **ONEK-142** | 📋 | E2E Workflow Testing - Full Flight Booking Flow | TASK258 |
| **ONEK-189** | ✅ | Fix pre-existing unit test failures across 7 test files | TASK254 |
| **ONEK-276** | ✅ | [Test] Add unit tests for workflow stage mapping functions | TASK254, TASK256 |

---

## Cross-Cutting / Operations Issues

> These issues span multiple features or are operational/maintenance tasks.

### Migrated DES Foundation Issues (ONEK-1 to ONEK-48)

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-1** | 🔁 | [TASK-001] Dashboard Page Structure and Routing | — (deprecated) |
| **ONEK-2** | 🔁 | [TASK-002] Responsive Prompt Card Grid System | — (deprecated) |
| **ONEK-3** | 🔁 | [TASK-003] Expandable Drawer Component | — (deprecated) |
| **ONEK-4** | 🔁 | [TASK-004] State Management Integration | — (deprecated) |
| **ONEK-5** | 🔁 | [Migrated] Settings View Redesign & Enhancement | — (deprecated) |
| **ONEK-8** | ✅ | [Migrated] SubAgent:Tester — Testing Infrastructure Setup | TASK254 |
| **ONEK-9** | ✅ | [Migrated] SubAgent:Designer — UI/UX Design System | EPIC025 |
| **ONEK-14** | ✅ | [Migrated] SubAgent:Ops — Sentry Integration | TASK253 |
| **ONEK-16** | ✅ | [Migrated] SubAgent:Ops — CI/CD Pipeline | TASK260, TASK265 |
| **ONEK-17** | ✅ | [Migrated] SubAgent:Ops — Production Environment | TASK265 |
| **ONEK-18** | ❌ | [Migrated] SubAgent:Reviewer — Code Review Standards | — (canceled) |
| **ONEK-19** | ✅ | [Migrated] SubAgent:Tester — E2E Tests | TASK258 |
| **ONEK-20** | ✅ | [Migrated] SubAgent:Tester — Integration Tests | TASK257 |
| **ONEK-21** | ✅ | [Migrated] SubAgent:Tester — Unit Tests | TASK254, TASK255 |
| **ONEK-29** | ✅ | [Migrated] SubAgent:Coder — Supabase Realtime | TASK218 |
| **ONEK-30** | ✅ | [Migrated] SubAgent:Coder — Dashboard Pages | — (deprecated) |
| **ONEK-33** | ✅ | [Migrated] SubAgent:Coder — Environment Configuration | TASK260 |
| **ONEK-34** | ✅ | [Migrated] SubAgent:Coder — Clerk Auth Integration | TASK157 |
| **ONEK-35** | ✅ | [Migrated] SubAgent:Coder — Database Schema & RLS | TASK165 |
| **ONEK-36** | ✅ | [Migrated] SubAgent:Coder — Redis & BullMQ | TASK182 |
| **ONEK-37** | ✅ | [Migrated] SubAgent:Coder — Supabase Client | TASK230 |
| **ONEK-38** | ✅ | [Migrated] SubAgent:Coder — First API Route | TASK174 |
| **ONEK-39** | ✅ | [Migrated] SubAgent:Coder — Fix TypeScript & Vitest Blockers | TASK254 |
| **ONEK-40** | ✅ | [Migrated] SubAgent:Ops — Redis Setup & BullMQ Queue | TASK182 |
| **ONEK-41** | ✅ | [Migrated] SubAgent:Planner — Week 2-3 MCP & Agent Planning | — (planning) |
| **ONEK-42** | ✅ | [Migrated] SubAgent:Coder — Agent Integration Tests | TASK257 |
| **ONEK-43** | ✅ | [Migrated] SubAgent:Coder — MCP Server Integration Tests | TASK257 |
| **ONEK-44** | ✅ | [Migrated] SubAgent:Ops — Staging Deployment | TASK265 |
| **ONEK-45** | ✅ | [Migrated] SubAgent:Tester — QA & Test Coverage | TASK259 |
| **ONEK-46** | ✅ | [Migrated] SubAgent:Reviewer — PR Review | TASK260, TASK261 |
| **ONEK-47** | ✅ | [Migrated] SubAgent:Planner — Week 1 Foundation Planning | — (planning) |
| **ONEK-48** | ✅ | [Migrated] SubAgent:Coder — E2E RFP Workflow Test | TASK258 |
| **ONEK-7** | 🔁 | [Migrated] SubAgent:Coder — Email Template Editor (TASK-030) | — (duplicate) |
| **ONEK-13** | 🔁 | [Migrated] SubAgent:Planner — API Documentation (TASK-036) | — (duplicate) |
| **ONEK-15** | 🔁 | [Migrated] SubAgent:Ops — Staging Environment (TASK-034) | — (duplicate) |

### PR Reviews & Project Ops

| Linear Issue | Status | Title | Plan Item(s) |
|-------------|--------|-------|-------------|
| **ONEK-57** | ✅ | (Build/deployment) | — (ops) |
| **ONEK-58** | ✅ | (Build/deployment) | — (ops) |
| **ONEK-59** | ✅ | Project Directory Cleanup | — (maintenance) |
| **ONEK-60** | ✅ | (Project maintenance) | — (ops) |
| **ONEK-61** | ✅ | (Project maintenance) | — (ops) |
| **ONEK-62** | ✅ | (Project maintenance) | — (ops) |
| **ONEK-63** | ✅ | (Project maintenance) | — (ops) |
| **ONEK-64** | ✅ | PR #22 Review | — (PR review) |
| **ONEK-65** | ✅ | PR #11 Review | — (PR review) |
| **ONEK-66** | ✅ | PR #8 Review | — (PR review) |
| **ONEK-67** | ❌ | PR #7 Review | — (canceled) |
| **ONEK-68** | ✅ | PR #6 Review | — (PR review) |
| **ONEK-69** | 🔁 | PR #2: Resolve merge conflicts in Linear-Git sync | — (duplicate) |

### Canceled/Deprecated Issues

| Linear Issue | Status | Title | Reason |
|-------------|--------|-------|--------|
| **ONEK-179** | ❌ | [CRITICAL] Resolve Duplicate RFP Forms | Superseded by chat-only design |
| **ONEK-182** | ❌ | [CRITICAL] Remove Dashboard Interface | Dashboard already removed |
| **ONEK-183** | ❌ | [CRITICAL] Remove Duplicate RFP Form | RFP form already removed |
| **ONEK-107** | 🔁 | Archive Dashboard Pages | Superseded |
| **ONEK-108** | 🔁 | Routing Updates for Unified Chat | Superseded by ONEK-101 |
| **ONEK-109** | 🔁 | Remove Dashboard Navigation Components | Superseded |
| **ONEK-110** | 🔁 | E2E Chat Workflow Testing | Superseded by ONEK-103 |
| **ONEK-111** | 🔁 | Mobile Responsiveness for Chat Interface | Superseded by ONEK-104 |
| **ONEK-112** | 🔁 | Accessibility Audit and Compliance | Superseded by ONEK-105 |
| **ONEK-113** | 🔁 | Performance Optimization for Chat Interface | Superseded by ONEK-106 |
| **ONEK-114** | 🔁 | Documentation Update for Unified Chat Architecture | Superseded |

---

## Unmapped Plan Items

> Plan items without a direct Linear issue counterpart.

### Tasks Without Linear Issues

These tasks exist in the plan hierarchy but were implemented without dedicated Linear tracking:

| Plan Item | Title | Feature | Status |
|-----------|-------|---------|--------|
| TASK041–TASK048 | Request submission UI (confirm, airport, pax, date) | F002 | Implemented |
| TASK051–TASK055 | Trip creation UI (loading, deep link, copy ID) | F002 | Implemented |
| TASK056–TASK062 | Request lifecycle (stage badge, progress, filter) | F002 | Implemented |
| TASK063–TASK070 | Quote webhooks (process, display, badge) | F003 | Implemented |
| TASK071–TASK076 | Quote comparison (side-by-side, sort, list) | F003 | Partial |
| TASK077–TASK086 | Proposal generation (API, PDF, margin, upload) | F004 | Implemented |
| TASK087–TASK097 | Proposal delivery (customer, email, Gmail search) | F004 | Partial |
| TASK098–TASK105 | Contract generation (API, PDF, signing, details) | F005 | Implemented |
| TASK106–TASK112 | Payment & deal closure (modal, API, confirmation) | F005 | Implemented |
| TASK113–TASK117 | Deep link workflow (button, prompt, status) | F006 | Implemented |
| TASK118–TASK124 | Webhook processing (validate, store, dedup) | F006 | Implemented |
| TASK125–TASK132 | Operator messaging (thread, compose, badges) | F006 | Implemented |
| TASK133–TASK139 | Client profiles (create, search, select) | F007 | Implemented |
| TASK140–TASK144 | Operator management (profile, upsert) | F007 | Implemented |
| TASK145–TASK148 | Email sending (MCP, proposal, quote) | F008 | Implemented |
| TASK149–TASK156 | Email approval (preview, approve, reply) | F008 | Partial |
| TASK157–TASK164 | Authentication (Clerk, middleware, RBAC) | F009 | Implemented |
| TASK165–TASK173 | Onboarding (registration, profile, avatar) | F009 | Implemented |
| TASK174–TASK181 | Agent core (factory, registry, metrics) | F010 | Implemented |
| TASK182–TASK190 | Agent coordination (bus, handoff, state) | F010 | Implemented |
| TASK191–TASK198 | MCP servers (Avinode, Gmail, fixtures) | F010 | Implemented |
| TASK199–TASK205 | Design tokens (brand, CSS vars, Tailwind) | F011 | Implemented |
| TASK206–TASK211 | Base UI components (button, input, data) | F011 | Implemented |
| TASK212–TASK217 | Accessibility & responsive (focus, mobile) | F011 | Partial |
| TASK218–TASK223 | Webhook subscription (realtime, reconnect) | F012 | Implemented |
| TASK224–TASK229 | Notification display (toast, dedup) | F012 | Implemented |
| TASK230–TASK236 | Session CRUD (create, archive, link) | F013 | Implemented |
| TASK237–TASK245 | Sidebar navigation (list, search, threads) | F013 | Implemented |
| TASK246–TASK248 | Health monitoring (endpoint, circuit breaker) | F014 | Implemented |
| TASK249–TASK253 | Analytics (API, dashboard, Sentry) | F014 | Partial |
| TASK254–TASK259 | Test infrastructure (vitest, coverage) | F015 | Implemented |
| TASK260–TASK265 | Code review & CI/CD (husky, GitHub Actions) | F015 | Implemented |

---

## Dependency Chains

### Critical Path: RFP → Deal Closure

```
ONEK-70 (Conversational RFP)
  ├─> ONEK-84-88 (Entity extraction, clarification, orchestration)
  │     └─> ONEK-130 (RFP Chat Flow - Webhook to Proposal Pipeline)
  │
  ├─> ONEK-144 (Multi-City Trips Epic)
  │     ├─> ONEK-145-149 (User Stories)
  │     └─> ONEK-150-154 (Implementation Tasks)
  │
  └─> ONEK-116 (Avinode Integration Redesign)
        ├─> ONEK-117-121 (Avinode Components)
        ├─> ONEK-129, 132-136 (Workflow UI)
        └─> ONEK-134 (Real-time Quotes)
              │
              v
        ONEK-138 (RFQ Steps 3 & 4)
              │
              v
        ONEK-170 (send_proposal tool)
        ONEK-177 (Service charge config)
        ONEK-178 (Email preview)
              │
              v
        ONEK-224 (Contract email approval) [In Review]
        ONEK-225 (Proposal in contract PDF) [In Review]
              │
              v
        ONEK-229 (Payment Confirmation UI)
        ONEK-230 (Payment API relaxation)
        ONEK-231 (Persist payment messages)
              │
              v
        ONEK-257 (Offline Payment → Closed Won → Auto-Archive)
        ONEK-258-264 (Archive implementation)
```

### Design System Migration Path

```
ONEK-122-128 (Initial Design Token Setup) [Done]
  │
  v
ONEK-265 (Token Migration: ~1,140 hardcoded colors) [Done]
  │
  v
ONEK-266 (Epic 0: Extend Tokens Foundation) [Backlog]
  ├─> ONEK-267 (Epic 1: UI Primitives ~10) [Backlog]
  ├─> ONEK-268 (Epic 2: Chat Core ~80) [Backlog]
  ├─> ONEK-269 (Epic 3: Flight Workflow ~130) [Backlog]
  ├─> ONEK-270 (Epic 4: Avinode & Quote ~90) [Backlog]
  ├─> ONEK-271 (Epic 5: Proposal & Contract ~45) [Backlog]
  ├─> ONEK-272 (Epic 6: Conversation Starters ~85) [Backlog]
  ├─> ONEK-273 (Epic 7: Message Components ~80) [Backlog]
  └─> ONEK-274 (Epic 8: Remaining ~35) [Backlog]
```

### Onboarding Flow

```
ONEK-212 (ISO Agent Onboarding Epic) [Done]
  ├─> ONEK-213 (Fix role enum mismatch) [Done]
  ├─> ONEK-214 (Add onboarding routes to middleware) [Done]
  ├─> ONEK-215 (Database migration) [Done]
  ├─> ONEK-216 (TypeScript types + Zod) [Done]
  ├─> ONEK-217 (Employment contract PDF) [Done]
  ├─> ONEK-218 (API routes) [Done]
  ├─> ONEK-219 (Multi-step form page) [Done]
  ├─> ONEK-220 (Contract review page) [Done]
  ├─> ONEK-221 (Home page guard + banner) [Done]
  └─> ONEK-222 (Comprehensive tests) [Done]
```

---

## Open Work Items

### In Progress

| Linear Issue | Title | Feature | Plan Item(s) |
|-------------|-------|---------|-------------|
| **ONEK-173** | Refactor notifications to be agent-mediated | F012 | EPIC029 |

### In Review

| Linear Issue | Title | Feature | Plan Item(s) |
|-------------|-------|---------|-------------|
| **ONEK-224** | Email preview/approval step in Book Flight workflow | F005/F008 | TASK098, US078 |
| **ONEK-225** | Include proposal as first page of trip contract PDF | F005 | TASK099, US050 |
| **ONEK-289** | Pricing on Proposal | F004 | TASK079 |
| **ONEK-290** | Send Email Function Not Working | F008 | TASK145 |

### Backlog

| Linear Issue | Title | Feature | Plan Item(s) |
|-------------|-------|---------|-------------|
| **ONEK-142** | E2E Workflow Testing - Full Flight Booking Flow | F015 | TASK258 |
| **ONEK-202** | [Gap] No frontend UI for empty leg watch | F002 | US023, US024 |
| **ONEK-228** | Reconcile TripCreatedUI and FlightSearchProgress | F002 | TASK019 |
| **ONEK-232** | Customer Reply Detection via Gmail Polling | F008 | TASK155 |
| **ONEK-233** | Gate Book Flight Button on Customer Reply Status | F005 | TASK098 |
| **ONEK-234** | Add Wire Transfer Payment Instructions to Contract PDF | F005 | TASK099 |
| **ONEK-235** | Upgrade RfqResultsUI to match Step 3 style | F003 | TASK071 |
| **ONEK-239** | Populate proposalSentAt in timeline | F005 | TASK112 |
| **ONEK-240** | Create seed data for payment flow E2E testing | F005 | TASK112 |
| **ONEK-241** | Fix demo page scroll overflow | F011 | — |
| **ONEK-246** | Unit tests for saveMessage payment content types | F005 | TASK109 |
| **ONEK-247** | Component tests for PaymentConfirmationModal | F005 | TASK106 |
| **ONEK-248** | Component tests for PaymentConfirmedCard + ClosedWonConfirmation | F005 | TASK112 |
| **ONEK-266** | Epic 0: Extend Design System Tokens | F011 | EPIC025 |
| **ONEK-267–274** | Epics 1-8: Design System Token Migration | F011 | EPIC026 |
| **ONEK-277** | Enhance PDF Proposal with Aircraft Images | F004 | TASK082 |
| **ONEK-278–288** | Proposal branding & aircraft imagery epics/stories | F004/F011 | EPIC009 |

### Todo

| Linear Issue | Title | Feature | Plan Item(s) |
|-------------|-------|---------|-------------|
| **ONEK-55** | Convert MCP servers to hosted HTTP+SSE transport | F010 | TASK192 |

---

## Quick Reference

### Linear CLI Commands

**List all ONEK issues**:
```bash
linear issue list --team ONEK --all-states --all-assignees --limit 0
```

**View specific issue**:
```bash
linear issue view ONEK-173
```

**Filter by state**:
```bash
linear issue list --team ONEK --state backlog --limit 0
linear issue list --team ONEK --state started --limit 0
```

### Plan File Locations

- **Features**: `.claude/plans/features/F001-F015`
- **Epics**: `.claude/plans/epics/EPIC001-EPIC035`
- **User Stories**: `.claude/plans/user-stories/US001-US147`
- **Tasks**: `.claude/plans/tasks/TASK001-TASK265`
- **Index**: `.claude/plans/INDEX.md`

### Cross-Reference Format

Each Linear issue maps to plan items using this convention:
- **Feature**: `F001` through `F015`
- **Epic**: `EPIC001` through `EPIC035`
- **User Story**: `US001` through `US147`
- **Task**: `TASK001` through `TASK265`

---

**Document Version**: 1.0
**Last Updated**: February 16, 2026
**Maintained By**: Development Team
**Linear Team**: One Kaleidoscope (ONEK)
