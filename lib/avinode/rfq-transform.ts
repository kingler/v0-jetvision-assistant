import type { RFQFlight } from '@/components/avinode/rfq-flight-card';

interface NormalizeRfqFlightsArgs {
  rfqData?: any;
  quotes?: Array<Record<string, any> | RFQFlight | null | undefined>;
  route?: {
    departureAirport?: { icao?: string; name?: string; city?: string };
    arrivalAirport?: { icao?: string; name?: string; city?: string };
    departureDate?: string;
    departureTime?: string;
    arrivalTime?: string;
  };
  passengers?: number;
  deepLink?: string;
}

const RFQ_STATUS_VALUES = new Set(['sent', 'unanswered', 'quoted', 'declined', 'expired']);

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) {
    return '0h 0m';
  }
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  return `${hours}h ${remaining}m`;
}

function mapAmenities(amenities: Array<string | null | undefined>): RFQFlight['amenities'] {
  const normalized = amenities
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toLowerCase().trim());

  return {
    wifi: normalized.includes('wifi') || normalized.includes('wi-fi'),
    pets: normalized.includes('pets') || normalized.includes('pet'),
    smoking: normalized.includes('smoking') || normalized.includes('smoke'),
    galley: normalized.includes('galley') || normalized.includes('kitchen'),
    lavatory: normalized.includes('lavatory') || normalized.includes('bathroom') || normalized.includes('restroom'),
    medical: normalized.includes('medical') || normalized.includes('medevac'),
  };
}

function resolveRoute(
  quote: Record<string, any>,
  rfqData: any,
  route?: NormalizeRfqFlightsArgs['route']
) {
  const quoteRoute = quote?.route;
  const rfqRoute = rfqData?.route;

  const departureAirport =
    quoteRoute?.departure?.airport ||
    rfqRoute?.departure?.airport ||
    route?.departureAirport ||
    undefined;
  const arrivalAirport =
    quoteRoute?.arrival?.airport ||
    rfqRoute?.arrival?.airport ||
    route?.arrivalAirport ||
    undefined;
  const departureDate =
    quoteRoute?.departure?.date ||
    rfqRoute?.departure?.date ||
    route?.departureDate ||
    undefined;
  const departureTime =
    quoteRoute?.departure?.time ||
    rfqRoute?.departure?.time ||
    route?.departureTime ||
    undefined;
  const arrivalTime =
    quoteRoute?.arrival?.time ||
    rfqRoute?.arrival?.time ||
    route?.arrivalTime ||
    undefined;

  return {
    departureAirport,
    arrivalAirport,
    departureDate,
    departureTime,
    arrivalTime,
  };
}

function normalizeQuoteToFlight(
  quote: Record<string, any>,
  index: number,
  args: NormalizeRfqFlightsArgs
): RFQFlight | null {
  if (!quote) {
    return null;
  }

  if (
    typeof (quote as RFQFlight).totalPrice === 'number' &&
    (quote as RFQFlight).departureAirport &&
    (quote as RFQFlight).arrivalAirport
  ) {
    return quote as RFQFlight;
  }

  const { rfqData, route, passengers, deepLink } = args;
  const { departureAirport, arrivalAirport, departureDate, departureTime, arrivalTime } = resolveRoute(
    quote,
    rfqData,
    route
  );

  const aircraft = quote.aircraft || {};
  const pricing = quote.pricing || {};
  const operator = quote.operator || {};

  const quoteId =
    quote.id ||
    quote.quote_id ||
    quote.quoteId ||
    quote.rfq_id ||
    `quote-${Date.now()}-${index}`;

  const sourcingDisplayStatus = quote.sourcingDisplayStatus || quote.sourcing_display_status;
  const sourcingStatus = quote.sourcingStatus ?? quote.sourcing_status;
  const statusRaw =
    quote.rfqStatus ||
    quote.status ||
    quote.quote_status ||
    quote.rfq_status ||
    'quoted';
  const statusNormalized = String(statusRaw).toLowerCase();
  const sourcingDisplayNormalized = String(sourcingDisplayStatus || '').toLowerCase();
  let rfqStatus: RFQFlight['rfqStatus'] =
    sourcingDisplayNormalized === 'accepted'
      ? 'quoted'
      : sourcingDisplayNormalized === 'declined'
        ? 'declined'
        : sourcingDisplayNormalized === 'expired'
          ? 'expired'
          : sourcingStatus === 2
            ? 'quoted'
            : sourcingStatus === 3
              ? 'declined'
              : statusNormalized === 'pending' || statusNormalized === 'open'
                ? 'unanswered'
                : RFQ_STATUS_VALUES.has(statusNormalized)
                  ? (statusNormalized as RFQFlight['rfqStatus'])
                : 'quoted';

  const sellerPrice = quote.sellerPrice || quote.seller_price || quote.sellerPriceWithoutCommission;
  // CRITICAL: Check multiple price field variations to extract price correctly
  // Priority: sellerPrice.price > pricing.total > totalPrice (direct number) > total_price > price > totalPrice.amount > estimatedPrice.amount
  // FIX: Added estimatedPrice fallback for "Unanswered" RFQs (initial RFQ submission price before operator responds)
  let pricingTotal = 0;

  if (sellerPrice?.price && sellerPrice.price > 0) {
    pricingTotal = sellerPrice.price;
  } else if (pricing.total && pricing.total > 0) {
    pricingTotal = pricing.total;
  } else if (typeof (quote as any).totalPrice === 'number' && (quote as any).totalPrice > 0) {
    // Direct totalPrice field (not object)
    pricingTotal = (quote as any).totalPrice;
  } else if (quote.total_price && quote.total_price > 0) {
    pricingTotal = quote.total_price;
  } else if (quote.price && quote.price > 0) {
    pricingTotal = quote.price;
  } else if (quote.totalPrice?.amount && quote.totalPrice.amount > 0) {
    pricingTotal = quote.totalPrice.amount;
  } else if (pricing.amount && pricing.amount > 0) {
    pricingTotal = pricing.amount;
  } else if ((quote as any).estimatedPrice?.amount && (quote as any).estimatedPrice.amount > 0) {
    // FIX: Fallback to estimatedPrice for initial RFQ marketplace price (Unanswered status)
    pricingTotal = (quote as any).estimatedPrice.amount;
  } else if ((quote as any).estimated_price?.amount && (quote as any).estimated_price.amount > 0) {
    // FIX: Snake_case variant of estimatedPrice
    pricingTotal = (quote as any).estimated_price.amount;
  }
  
  // CRITICAL: Log when price extraction fails for debugging
  if (pricingTotal === 0 && process.env.NODE_ENV === 'development') {
    console.warn('[normalizeQuoteToFlight] ⚠️ Price is 0 after extraction:', {
      quoteId: quote.id || quote.quote_id,
      availableFields: Object.keys(quote).filter(key =>
        key.toLowerCase().includes('price') ||
        key.toLowerCase().includes('amount') ||
        key.toLowerCase().includes('total') ||
        key.toLowerCase().includes('estimated')
      ),
      sellerPrice: sellerPrice,
      pricing: pricing,
      totalPrice: (quote as any).totalPrice,
      total_price: (quote as any).total_price,
      price: (quote as any).price,
      // FIX: Include estimatedPrice in debug output
      estimatedPrice: (quote as any).estimatedPrice,
      estimated_price: (quote as any).estimated_price,
    });
  }
  const pricingCurrency =
    sellerPrice?.currency ||
    pricing.currency ||
    quote.currency ||
    quote.totalPrice?.currency ||
    // FIX: Added estimatedPrice currency fallback
    (quote as any).estimatedPrice?.currency ||
    (quote as any).estimated_price?.currency ||
    'USD';

  const flightDuration =
    typeof quote.flightDuration === 'string'
      ? quote.flightDuration
      : typeof quote.flight_duration === 'string'
        ? quote.flight_duration
        : typeof quote.schedule?.flightDuration === 'number'
          ? formatDuration(quote.schedule.flightDuration)
          : typeof quote.schedule?.duration === 'number'
            ? formatDuration(quote.schedule.duration)
            : '0h 0m';

  const amenitySource = [
    ...(Array.isArray(quote.amenities) ? quote.amenities : []),
    ...(Array.isArray(quote.features) ? quote.features : []),
    ...(Array.isArray(aircraft.amenities) ? aircraft.amenities : []),
  ];

  const amenities = mapAmenities(amenitySource);

  const passengerCapacity =
    Number(aircraft.capacity) ||
    Number(quote.passengerCapacity) ||
    Number(quote.passenger_capacity) ||
    Number(rfqData?.passengers) ||
    Number(passengers) ||
    0;

  const sellerMessage =
    typeof quote.sellerMessage === 'string'
      ? quote.sellerMessage
      : typeof quote.seller_message === 'string'
        ? quote.seller_message
        : typeof quote.notes === 'string'
          ? quote.notes
          : quote.sellerMessage?.content || quote.sellerMessage?.text;
  // USER REQUIREMENT: If totalPrice > 0, status should be 'quoted'
  // This is the business logic - even if Avinode shows "Unanswered", if there's a price, show "Quoted"
  // Note: Avinode can have "Unanswered" status with prices > 0 in their UI, but we want to show "Quoted" in ours
  if (pricingTotal && pricingTotal > 0 && pricingTotal !== 0) {
    // Price exists - treat as quoted (per user requirement: "If totalPrice > 0, the status will be 'quoted'")
    if (rfqStatus !== 'declined' && rfqStatus !== 'expired') {
      // Only override if not explicitly declined/expired
      if (rfqStatus === 'unanswered' || rfqStatus === 'sent' || !rfqStatus) {
        console.log('[normalizeQuoteToFlight] ✅ Price > 0 exists (' + pricingTotal + ' ' + pricingCurrency + ') - updating status to quoted (was:', rfqStatus, ')');
        rfqStatus = 'quoted';
      }
    }
  }

  // Extract leg type information for round-trip proposals
  // legType: 'outbound' (first leg) or 'return' (second leg)
  // legSequence: 1 (outbound) or 2 (return)
  const legType = quote.legType || quote.leg_type || quote.legDirection ||
    (quote.legSequence === 2 || quote.leg_sequence === 2 ? 'return' : undefined);
  const legSequence = quote.legSequence || quote.leg_sequence ||
    (quote.legType === 'return' || quote.leg_type === 'return' ? 2 :
      quote.legType === 'outbound' || quote.leg_type === 'outbound' ? 1 : undefined);

  return {
    id: quoteId,
    quoteId,
    departureAirport: {
      icao: departureAirport?.icao || route?.departureAirport?.icao || 'N/A',
      name: departureAirport?.name || route?.departureAirport?.name,
      city: departureAirport?.city || route?.departureAirport?.city,
    },
    arrivalAirport: {
      icao: arrivalAirport?.icao || route?.arrivalAirport?.icao || 'N/A',
      name: arrivalAirport?.name || route?.arrivalAirport?.name,
      city: arrivalAirport?.city || route?.arrivalAirport?.city,
    },
    departureDate: departureDate || new Date().toISOString().split('T')[0],
    departureTime,
    flightDuration,
    // Round-trip leg information
    legType: legType as 'outbound' | 'return' | undefined,
    legSequence: legSequence as 1 | 2 | undefined,
    aircraftType:
      quote.aircraftType ||
      quote.aircraft_type ||
      aircraft.type ||
      aircraft.model ||
      'Unknown Aircraft',
    aircraftModel:
      quote.aircraftModel ||
      quote.aircraft_model ||
      aircraft.model ||
      aircraft.type ||
      'Unknown Aircraft',
    tailNumber:
      quote.tailNumber ||
      quote.tail_number ||
      aircraft.registration ||
      aircraft.tail_number,
    yearOfManufacture: aircraft.year_built || quote.year_built,
    passengerCapacity,
    operatorName: operator.name || quote.operator_name || quote.operatorName || 'Unknown Operator',
    operatorRating:
      operator.rating != null
        ? Number(operator.rating)
        : quote.operator_rating != null
          ? Number(quote.operator_rating)
          : quote.operatorRating != null
            ? Number(quote.operatorRating)
            : undefined,
    operatorEmail: operator.email || quote.operator_email || quote.operatorEmail,
    totalPrice: Number(pricingTotal) || 0,
    currency: pricingCurrency || 'USD',
    priceBreakdown: pricing.base_price
      ? {
          basePrice: pricing.base_price,
          fuelSurcharge: pricing.fuel_surcharge || 0,
          taxes: pricing.taxes || 0,
          fees: pricing.fees || 0,
        }
      : pricing.fuel_surcharge || pricing.taxes || pricing.fees
        ? {
            basePrice: Number(pricingTotal) || 0,
            fuelSurcharge: pricing.fuel_surcharge || 0,
            taxes: pricing.taxes || 0,
            fees: pricing.fees || 0,
          }
        : undefined,
    amenities,
    rfqStatus,
    lastUpdated: quote.updated_at || quote.last_updated || new Date().toISOString(),
    responseTimeMinutes: quote.responseTimeMinutes,
    isSelected: Boolean(quote.isSelected),
    aircraftCategory:
      aircraft.category?.name ||
      quote.aircraftCategory ||
      quote.aircraft_category,
    hasMedical: amenities.medical,
    hasPackage: Boolean(quote.hasPackage),
    avinodeDeepLink: rfqData?.deep_link || rfqData?.deepLink || deepLink,
    sellerMessage,
  };
}

export function normalizeRfqFlights(args: NormalizeRfqFlightsArgs): RFQFlight[] {
  if (!args) {
    return [];
  }

  const quotes: Array<Record<string, any>> = [];

  if (Array.isArray(args.quotes)) {
    quotes.push(...(args.quotes.filter(Boolean) as Array<Record<string, any>>));
  }

  const rfqData = args.rfqData;
  if (Array.isArray(rfqData)) {
    rfqData.forEach((rfq) => {
      if (Array.isArray(rfq?.quotes)) {
        quotes.push(...rfq.quotes);
      }
      if (Array.isArray(rfq?.responses)) {
        quotes.push(...rfq.responses);
      }
      if (Array.isArray(rfq?.requests)) {
        quotes.push(...rfq.requests);
      }
    });
  } else if (rfqData) {
    if (Array.isArray(rfqData.quotes)) {
      quotes.push(...rfqData.quotes);
    }
    if (Array.isArray(rfqData.responses)) {
      quotes.push(...rfqData.responses);
    }
    if (Array.isArray(rfqData.requests)) {
      quotes.push(...rfqData.requests);
    }
  }

  const seen = new Set<string>();
  const flights: RFQFlight[] = [];

  quotes.forEach((quote, index) => {
    const flight = normalizeQuoteToFlight(quote, index, {
      ...args,
      rfqData: rfqData || quote?.rfq_data,
    });
    if (!flight) {
      return;
    }
    if (seen.has(flight.id)) {
      return;
    }
    seen.add(flight.id);
    flights.push(flight);
  });

  return flights;
}
