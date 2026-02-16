# Jetvision AI Assistant - Feature Decomposition Index

> Reverse-engineered from codebase on 2026-02-16
> Complete hierarchy: Features > Epics > User Stories (with AC) > Tasks

## Summary Statistics

| Level | Count | Directory |
|-------|-------|-----------|
| **Features** | 15 | `.claude/plans/features/` |
| **Epics** | 35 | `.claude/plans/epics/` |
| **User Stories** | 147 | `.claude/plans/user-stories/` |
| **Tasks** | 265 | `.claude/plans/tasks/` |

---

## Feature Map

### [[F001-ai-chat-assistant|F001 - AI Chat Assistant Interface]] (CRITICAL)
> Natural language AI assistant for charter flight brokers

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC001-chat-interface-core|EPIC001 - Chat Interface Core]] | [[US001-send-message-to-ai|US001]]-[[US005-handle-chat-errors|US005]] | [[TASK001-implement-chat-input|TASK001]]-[[TASK014-display-error-retry|TASK014]] |
| [[EPIC002-streaming-realtime|EPIC002 - Streaming & Real-time]] | [[US006-see-ai-typing-realtime|US006]]-[[US009-handle-streaming-errors|US009]] | [[TASK015-implement-sse-parser|TASK015]]-[[TASK024-preserve-partial-content|TASK024]] |
| [[EPIC003-rich-message-components|EPIC003 - Rich Message Components]] | [[US010-view-quote-card-in-chat|US010]]-[[US015-view-pipeline-dashboard|US015]] | [[TASK025-implement-quote-card|TASK025]]-[[TASK037-implement-hot-opportunities|TASK037]] |

### [[F002-flight-request-management|F002 - Flight Request Management]] (CRITICAL)
> End-to-end RFP/RFQ lifecycle with 10-stage workflow

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC004-request-submission|EPIC004 - Request Submission]] | [[US016-submit-flight-request-via-chat|US016]]-[[US020-view-request-confirmation|US020]] | [[TASK038-parse-flight-request-nlp|TASK038]]-[[TASK048-display-request-confirmation|TASK048]] |
| [[EPIC005-trip-creation-deep-links|EPIC005 - Trip Creation & Deep Links]] | [[US021-create-trip-see-deep-link|US021]]-[[US024-copy-trip-id|US024]] | [[TASK049-create-trip-get-deep-link|TASK049]]-[[TASK055-copy-trip-id-clipboard|TASK055]] |
| [[EPIC006-request-lifecycle|EPIC006 - Request Lifecycle]] | [[US025-view-request-stage-badge|US025]]-[[US029-filter-requests-by-status|US029]] | [[TASK056-implement-stage-badge|TASK056]]-[[TASK062-filter-requests-status|TASK062]] |

### [[F003-quote-management|F003 - Quote Management]] (CRITICAL)
> Receive, display, compare, and select operator quotes

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC007-quote-reception-display|EPIC007 - Quote Reception & Display]] | [[US030-receive-realtime-quote-notification|US030]]-[[US034-see-quote-status-badge|US034]] | [[TASK063-process-quote-webhook|TASK063]]-[[TASK070-implement-quote-status-badge|TASK070]] |
| [[EPIC008-quote-comparison-selection|EPIC008 - Quote Comparison & Selection]] | [[US035-compare-quotes-side-by-side|US035]]-[[US038-view-all-quotes-for-request|US038]] | [[TASK071-implement-quote-comparison|TASK071]]-[[TASK076-list-quotes-for-request|TASK076]] |

### [[F004-proposal-generation|F004 - Proposal Generation & Delivery]] (CRITICAL)
> PDF proposals with margin control and email approval

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC009-proposal-generation|EPIC009 - Proposal Generation]] | [[US039-generate-proposal-from-quote|US039]]-[[US043-upload-proposal-pdf|US043]] | [[TASK077-proposal-generation-api|TASK077]]-[[TASK086-store-pdf-url|TASK086]] |
| [[EPIC010-proposal-delivery|EPIC010 - Proposal Delivery]] | [[US044-select-customer-for-proposal|US044]]-[[US048-check-customer-reply|US048]] | [[TASK087-customer-selection-dialog|TASK087]]-[[TASK097-search-gmail-mcp|TASK097]] |

### [[F005-contract-payment|F005 - Contract & Payment Management]] (CRITICAL)
> Contract generation, signing, payment, and deal closure

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC011-contract-generation|EPIC011 - Contract Generation]] | [[US049-generate-contract|US049]]-[[US052-view-contract-details|US052]] | [[TASK098-contract-generation-api|TASK098]]-[[TASK105-contract-details-view|TASK105]] |
| [[EPIC012-payment-deal-closure|EPIC012 - Payment & Deal Closure]] | [[US053-confirm-payment|US053]]-[[US056-view-closed-won-confirmation|US056]] | [[TASK106-payment-confirmation-modal|TASK106]]-[[TASK112-closed-won-confirmation|TASK112]] |

### [[F006-avinode-marketplace-integration|F006 - Avinode Marketplace Integration]] (CRITICAL)
> Deep link workflow, webhooks, and operator messaging

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC013-deep-link-workflow|EPIC013 - Deep Link Workflow]] | [[US057-open-avinode-via-deep-link|US057]]-[[US059-view-deep-link-prompt|US059]] | [[TASK113-render-deep-link-button|TASK113]]-[[TASK117-deep-link-prompt|TASK117]] |
| [[EPIC014-webhook-processing|EPIC014 - Webhook Processing]] | [[US060-process-quote-webhook|US060]]-[[US063-handle-webhook-deduplication|US063]] | [[TASK118-validate-webhook-payload|TASK118]]-[[TASK124-deduplication-logic|TASK124]] |
| [[EPIC015-operator-messaging|EPIC015 - Operator Messaging]] | [[US064-view-operator-message-thread|US064]]-[[US067-view-unread-message-count|US067]] | [[TASK125-operator-message-thread|TASK125]]-[[TASK132-display-unread-badges|TASK132]] |

### [[F007-crm-client-management|F007 - CRM / Client Management]] (HIGH)
> Client profiles and operator relationships

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC016-client-profiles|EPIC016 - Client Profiles]] | [[US068-create-client-profile|US068]]-[[US071-select-client-for-proposal|US071]] | [[TASK133-create-client-mcp|TASK133]]-[[TASK139-populate-proposal-client|TASK139]] |
| [[EPIC017-operator-management|EPIC017 - Operator Management]] | [[US072-view-operator-profile|US072]]-[[US074-auto-create-operator-from-webhook|US074]] | [[TASK140-get-operator-mcp|TASK140]]-[[TASK144-upsert-operator-profile|TASK144]] |

### [[F008-email-communication|F008 - Email Communication]] (HIGH)
> Gmail MCP integration with approval workflow

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC018-email-sending|EPIC018 - Email Sending]] | [[US075-send-general-email|US075]]-[[US077-send-quote-summary-email|US077]] | [[TASK145-send-email-mcp|TASK145]]-[[TASK148-send-quote-email|TASK148]] |
| [[EPIC019-email-approval-workflow|EPIC019 - Email Approval Workflow]] | [[US078-preview-email-before-sending|US078]]-[[US081-check-inbox-for-replies|US081]] | [[TASK149-generate-email-preview|TASK149]]-[[TASK156-display-reply-summary|TASK156]] |

### [[F009-authentication-onboarding|F009 - Authentication & Onboarding]] (CRITICAL)
> Clerk auth, user sync, and onboarding flow

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC020-authentication|EPIC020 - Authentication]] | [[US082-sign-in-with-clerk|US082]]-[[US085-handle-user-deletion|US085]] | [[TASK157-configure-clerk-middleware|TASK157]]-[[TASK164-soft-delete-logic|TASK164]] |
| [[EPIC021-user-onboarding|EPIC021 - User Onboarding]] | [[US086-register-new-user|US086]]-[[US090-upload-avatar|US090]] | [[TASK165-registration-api|TASK165]]-[[TASK173-avatar-upload-api|TASK173]] |

### [[F010-multi-agent-infrastructure|F010 - Multi-Agent System Infrastructure]] (CRITICAL)
> Agent core, coordination, and MCP servers

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC022-agent-core|EPIC022 - Agent Core]] | [[US091-create-agent-via-factory|US091]]-[[US094-track-agent-metrics|US094]] | [[TASK174-agent-factory-singleton|TASK174]]-[[TASK181-expose-metrics-api|TASK181]] |
| [[EPIC023-agent-coordination|EPIC023 - Agent Coordination]] | [[US095-publish-subscribe-messages|US095]]-[[US098-transition-workflow-state|US098]] | [[TASK182-implement-message-bus|TASK182]]-[[TASK190-track-state-history|TASK190]] |
| [[EPIC024-mcp-server-infrastructure|EPIC024 - MCP Server Infrastructure]] | [[US099-connect-avinode-mcp|US099]]-[[US102-fallback-mock-tools|US102]] | [[TASK191-avinode-mcp-server|TASK191]]-[[TASK198-test-data-fixtures|TASK198]] |

### [[F011-design-system|F011 - Design System & UI Framework]] (HIGH)
> Brand colors, typography, motion, accessibility

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC025-design-tokens-theme|EPIC025 - Design Tokens & Theme]] | [[US103-brand-colors-consistent|US103]]-[[US106-design-tokens-tailwind|US106]] | [[TASK199-define-brand-tokens|TASK199]]-[[TASK205-map-tokens-tailwind|TASK205]] |
| [[EPIC026-base-ui-components|EPIC026 - Base UI Components]] | [[US107-button-variants|US107]]-[[US110-data-display-components|US110]] | [[TASK206-button-cva-variants|TASK206]]-[[TASK211-data-display-suite|TASK211]] |
| [[EPIC027-accessibility-responsive|EPIC027 - Accessibility & Responsive]] | [[US111-focus-rings|US111]]-[[US114-responsive-layouts|US114]] | [[TASK212-focus-ring-utility|TASK212]]-[[TASK217-sidebar-collapse|TASK217]] |

### [[F012-realtime-notifications|F012 - Real-Time Notifications & Events]] (HIGH)
> Webhook subscriptions, toast notifications, deduplication

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC028-webhook-subscription|EPIC028 - Webhook Subscription]] | [[US115-subscribe-webhook-by-trip|US115]]-[[US118-handle-connection-status|US118]] | [[TASK218-supabase-realtime-sub|TASK218]]-[[TASK223-auto-reconnect|TASK223]] |
| [[EPIC029-notification-display|EPIC029 - Notification Display]] | [[US119-toast-new-quote|US119]]-[[US122-dedup-notifications|US122]] | [[TASK224-toast-quote-event|TASK224]]-[[TASK229-generate-dedup-keys|TASK229]] |

### [[F013-chat-session-management|F013 - Chat Session Management]] (HIGH)
> Session CRUD, sidebar navigation, persistence

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC030-session-crud|EPIC030 - Session CRUD]] | [[US123-create-new-session|US123]]-[[US126-link-session-to-request|US126]] | [[TASK230-create-session-api|TASK230]]-[[TASK236-persist-session-link|TASK236]] |
| [[EPIC031-sidebar-navigation|EPIC031 - Sidebar Navigation]] | [[US127-view-session-list|US127]]-[[US131-view-operator-threads-per-session|US131]] | [[TASK237-sidebar-session-list|TASK237]]-[[TASK245-thread-summaries|TASK245]] |

### [[F014-analytics-monitoring|F014 - Analytics & Monitoring]] (MEDIUM)
> Health checks, metrics, error tracking

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC032-health-monitoring|EPIC032 - Health & Monitoring]] | [[US132-view-circuit-breaker-status|US132]]-[[US134-run-auth-diagnostics|US134]] | [[TASK246-health-endpoint|TASK246]]-[[TASK248-auth-diagnostics|TASK248]] |
| [[EPIC033-analytics-dashboard|EPIC033 - Analytics Dashboard]] | [[US135-view-analytics-summary|US135]]-[[US137-view-error-reports|US137]] | [[TASK249-analytics-api|TASK249]]-[[TASK253-sentry-integration|TASK253]] |

### [[F015-testing-quality|F015 - Testing & Quality Assurance]] (HIGH)
> Test framework, code review, CI/CD

| Epic | User Stories | Tasks |
|------|-------------|-------|
| [[EPIC034-test-infrastructure|EPIC034 - Test Infrastructure]] | [[US138-run-unit-tests|US138]]-[[US142-generate-coverage-report|US142]] | [[TASK254-configure-vitest-unit|TASK254]]-[[TASK259-coverage-thresholds|TASK259]] |
| [[EPIC035-code-review-cicd|EPIC035 - Code Review & CI/CD]] | [[US143-precommit-validation|US143]]-[[US147-cicd-runs-on-pr|US147]] | [[TASK260-husky-precommit|TASK260]]-[[TASK265-github-actions-ci|TASK265]] |

---

## End-to-End Workflow Coverage

```
User Sign-In (F009)
  |
  v
Chat Interface (F001) --> Conversation Starters
  |
  v
Flight Request via NLP (F002) --> Airport Search, Multi-city, Round-trip
  |
  v
Avinode Trip Creation (F006) --> Deep Link to Marketplace
  |
  v
Operator Selection in Avinode (Manual) --> Send RFP
  |
  v
Webhook Quote Reception (F003/F006) --> Real-time Notifications (F012)
  |
  v
Quote Comparison & Selection (F003)
  |
  v
Proposal Generation with Margin (F004) --> PDF via @react-pdf/renderer
  |
  v
Email Approval Workflow (F008) --> Preview, Approve, Send
  |
  v
Customer Reply Monitoring (F008)
  |
  v
Contract Generation (F005) --> Pricing (base + FET + segment + CC)
  |
  v
Payment Confirmation (F005) --> Deal Closure (closed_won)
  |
  v
Archive Completed Request (F002)
```

---

## Implementation Status

| Status | Features | Epics | Stories | Tasks |
|--------|----------|-------|---------|-------|
| Implemented | 12 | 30 | ~135 | ~250 |
| Partial | 2 | 4 | ~8 | ~11 |
| Planned | 1 | 1 | ~4 | ~4 |

---

## Technical Stack Reference

- **Frontend**: Next.js 14, React, Tailwind CSS, Radix UI, Framer Motion
- **Backend**: Next.js API Routes, OpenAI Agent SDK (GPT-5.2)
- **Database**: Supabase (PostgreSQL + RLS + Realtime)
- **Auth**: Clerk (JWT + Webhooks)
- **Integrations**: Avinode MCP, Gmail MCP, Supabase MCP
- **Queue**: BullMQ + Redis
- **Testing**: Vitest (75% coverage), Playwright (E2E)
- **CI/CD**: GitHub Actions, Husky hooks
