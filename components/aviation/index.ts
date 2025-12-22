/**
 * Aviation Components
 * Custom components for JetVision private jet booking application
 */

export { AircraftCard } from './aircraft-card';
export type { AircraftCardProps } from './aircraft-card';

// Re-export QuoteCard from consolidated location with FlatQuoteCard as the default
// The aviation QuoteCard used flat props pattern, now available as FlatQuoteCard
export {
  FlatQuoteCard as QuoteCard,
  type FlatQuoteCardProps as QuoteCardProps,
} from '@/components/quotes/quote-card';

export { FlightRoute } from './flight-route';
export type { FlightRouteProps } from './flight-route';

export { PriceDisplay } from './price-display';
export type { PriceDisplayProps } from './price-display';
