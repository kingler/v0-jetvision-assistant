# Task ID: TASK043
# Task Name: Display multiple airport options when ambiguous
# Parent User Story: [[US017-resolve-city-names-to-airports|US017 - Resolve airport codes from city names]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
When the search_airports tool returns multiple results for an ambiguous city name (e.g., "New York" returns KJFK, KLGA, KEWR), present the options to the user in a clear format and ask them to select the preferred airport.

## Acceptance Criteria
- Agent presents multiple airport options in a numbered or bulleted list
- Each option shows ICAO code, airport name, and city
- Agent asks user to select their preferred airport
- User can respond with the number, ICAO code, or airport name
- After selection, the chosen airport is used for the trip creation
- If only one result is returned, it is auto-selected without prompting

## Implementation Details
- **File(s)**: Agent response handling (system prompt + LLM reasoning)
- **Approach**: The system prompt instructs the LLM on how to handle multiple airport results. When search_airports returns more than one match, the agent formats the results as a selection list and asks the user to choose. The LLM handles the user's response naturally, mapping their selection back to the correct ICAO code for trip creation.

## Dependencies
- [[TASK042-call-search-airports|TASK042]] (call-search-airports) - Requires search_airports results
