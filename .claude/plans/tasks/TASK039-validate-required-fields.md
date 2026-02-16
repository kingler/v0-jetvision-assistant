# Task ID: TASK039
# Task Name: Validate required fields before trip creation
# Parent User Story: [[US016-submit-flight-request-via-chat|US016 - Submit a flight request via chat]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Ensure that all required flight request fields (departure airport, arrival airport, date, passenger count) are validated before calling the create_trip MCP tool. The system prompt instructs the LLM to check for completeness and ask the user for any missing information before proceeding with trip creation.

## Acceptance Criteria
- Departure airport is required and must resolve to a valid ICAO code
- Arrival airport is required and must resolve to a valid ICAO code
- Date is required and must be a future date
- Passenger count is required and must be a positive integer (1-19 typical range)
- Agent asks clarifying questions for any missing or invalid fields
- Agent does not call create_trip until all required fields are present
- Time defaults to a reasonable value if not specified (documented in prompt)

## Implementation Details
- **File(s)**: `lib/prompts/jetvision-system-prompt.ts`
- **Approach**: The system prompt includes validation rules and instructions for the LLM to enforce before invoking the create_trip tool. The LLM checks each required field and generates follow-up questions for missing data. Validation logic is declarative within the prompt rather than imperative code, leveraging the model's reasoning to handle edge cases.

## Dependencies
- [[TASK038-parse-flight-request-nlp|TASK038]] (parse-flight-request-nlp) - Parsing must happen before validation
