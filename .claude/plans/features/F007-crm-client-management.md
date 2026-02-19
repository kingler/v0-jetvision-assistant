# Feature ID: F007
# Feature Name: CRM Client Management
# Status: Implemented
# Priority: High

## Description
CRM functionality for managing client profiles, operator relationships, and contact information. Provides the data foundation that connects flight requests to specific clients and enables personalized proposal generation with preferred operator matching.

## Business Value
Accurate client and operator data is essential for charter flight brokerage. This feature ensures every flight request is associated with a verified client profile, enables quick lookup of client preferences and history, and maintains a curated list of preferred operators. This reduces manual data entry, prevents duplicate records, and supports personalized client service.

## Key Capabilities
- Client profile CRUD operations (company_name, contact_name, email, phone, preferences)
- Client search and lookup by email address or database ID
- Operator profile management (company name, certifications, fleet details, ratings)
- Preferred operators list per client for prioritized quoting
- Client-to-request association linking flight requests to client profiles
- Customer selection dialog for choosing the correct client when generating proposals
- Client history tracking across multiple flight requests

## Related Epics
- [[EPIC016-client-profiles|EPIC016 - Client Profiles]]
- [[EPIC017-operator-management|EPIC017 - Operator Management]]

## Dependencies
- [[F009-authentication-onboarding|F009 - Authentication and Onboarding (user identity required for data access control)]]

## Technical Components
- Supabase MCP tools: `get_client`, `list_clients`, `create_client`, `update_client`, `get_operator`, `list_preferred_operators`
- `components/customer-selection-dialog.tsx` - UI dialog for selecting clients during proposal generation
- `lib/supabase/` - Supabase client configuration and query helpers
- Supabase tables: `clients`, `operators`, `preferred_operators`, `requests` (client_id foreign key)
- Row Level Security (RLS) policies enforcing data access per authenticated user
