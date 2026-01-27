/**
 * RFQ Transformer
 *
 * Transforms raw API quotes and RFQ data into normalized RFQFlight format.
 * Extracted from chat-interface.tsx to enable reuse and testing.
 */

import { RFQStatus, type RFQStatusType } from '../constants';
import type {
  Quote,
  RFQFlight,
  RFQItem,
  AirportInfo,
  AircraftAmenities,
  PriceBreakdown,
  QuoteDetailsMap,
} from '../types';

/**
 * Default amenities object
 */
const DEFAULT_AMENITIES: AircraftAmenities = {
  wifi: false,
  pets: false,
  smoking: false,
  galley: false,
  lavatory: false,
  medical: false,
};

/**
 * Route parts type (departure and arrival ICAO codes)
 */
type RouteParts = [string, string];

/**
 * Extract route parts from route string
 * @param route - Route string like "KTEB → KVNY"
 * @returns Tuple of [departure, arrival] ICAO codes
 */
export function extractRouteParts(route?: string): RouteParts {
  if (!route) return ['N/A', 'N/A'];

  const parts = route.split(' → ');
  return [parts[0] || 'N/A', parts[1] || 'N/A'];
}

/**
 * Extract price from quote object
 * Priority: sellerPrice.price > pricing.total > pricing.amount > totalPrice > total_price > price > totalPrice?.amount
 */
export function extractPrice(quote: Quote): { price: number; currency: string } {
  // === DIAGNOSTIC LOGGING (Phase 1: Gather Evidence) ===
  if (process.env.NODE_ENV === 'development') {
    console.log('[extractPrice] === PRICE EXTRACTION DEBUG ===');
    console.log('[extractPrice] Quote ID:', quote.quote_id || quote.quoteId || quote.id);
    console.log('[extractPrice] Input structure:', {
      hasSellerPrice: !!quote.sellerPrice,
      sellerPrice_price: quote.sellerPrice?.price,
      sellerPrice_currency: quote.sellerPrice?.currency,
      hasPricing: !!quote.pricing,
      pricing_total: quote.pricing?.total,
      pricing_amount: quote.pricing?.amount,
      pricing_base: quote.pricing?.base,
      pricing_currency: quote.pricing?.currency,
      totalPrice_number: typeof (quote as any).totalPrice === 'number' ? (quote as any).totalPrice : 'NOT_NUMBER',
      totalPrice_object_amount: (quote as any).totalPrice?.amount,
      total_price: (quote as any).total_price,
      price: (quote as any).price,
      // FIX: Added estimatedPrice logging for Unanswered RFQs
      hasEstimatedPrice: !!(quote as any).estimatedPrice || !!(quote as any).estimated_price,
      estimatedPrice_amount: (quote as any).estimatedPrice?.amount || (quote as any).estimated_price?.amount,
      estimatedPrice_currency: (quote as any).estimatedPrice?.currency || (quote as any).estimated_price?.currency,
    });
  }

  // PRIMARY: sellerPrice (from Avinode API)
  if (quote.sellerPrice?.price && quote.sellerPrice.price > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[extractPrice] ✅ MATCH: sellerPrice.price =', quote.sellerPrice.price);
    }
    return {
      price: quote.sellerPrice.price,
      currency: quote.sellerPrice.currency || 'USD',
    };
  }
  if (process.env.NODE_ENV === 'development') {
    console.log('[extractPrice] ⏭️  SKIP: sellerPrice.price', {
      exists: !!quote.sellerPrice?.price,
      value: quote.sellerPrice?.price,
      isPositive: quote.sellerPrice?.price ? quote.sellerPrice.price > 0 : false,
    });
  }

  // FALLBACK: pricing object
  if (quote.pricing) {
    const pricingTotal = quote.pricing.total || quote.pricing.amount || quote.pricing.base;
    if (process.env.NODE_ENV === 'development') {
      console.log('[extractPrice] Pricing chain:', {
        total: quote.pricing.total,
        amount: quote.pricing.amount,
        base: quote.pricing.base,
        selected: pricingTotal,
        willReturn: pricingTotal && pricingTotal > 0,
      });
    }
    if (pricingTotal && pricingTotal > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[extractPrice] ✅ MATCH: pricing.* =', pricingTotal);
      }
      return {
        price: pricingTotal,
        currency: quote.pricing.currency || 'USD',
      };
    }
  }
  if (process.env.NODE_ENV === 'development') {
    console.log('[extractPrice] ⏭️  SKIP: pricing object');
  }

  // FALLBACK: totalPrice field (direct number, not object)
  // This is a common pattern where the price is stored as totalPrice directly
  if (typeof (quote as any).totalPrice === 'number') {
    if (process.env.NODE_ENV === 'development') {
      console.log('[extractPrice] totalPrice (number):', (quote as any).totalPrice, 'valid?', (quote as any).totalPrice > 0);
    }
    if ((quote as any).totalPrice > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[extractPrice] ✅ MATCH: totalPrice (number) =', (quote as any).totalPrice);
      }
      return {
        price: (quote as any).totalPrice,
        currency: quote.currency || 'USD',
      };
    }
  }
  if (process.env.NODE_ENV === 'development') {
    console.log('[extractPrice] ⏭️  SKIP: totalPrice (number)');
  }

  // FALLBACK: direct price fields
  const directPrice = quote.total_price || quote.price;
  if (process.env.NODE_ENV === 'development') {
    console.log('[extractPrice] Direct price fields:', {
      total_price: quote.total_price,
      price: (quote as any).price,
      selected: directPrice,
      willReturn: directPrice && directPrice > 0,
    });
  }
  if (directPrice && directPrice > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[extractPrice] ✅ MATCH: direct price field =', directPrice);
    }
    return {
      price: directPrice,
      currency: quote.currency || 'USD',
    };
  }
  if (process.env.NODE_ENV === 'development') {
    console.log('[extractPrice] ⏭️  SKIP: direct price fields');
  }

  // FALLBACK: totalPrice object
  if (quote.totalPrice && typeof quote.totalPrice === 'object') {
    if (process.env.NODE_ENV === 'development') {
      console.log('[extractPrice] totalPrice (object):', {
        amount: quote.totalPrice.amount,
        currency: quote.totalPrice.currency,
        willReturn: quote.totalPrice.amount && quote.totalPrice.amount > 0,
      });
    }
    if (quote.totalPrice.amount && quote.totalPrice.amount > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[extractPrice] ✅ MATCH: totalPrice.amount =', quote.totalPrice.amount);
      }
      return {
        price: quote.totalPrice.amount,
        currency: quote.totalPrice.currency || 'USD',
      };
    }
  }
  if (process.env.NODE_ENV === 'development') {
    console.log('[extractPrice] ⏭️  SKIP: totalPrice object');
  }

  // FIX: FALLBACK for estimatedPrice (initial RFQ submission price for Unanswered status)
  // This is the marketplace/estimated price returned by Avinode before operators respond
  const estimatedPrice = (quote as any).estimatedPrice || (quote as any).estimated_price;
  if (estimatedPrice) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[extractPrice] estimatedPrice (initial RFQ price):', {
        amount: estimatedPrice.amount,
        currency: estimatedPrice.currency,
        willReturn: estimatedPrice.amount && estimatedPrice.amount > 0,
      });
    }
    if (estimatedPrice.amount && estimatedPrice.amount > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[extractPrice] ✅ MATCH: estimatedPrice.amount =', estimatedPrice.amount);
      }
      return {
        price: estimatedPrice.amount,
        currency: estimatedPrice.currency || 'USD',
      };
    }
  }
  if (process.env.NODE_ENV === 'development') {
    console.log('[extractPrice] ⏭️  SKIP: estimatedPrice');
  }

  // CRITICAL: Log when price extraction fails for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('[extractPrice] ❌ NO PRICE FOUND - All fallbacks failed');
    console.error('[extractPrice] Available fields:', Object.keys(quote).filter(key =>
      key.toLowerCase().includes('price') ||
      key.toLowerCase().includes('amount') ||
      key.toLowerCase().includes('total')
    ));
    console.error('[extractPrice] Full quote structure:', JSON.stringify(quote, null, 2));
  }

  return { price: 0, currency: quote.currency || 'USD' };
}

/**
 * Extract RFQ status from quote
 */
export function extractRFQStatus(quote: Quote): RFQStatusType {
  // Check sourcingDisplayStatus first (Avinode API field)
  if (quote.sourcingDisplayStatus === 'Accepted') return RFQStatus.QUOTED;
  if (quote.sourcingDisplayStatus === 'Declined') return RFQStatus.DECLINED;

  // Check direct status fields
  const status = quote.status || quote.rfq_status || quote.quote_status;

  if (status) {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'quoted' || normalizedStatus === 'accepted') {
      return RFQStatus.QUOTED;
    }
    if (normalizedStatus === 'declined') return RFQStatus.DECLINED;
    if (normalizedStatus === 'expired') return RFQStatus.EXPIRED;
    if (normalizedStatus === 'sent' || normalizedStatus === 'pending') {
      return RFQStatus.SENT;
    }
  }

  return RFQStatus.UNANSWERED;
}

/**
 * Extract price breakdown from quote
 */
export function extractPriceBreakdown(quote: Quote): PriceBreakdown | undefined {
  if (!quote.pricing) return undefined;

  const pricing = quote.pricing;

  // Only return breakdown if we have meaningful data
  if (!pricing.total && !pricing.amount && !pricing.base) {
    return undefined;
  }

  return {
    basePrice: pricing.base || pricing.basePrice || pricing.base_price || 0,
    fuelSurcharge: pricing.fuel || pricing.fuelSurcharge || pricing.fuel_surcharge,
    taxes: pricing.taxes || 0,
    fees: pricing.fees || 0,
  };
}

/**
 * Convert a single quote to RFQFlight format
 *
 * @param quote - The quote object to convert
 * @param routeParts - Array of [departure, arrival] airport codes
 * @param date - Optional date string from chat
 * @returns RFQFlight object or null if conversion fails
 */
export function convertQuoteToRFQFlight(
  quote: Quote,
  routeParts: RouteParts,
  date?: string
): RFQFlight | null {
  try {
    const quoteId = quote.quote_id || quote.quoteId || quote.id || `quote-${Date.now()}`;
    const { price, currency } = extractPrice(quote);
    
    // CRITICAL: Log price extraction for debugging
    if (price === 0 && process.env.NODE_ENV === 'development') {
      console.warn('[convertQuoteToRFQFlight] ⚠️ Price is 0 after extraction:', {
        quoteId,
        quoteKeys: Object.keys(quote),
        sellerPrice: (quote as any).sellerPrice,
        pricing: (quote as any).pricing,
        totalPrice: (quote as any).totalPrice,
        total_price: (quote as any).total_price,
        price: (quote as any).price,
        rawQuote: quote,
      });
    }
    
    const rfqStatus = extractRFQStatus(quote);

    // If we have a price, ensure status is 'quoted'
    const finalStatus = price > 0 && rfqStatus === RFQStatus.UNANSWERED ? RFQStatus.QUOTED : rfqStatus;

    // Extract operator info
    const operatorName =
      quote.operator_name ||
      quote.operatorName ||
      quote.operator?.name ||
      'Unknown Operator';

    const operatorRating =
      quote.operator_rating || quote.operatorRating || quote.operator?.rating;

    const operatorEmail =
      quote.operator_email ||
      quote.operatorEmail ||
      quote.operator?.email ||
      quote.operator?.contact?.email;

    // Extract aircraft info
    const aircraftType =
      quote.aircraft_type ||
      quote.aircraftType ||
      quote.aircraft?.type ||
      quote.aircraft?.model ||
      'Unknown Aircraft';

    const tailNumber =
      quote.tail_number ||
      quote.tailNumber ||
      quote.aircraft?.registration ||
      quote.aircraft?.tail_number;

    const passengerCapacity =
      quote.passenger_capacity ||
      quote.passengerCapacity ||
      quote.aircraft?.capacity ||
      quote.capacity ||
      0;

    // Extract schedule info
    const departureTime =
      quote.departure_time || quote.departureTime || quote.schedule?.departureTime;

    const flightDuration =
      quote.flight_duration ||
      quote.flightDuration ||
      quote.schedule?.duration ||
      'TBD';

    // Extract amenities
    const rawAmenities = quote.amenities || quote.features || quote.aircraft?.amenities || [];
    const amenities: AircraftAmenities = {
      ...DEFAULT_AMENITIES,
      wifi: rawAmenities.includes('wifi') || rawAmenities.includes('Wi-Fi'),
      pets: rawAmenities.includes('pets'),
      smoking: rawAmenities.includes('smoking'),
      galley: rawAmenities.includes('galley'),
      lavatory: rawAmenities.includes('lavatory'),
      medical: rawAmenities.includes('medical'),
    };

    const flight: RFQFlight = {
      id: quoteId,
      quoteId,
      departureAirport: { icao: routeParts[0], name: routeParts[0] },
      arrivalAirport: { icao: routeParts[1], name: routeParts[1] },
      departureDate: date || new Date().toISOString().split('T')[0],
      departureTime,
      flightDuration,
      aircraftType,
      aircraftModel: aircraftType,
      tailNumber,
      passengerCapacity,
      operatorName,
      operatorRating,
      operatorEmail,
      totalPrice: price,
      currency,
      amenities,
      rfqStatus: finalStatus,
      lastUpdated: new Date().toISOString(),
      isSelected: false,
      validUntil: quote.valid_until || quote.validUntil,
      aircraftCategory: undefined,
      hasMedical: amenities.medical,
      hasPackage: false,
      sellerMessage: quote.sellerMessage || quote.notes,
      priceBreakdown: extractPriceBreakdown(quote),
    };

    return flight;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[RFQTransformer] Error converting quote to RFQFlight:', error, quote);
    }
    return null;
  }
}

/**
 * Convert an RFQ (without quotes) to RFQFlight format
 * Used when RFQs are returned from the API but don't have quotes yet
 *
 * @param rfq - The RFQ object from Avinode API
 * @param routeParts - Array of [departure, arrival] airport codes
 * @param date - Optional date string from chat
 * @returns RFQFlight object representing the RFQ
 */
export function convertRfqToRFQFlight(
  rfq: RFQItem,
  routeParts: RouteParts,
  date?: string
): RFQFlight {
  // Extract route from RFQ if available, otherwise use routeParts
  let departureIcao = routeParts[0];
  let arrivalIcao = routeParts[1];

  // Try to extract route from RFQ object
  const rfqAny = rfq as Record<string, unknown>;
  if (rfqAny.route) {
    if (typeof rfqAny.route === 'string') {
      // Route might be "KTEB → KVNY" or "KTEB-KVNY"
      const routeMatch = (rfqAny.route as string).match(
        /([A-Z0-9]{3,4})[→\-\s]+([A-Z0-9]{3,4})/i
      );
      if (routeMatch) {
        departureIcao = routeMatch[1].toUpperCase();
        arrivalIcao = routeMatch[2].toUpperCase();
      }
    } else if (typeof rfqAny.route === 'object') {
      const route = rfqAny.route as Record<string, unknown>;
      if (route.departure && route.arrival) {
        const dep = route.departure as AirportInfo | string;
        const arr = route.arrival as AirportInfo | string;
        departureIcao = (typeof dep === 'string' ? dep : dep.icao) || departureIcao;
        arrivalIcao = (typeof arr === 'string' ? arr : arr.icao) || arrivalIcao;
      }
    }
  }

  // Extract date from RFQ
  const departureDate =
    (rfqAny.departure_date as string) ||
    ((rfqAny.route as Record<string, unknown>)?.departure as Record<string, unknown>)?.date as string ||
    (rfqAny.created_at as string)?.split('T')[0] ||
    date ||
    new Date().toISOString().split('T')[0];

  // Determine RFQ status
  const status = rfq.status as string;
  const rfqStatus: RFQStatusType =
    status === 'sent' ? RFQStatus.SENT :
    status === 'unanswered' ? RFQStatus.UNANSWERED :
    status === 'quoted' ? RFQStatus.QUOTED :
    status === 'declined' ? RFQStatus.DECLINED :
    status === 'expired' ? RFQStatus.EXPIRED :
    RFQStatus.SENT;

  return {
    id: rfq.rfq_id || rfq.id || `rfq-${Date.now()}`,
    quoteId: rfq.rfq_id || rfq.id || `rfq-${Date.now()}`,
    departureAirport: { icao: departureIcao, name: departureIcao },
    arrivalAirport: { icao: arrivalIcao, name: arrivalIcao },
    departureDate,
    departureTime: (rfqAny.departure_time as string) || undefined,
    flightDuration: 'TBD',
    aircraftType: 'Aircraft TBD',
    aircraftModel: 'Aircraft TBD',
    passengerCapacity: (rfqAny.passengers as number) || 0,
    operatorName: 'Awaiting quotes',
    totalPrice: 0,
    currency: 'USD',
    amenities: DEFAULT_AMENITIES,
    rfqStatus,
    lastUpdated: (rfqAny.updated_at as string) || (rfqAny.created_at as string) || new Date().toISOString(),
    isSelected: false,
    validUntil:
      (rfqAny.quote_deadline as string) ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    aircraftCategory: 'TBD',
    hasMedical: false,
    hasPackage: false,
  };
}

/**
 * Merge quote details from get_quote results into RFQ flights
 *
 * @param flights - Array of RFQ flights
 * @param quoteDetailsMap - Map of quote ID to quote details
 * @returns Updated array of RFQ flights with merged data
 */
export function mergeQuoteDetailsIntoFlights(
  flights: RFQFlight[],
  quoteDetailsMap: QuoteDetailsMap
): RFQFlight[] {
  return flights.map((flight) => {
    // Try to find quote details by quoteId
    let quoteDetails = quoteDetailsMap[flight.quoteId];

    // If no direct match, try alternative matching
    if (!quoteDetails) {
      for (const [key, details] of Object.entries(quoteDetailsMap)) {
        const storedQuoteId = (details as Quote).quote_id || key;
        if (storedQuoteId === flight.quoteId || key === flight.quoteId) {
          quoteDetails = details;
          break;
        }
      }
    }

    if (!quoteDetails) {
      // If flight has price but status is unanswered, fix status
      if (flight.totalPrice > 0 && flight.rfqStatus === RFQStatus.UNANSWERED) {
        return { ...flight, rfqStatus: RFQStatus.QUOTED };
      }
      return flight;
    }

    // Extract new price from quote details
    const { price: newPrice, currency: newCurrency } = extractPrice(quoteDetails);

    // CRITICAL: Log when merging quote details for debugging
    if (process.env.NODE_ENV === 'development' && (newPrice === 0 || !newPrice)) {
      console.warn('[mergeQuoteDetailsIntoFlights] ⚠️ Price extraction failed during merge:', {
        flightId: flight.id,
        quoteId: flight.quoteId,
        existingPrice: flight.totalPrice,
        newPrice,
        quoteDetailsKeys: Object.keys(quoteDetails),
        sellerPrice: (quoteDetails as any).sellerPrice,
        pricing: (quoteDetails as any).pricing,
        totalPrice: (quoteDetails as any).totalPrice,
        rawQuoteDetails: quoteDetails,
      });
    }

    // Use new price if valid, otherwise keep existing
    const finalPrice =
      newPrice && newPrice > 0
        ? newPrice
        : flight.totalPrice > 0
          ? flight.totalPrice
          : 0;

    // Determine status - if we have a price, status must be 'quoted'
    let newStatus: RFQStatusType = flight.rfqStatus;
    if (finalPrice > 0) {
      newStatus = RFQStatus.QUOTED;
    } else {
      const detailsStatus = extractRFQStatus(quoteDetails);
      if (detailsStatus !== RFQStatus.UNANSWERED) {
        newStatus = detailsStatus;
      }
    }

    // Extract seller message
    const sellerMessage =
      quoteDetails.sellerMessage ||
      quoteDetails.notes ||
      flight.sellerMessage;

    return {
      ...flight,
      totalPrice: finalPrice,
      currency: newCurrency || flight.currency,
      rfqStatus: newStatus,
      sellerMessage,
      priceBreakdown: extractPriceBreakdown(quoteDetails) || flight.priceBreakdown,
      validUntil: quoteDetails.valid_until || quoteDetails.validUntil || flight.validUntil,
    };
  });
}

/**
 * Convert array of quotes to RFQFlight array
 */
export function convertQuotesToRFQFlights(
  quotes: Quote[],
  routeParts: RouteParts,
  date?: string
): RFQFlight[] {
  return quotes
    .map((quote) => convertQuoteToRFQFlight(quote, routeParts, date))
    .filter((flight): flight is RFQFlight => flight !== null);
}
