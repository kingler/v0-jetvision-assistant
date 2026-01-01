# Complete Avinode RFQ Data Schema

**Last Updated**: December 2024
**API Version**: Avinode Marketplace API v1
**Purpose**: Documents the complete data structure for RFQ (Request for Quote) objects from the Avinode API

---

## Overview

This document provides a comprehensive reference for all data fields available in Avinode RFQ responses. Use this schema when:

- Parsing RFQ responses from the Avinode API
- Building UI components to display RFQ data
- Mapping Avinode data to internal database schemas
- Implementing quote management workflows

---

## Core RFQ Object

The root RFQ object returned from endpoints like `GET /marketplaceapi/arfq/{id}`.

| Field          | Type         | Description                                   | Example                        |
|----------------|--------------|-----------------------------------------------|--------------------------------|
| id             | string       | Internal RFQ ID                               | `arfq-113903111`               |
| tripId         | string       | User-friendly trip ID                         | `7ZSH2S`                        |
| href           | string       | API endpoint for this resource                | `/marketplaceapi/arfq/arfq-123` |
| canceled       | boolean      | Whether buyer cancelled the trip              | `false`                         |
| status         | string       | Current RFQ status                            | `quoted`                        |
| created_at     | ISO datetime | When RFQ was created                          | `2024-12-15T10:30:00Z`          |
| quote_deadline | ISO datetime | Quote submission deadline                     | `2024-12-16T18:00:00Z`          |

### RFQ Status Values

| Status      | Description                                    |
|-------------|------------------------------------------------|
| `pending`   | RFQ sent, awaiting operator response           |
| `quoted`    | At least one quote received                    |
| `declined`  | Operator declined to quote                     |
| `expired`   | Quote deadline passed without response         |
| `cancelled` | Buyer cancelled the trip request               |

---

## Company Information

### Buyer Company (`buyerCompany`)

The company requesting the charter (e.g., Jetvision on behalf of client).

| Field | Type   | Description              | Example                         |
|-------|--------|--------------------------|----------------------------------|
| id    | string | Internal company ID      | `company-abc123`                 |
| name  | string | Company name             | `Jetvision LLC`                  |
| href  | string | Link to company resource | `/marketplaceapi/companies/abc123` |

### Buyer Account (`buyerAccount`)

The user account that created the RFQ.

| Field     | Type   | Description              | Example                          |
|-----------|--------|--------------------------|-----------------------------------|
| id        | string | User ID                  | `user-xyz789`                     |
| firstName | string | User first name          | `John`                            |
| lastName  | string | User last name           | `Smith`                           |
| href      | string | Link to account resource | `/marketplaceapi/accounts/xyz789` |

### Seller Company (`sellerCompany`)

The aircraft operator receiving the RFQ.

| Field | Type   | Description                  | Example                          |
|-------|--------|------------------------------|-----------------------------------|
| id    | string | Operator company ID          | `operator-def456`                 |
| name  | string | Operator name                | `Sandbox Dev Operator`            |
| href  | string | Link to company resource     | `/marketplaceapi/companies/def456` |

---

## Flight Segments (`segments[]`)

Array of flight leg segments for the trip request.

| Field                    | Type   | Description                 | Example                          |
|--------------------------|--------|-----------------------------|---------------------------------|
| id                       | string | Segment ID                  | `seg-001`                        |
| startAirport.icao        | string | ICAO code                   | `KTEB`                           |
| startAirport.iata        | string | IATA code                   | `TEB`                            |
| startAirport.name        | string | Full airport name           | `Teterboro Airport`              |
| startAirport.city        | string | City name                   | `Teterboro`                      |
| startAirport.countryCode | string | ISO country code            | `US`                             |
| startAirport.href        | string | API link to airport         | `/marketplaceapi/airports/KTEB`  |
| endAirport.*             | object | Same structure as startAirport | -                            |
| dateTime.date            | string | Departure date (YYYY-MM-DD) | `2024-12-20`                     |
| dateTime.time            | string | Departure time (HH:MM)      | `09:00`                          |
| dateTime.utcOffset       | string | UTC offset string           | `-05:00`                         |
| paxCount                 | number | Passenger count             | `4`                              |

### Airport Object Structure

```json
{
  "icao": "KTEB",
  "iata": "TEB",
  "name": "Teterboro Airport",
  "city": "Teterboro",
  "countryCode": "US",
  "href": "/marketplaceapi/airports/KTEB"
}
```

---

## Seller Lift Options (`sellerLift[]`)

Array of aircraft options offered by the operator for this RFQ.

| Field                    | Type     | Description                         | Example                           |
|--------------------------|----------|-------------------------------------|-----------------------------------|
| id                       | string   | Lift ID (for responding)            | `lift-789`                        |
| aircraftTail             | string   | Specific tail number                | `N123AB`                          |
| aircraftType.name        | string   | Aircraft model                      | `Challenger 350`                  |
| aircraftType.href        | string   | Link to aircraft type details       | `/marketplaceapi/aircrafttypes/cl350` |
| aircraftCategory.name    | string   | Category                            | `Super Midsize Jet`               |
| actions.submitQuote.href | string   | Endpoint to submit quote            | `/marketplaceapi/quotes`          |
| actions.decline.href     | string   | Endpoint to decline                 | `/marketplaceapi/arfq/123/decline` |
| links.quotes[]           | string[] | Array of quote IDs for this lift    | `["quote-001", "quote-002"]`      |
| links.emptylegs[]        | string[] | Associated empty leg IDs            | `["el-001"]`                      |

### Aircraft Categories

Common aircraft category values:

| Category            | Typical Aircraft                           |
|---------------------|-------------------------------------------|
| Light Jet           | Citation CJ3, Phenom 300                  |
| Midsize Jet         | Citation XLS, Learjet 60                  |
| Super Midsize Jet   | Challenger 350, Citation Latitude         |
| Large Jet           | Challenger 605, Gulfstream G280          |
| Heavy Jet           | Gulfstream G550, Falcon 7X               |
| Ultra Long Range    | Gulfstream G650, Global 6000             |
| Turboprop           | King Air 350, Pilatus PC-12              |
| Helicopter          | EC135, Sikorsky S-76                     |

---

## Quote Details (`quotes[]`)

Array of quotes submitted for this RFQ.

### Quote Object

| Field       | Type         | Description                   | Example                    |
|-------------|--------------|-------------------------------|----------------------------|
| quote_id    | string       | Quote identifier              | `quote-abc123`             |
| rfq_id      | string       | Parent RFQ ID                 | `arfq-113903111`           |
| status      | string       | Quote status                  | `received`                 |
| valid_until | ISO datetime | Quote expiration              | `2024-12-18T23:59:59Z`     |
| created_at  | ISO datetime | When quote was submitted      | `2024-12-15T14:30:00Z`     |
| notes       | string       | Operator notes/comments       | `Aircraft recently refurbished` |

### Quote Status Values

| Status          | Description                                |
|-----------------|-------------------------------------------|
| `pending`       | Quote awaiting operator submission         |
| `received`      | Quote received from operator               |
| `accepted`      | Buyer accepted the quote                   |
| `rejected`      | Buyer rejected the quote                   |
| `expired`       | Quote validity period ended                |
| `counter_offer` | Counter offer submitted                    |

### Operator in Quote (`operator`)

| Field                  | Type   | Description        | Example                    |
|------------------------|--------|-------------------|----------------------------|
| operator.id            | string | Operator ID       | `operator-def456`          |
| operator.name          | string | Company name      | `Executive Air Charter`    |
| operator.rating        | number | Marketplace rating | `4.8`                      |
| operator.contact.name  | string | Contact person    | `Jane Doe`                 |
| operator.contact.email | string | Contact email     | `jane@execair.com`         |
| operator.contact.phone | string | Contact phone     | `+1-555-123-4567`          |

### Aircraft in Quote (`aircraft`)

| Field                 | Type     | Description                       | Example                              |
|-----------------------|----------|-----------------------------------|--------------------------------------|
| aircraft.type         | string   | Aircraft type name                | `Challenger 350`                     |
| aircraft.model        | string   | Model designation                 | `CL-350`                             |
| aircraft.registration | string   | Tail number                       | `N123AB`                             |
| aircraft.capacity     | number   | Max passengers                    | `9`                                  |
| aircraft.year_built   | number   | Manufacture year                  | `2019`                               |
| aircraft.amenities[]  | string[] | Features list                     | `["WiFi", "Lavatory", "Galley"]`     |

### Pricing in Quote (`pricing`)

| Field                  | Type   | Description               | Example        |
|------------------------|--------|---------------------------|----------------|
| pricing.base_price     | number | Base charter price        | `45000.00`     |
| pricing.fuel_surcharge | number | Fuel costs                | `8500.00`      |
| pricing.taxes          | number | Tax amount                | `2675.00`      |
| pricing.fees           | number | Additional fees           | `1500.00`      |
| pricing.total          | number | Grand total               | `57675.00`     |
| pricing.currency       | string | Currency code             | `USD`          |
| pricing.breakdown      | object | Detailed line items       | See below      |

#### Pricing Breakdown Example

```json
{
  "breakdown": {
    "charter_fee": 45000.00,
    "fuel_surcharge": 8500.00,
    "landing_fees": 500.00,
    "handling_fees": 750.00,
    "catering": 250.00,
    "federal_excise_tax": 2675.00,
    "segment_fees": 150.00
  }
}
```

---

## Available Actions (`actions`)

API endpoints for interacting with the RFQ.

| Action               | Type   | Description                       | Example                              |
|----------------------|--------|-----------------------------------|--------------------------------------|
| cancel.href          | string | Cancel the trip                   | `/marketplaceapi/trips/7ZSH2S/cancel` |
| searchInAvinode.href | string | Deep link to search in Avinode UI | `https://app.avinode.com/search/7ZSH2S` |
| viewInAvinode.href   | string | Deep link to view in Avinode UI   | `https://app.avinode.com/trip/7ZSH2S` |
| submitQuote.href     | string | Submit a quote response           | `/marketplaceapi/quotes`             |
| decline.href         | string | Decline the RFQ                   | `/marketplaceapi/arfq/123/decline`   |

---

## API Query Parameters

Request these for additional details when fetching RFQ data.

| Parameter        | Type    | Description                                | Default |
|------------------|---------|--------------------------------------------|---------|
| taildetails=true | boolean | Additional aircraft info (year, amenities) | `false` |
| typedetails=true | boolean | Detailed aircraft type specifications      | `false` |
| timestamps=true  | boolean | updatedByBuyer, latestUpdatedDateBySeller  | `false` |
| tailphotos=true  | boolean | Aircraft photo URLs                        | `false` |
| typephotos=true  | boolean | Generic aircraft type photos               | `false` |

### Example Request with Parameters

```bash
GET /marketplaceapi/arfq/arfq-123?taildetails=true&typedetails=true&timestamps=true&tailphotos=true
```

---

## Messages (`tripmsgs`)

Trip-related messages between buyer and seller.

| Field          | Type         | Description              | Example                    |
|----------------|--------------|--------------------------|----------------------------|
| message_id     | string       | Message identifier       | `msg-001`                  |
| sender.id      | string       | Sender user ID           | `user-xyz789`              |
| sender.name    | string       | Sender name              | `John Smith`               |
| sender.company | string       | Sender company           | `Jetvision LLC`            |
| sender.type    | string       | Sender type              | `buyer`                    |
| content        | string       | Message text             | `Can you confirm catering options?` |
| sent_at        | ISO datetime | Timestamp                | `2024-12-15T15:45:00Z`     |
| read           | boolean      | Read status              | `true`                     |

### Sender Type Values

| Type     | Description                    |
|----------|--------------------------------|
| `buyer`  | Message from charter requester |
| `seller` | Message from operator          |
| `system` | Automated system message       |

---

## Webhook Events

Events pushed to configured webhook endpoints.

| Event Type                  | Description                    |
|-----------------------------|--------------------------------|
| `TripRequestSellerResponse` | Operator submitted a quote     |
| `TripChatSeller`            | Operator sent a message        |
| `TripChatMine`              | Confirmation of sent message   |
| `TripQuoteAccepted`         | Buyer accepted a quote         |
| `TripQuoteDeclined`         | Buyer declined a quote         |
| `TripCancelled`             | Trip was cancelled             |

---

## Complete RFQ Response Example

```json
{
  "id": "arfq-113903111",
  "tripId": "7ZSH2S",
  "href": "/marketplaceapi/arfq/arfq-113903111",
  "canceled": false,
  "status": "quoted",
  "created_at": "2024-12-15T10:30:00Z",
  "quote_deadline": "2024-12-16T18:00:00Z",

  "buyerCompany": {
    "id": "company-abc123",
    "name": "Jetvision LLC",
    "href": "/marketplaceapi/companies/abc123"
  },

  "buyerAccount": {
    "id": "user-xyz789",
    "firstName": "John",
    "lastName": "Smith",
    "href": "/marketplaceapi/accounts/xyz789"
  },

  "sellerCompany": {
    "id": "operator-def456",
    "name": "Executive Air Charter",
    "href": "/marketplaceapi/companies/def456"
  },

  "segments": [
    {
      "id": "seg-001",
      "startAirport": {
        "icao": "KTEB",
        "iata": "TEB",
        "name": "Teterboro Airport",
        "city": "Teterboro",
        "countryCode": "US",
        "href": "/marketplaceapi/airports/KTEB"
      },
      "endAirport": {
        "icao": "KPBI",
        "iata": "PBI",
        "name": "Palm Beach International Airport",
        "city": "West Palm Beach",
        "countryCode": "US",
        "href": "/marketplaceapi/airports/KPBI"
      },
      "dateTime": {
        "date": "2024-12-20",
        "time": "09:00",
        "utcOffset": "-05:00"
      },
      "paxCount": 4
    }
  ],

  "sellerLift": [
    {
      "id": "lift-789",
      "aircraftTail": "N123AB",
      "aircraftType": {
        "name": "Challenger 350",
        "href": "/marketplaceapi/aircrafttypes/cl350"
      },
      "aircraftCategory": {
        "name": "Super Midsize Jet"
      },
      "actions": {
        "submitQuote": {
          "href": "/marketplaceapi/quotes"
        },
        "decline": {
          "href": "/marketplaceapi/arfq/arfq-113903111/decline"
        }
      },
      "links": {
        "quotes": ["quote-abc123"],
        "emptylegs": []
      }
    }
  ],

  "quotes": [
    {
      "quote_id": "quote-abc123",
      "rfq_id": "arfq-113903111",
      "status": "received",
      "valid_until": "2024-12-18T23:59:59Z",
      "created_at": "2024-12-15T14:30:00Z",
      "notes": "Aircraft recently refurbished with new interior",

      "operator": {
        "id": "operator-def456",
        "name": "Executive Air Charter",
        "rating": 4.8,
        "contact": {
          "name": "Jane Doe",
          "email": "jane@execair.com",
          "phone": "+1-555-123-4567"
        }
      },

      "aircraft": {
        "type": "Challenger 350",
        "model": "CL-350",
        "registration": "N123AB",
        "capacity": 9,
        "year_built": 2019,
        "amenities": ["WiFi", "Lavatory", "Galley", "DVD/CD Player"]
      },

      "pricing": {
        "base_price": 45000.00,
        "fuel_surcharge": 8500.00,
        "taxes": 2675.00,
        "fees": 1500.00,
        "total": 57675.00,
        "currency": "USD",
        "breakdown": {
          "charter_fee": 45000.00,
          "fuel_surcharge": 8500.00,
          "landing_fees": 500.00,
          "handling_fees": 750.00,
          "catering": 250.00,
          "federal_excise_tax": 2675.00
        }
      }
    }
  ],

  "actions": {
    "cancel": {
      "href": "/marketplaceapi/trips/7ZSH2S/cancel"
    },
    "viewInAvinode": {
      "href": "https://app.avinode.com/trip/7ZSH2S"
    }
  }
}
```

---

## Component Field Mapping

Mapping between Avinode API fields and UI component interfaces.

### RFQFlightCard Component (`components/avinode/rfq-flight-card.tsx`)

| Component Field        | API Field                    | Notes                                      |
|------------------------|------------------------------|---------------------------------------------|
| `id`                   | `id`                         | Direct mapping                              |
| `quoteId`              | `quote_id`                   | camelCase conversion                        |
| `departureAirport.icao`| `startAirport.icao`          | Renamed: start → departure                  |
| `departureAirport.name`| `startAirport.name`          | Renamed: start → departure                  |
| `departureAirport.city`| `startAirport.city`          | Renamed: start → departure                  |
| `arrivalAirport.*`     | `endAirport.*`               | Renamed: end → arrival                      |
| `departureDate`        | `dateTime.date`              | Flattened from nested object                |
| `departureTime`        | `dateTime.time`              | Flattened from nested object                |
| `aircraftType`         | `aircraftType.name`          | Flattened                                   |
| `aircraftModel`        | `aircraft.model`             | Flattened                                   |
| `tailNumber`           | `aircraft.registration`      | Renamed: registration → tailNumber          |
| `yearOfManufacture`    | `aircraft.year_built`        | Renamed + camelCase                         |
| `passengerCapacity`    | `aircraft.capacity`          | Renamed: capacity → passengerCapacity       |
| `tailPhotoUrl`         | (tailphotos query param)     | From API query `?tailphotos=true`           |
| `aircraftCategory`     | `aircraftCategory.name`      | Flattened                                   |
| `operatorName`         | `operator.name`              | Flattened                                   |
| `operatorRating`       | `operator.rating`            | Flattened                                   |
| `operatorEmail`        | `operator.contact.email`     | Flattened from nested object                |
| `totalPrice`           | `pricing.total`              | Flattened                                   |
| `currency`             | `pricing.currency`           | Flattened                                   |
| `priceBreakdown.basePrice` | `pricing.base_price`     | camelCase conversion                        |
| `priceBreakdown.fuelSurcharge` | `pricing.fuel_surcharge` | camelCase conversion                    |
| `priceBreakdown.taxes` | `pricing.taxes`              | Direct mapping                              |
| `priceBreakdown.fees`  | `pricing.fees`               | Direct mapping                              |
| `validUntil`           | `valid_until`                | camelCase conversion                        |
| `avinodeDeepLink`      | `actions.viewInAvinode.href` | Flattened from actions object               |

#### Component-Only Fields (UI State)

| Field               | Purpose                                    |
|---------------------|--------------------------------------------|
| `flightDuration`    | Calculated flight time display             |
| `lastUpdated`       | Timestamp for UI display                   |
| `responseTimeMinutes` | Time since RFQ sent                      |
| `isSelected`        | UI selection state                         |
| `hasMedical`        | Derived from amenities                     |
| `hasPackage`        | Derived from amenities                     |

#### Status Value Mapping

| Component (`rfqStatus`) | API (`status`)  | Description                     |
|-------------------------|-----------------|----------------------------------|
| `sent`                  | `pending`       | RFQ sent, awaiting response      |
| `unanswered`            | `pending`       | No response yet (time-based)     |
| `quoted`                | `quoted`        | Quote received                   |
| `declined`              | `declined`      | Operator declined                |
| `expired`               | `expired`       | Quote deadline passed            |
| —                       | `cancelled`     | Not used in component            |

#### Amenities Structure Difference

**API Format** (array of strings):
```json
{
  "amenities": ["WiFi", "Lavatory", "Galley", "Pets Allowed"]
}
```

**Component Format** (object with booleans):
```typescript
{
  amenities: {
    wifi: boolean;
    pets: boolean;
    smoking: boolean;
    galley: boolean;
    lavatory: boolean;
    medical: boolean;
  }
}
```

**Transformation Required**: Parse API array and set boolean flags.

---

### RfqQuoteDetailsCard Component (`components/avinode/rfq-quote-details-card.tsx`)

| Component Field              | API Field                | Notes                          |
|------------------------------|--------------------------|--------------------------------|
| `rfqId`                      | `rfq_id`                 | camelCase conversion           |
| `quoteId`                    | `quote_id`               | camelCase conversion           |
| `operator.name`              | `operator.name`          | Direct mapping                 |
| `operator.rating`            | `operator.rating`        | Direct mapping                 |
| `aircraft.type`              | `aircraft.type`          | Direct mapping                 |
| `aircraft.tail`              | `aircraft.registration`  | Renamed: registration → tail   |
| `aircraft.category`          | `aircraftCategory.name`  | Flattened                      |
| `aircraft.maxPassengers`     | `aircraft.capacity`      | Renamed: capacity → maxPassengers |
| `price.amount`               | `pricing.total`          | Renamed: total → amount        |
| `price.currency`             | `pricing.currency`       | Direct mapping                 |
| `flightDetails.flightTimeMinutes` | (calculated)        | Not from API                   |
| `flightDetails.distanceNm`   | (calculated)             | Not from API                   |

#### Quote Status Value Mapping

| Component (`status`) | API (`status`)   | Description                    |
|----------------------|------------------|--------------------------------|
| `unanswered`         | `pending`        | Awaiting operator response     |
| `quoted`             | `received`       | Quote submitted                |
| `accepted`           | `accepted`       | Buyer accepted                 |
| `declined`           | `rejected`       | Buyer rejected                 |
| `expired`            | `expired`        | Quote validity ended           |
| —                    | `counter_offer`  | Not used in component          |

---

## Database Mapping

Mapping Avinode RFQ fields to internal database schema.

### `avinode_rfqs` Table

| DB Column           | Avinode Field              | Type     |
|---------------------|----------------------------|----------|
| id                  | (generated)                | uuid     |
| avinode_rfq_id      | id                         | text     |
| trip_id             | tripId                     | text     |
| status              | status                     | text     |
| created_at          | created_at                 | timestamp |
| quote_deadline      | quote_deadline             | timestamp |
| buyer_company_id    | buyerCompany.id            | text     |
| buyer_company_name  | buyerCompany.name          | text     |
| seller_company_id   | sellerCompany.id           | text     |
| seller_company_name | sellerCompany.name         | text     |
| segments            | segments                   | jsonb    |
| raw_response        | (full response)            | jsonb    |

### `avinode_quotes` Table

| DB Column           | Avinode Field              | Type     |
|---------------------|----------------------------|----------|
| id                  | (generated)                | uuid     |
| avinode_quote_id    | quote_id                   | text     |
| rfq_id              | rfq_id                     | text     |
| status              | status                     | text     |
| operator_name       | operator.name              | text     |
| operator_rating     | operator.rating            | decimal  |
| aircraft_type       | aircraft.type              | text     |
| aircraft_tail       | aircraft.registration      | text     |
| aircraft_year       | aircraft.year_built        | integer  |
| total_price         | pricing.total              | decimal  |
| currency            | pricing.currency           | text     |
| valid_until         | valid_until                | timestamp |
| pricing_breakdown   | pricing.breakdown          | jsonb    |
| raw_response        | (full quote object)        | jsonb    |

---

## Related Documentation

- [Avinode API Integration Guide](./AVINODE_API_INTEGRATION.md)
- [RFQ API Alignment Analysis](../analysis/AVINODE_RFQ_API_ALIGNMENT.md)
- [Avinode API Status](../avinode/AVINODE_API_STATUS.md)
- [Deep Link Workflow](../subagents/agents/flight-search/DEEP_LINK_WORKFLOW.md)

---

## Sources

- [Avinode API - Download & Respond to RFQ](https://developer.avinodegroup.com/docs/download-respond-rfq)
- [Avinode API Basics](https://developer.avinodegroup.com/docs/api-basics)
- [Aircraft Pricing in Marketplace](https://help.avinodegroup.com/hc/en-us/articles/10789447277851-Aircraft-Pricing-and-Median-Price-Difference-in-the-Marketplace-Explained)
