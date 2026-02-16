/**
 * Static gallery dataset for the aircraft gallery page.
 *
 * Uses web-relative image paths (served by Next.js from public/) rather than
 * the absolute filesystem paths returned by resolveAircraftImageUrl, which
 * are designed for server-side React PDF rendering.
 */

export interface GalleryAircraft {
  model: string;
  category: string;
  imageUrl: string;
  passengerCapacity: number;
  range: string;
  description: string;
}

export const GALLERY_AIRCRAFT: GalleryAircraft[] = [
  {
    model: 'Gulfstream G650',
    category: 'Heavy Jet',
    imageUrl: '/images/aircraft/heavy-jet.png',
    passengerCapacity: 16,
    range: '7,000 nmi',
    description:
      'Ultra-long-range heavy jet with spacious cabin and intercontinental range.',
  },
  {
    model: 'Bombardier Global 7500',
    category: 'Heavy Jet',
    imageUrl: '/images/aircraft/heavy-jet.png',
    passengerCapacity: 19,
    range: '7,700 nmi',
    description:
      'The largest purpose-built business jet with four living spaces.',
  },
  {
    model: 'Challenger 350',
    category: 'Large Jet',
    imageUrl: '/images/aircraft/large-jet.png',
    passengerCapacity: 10,
    range: '3,200 nmi',
    description:
      'Super-midsize jet offering coast-to-coast range with wide-cabin comfort.',
  },
  {
    model: 'Citation XLS+',
    category: 'Midsize Jet',
    imageUrl: '/images/aircraft/midsize-jet.png',
    passengerCapacity: 9,
    range: '2,100 nmi',
    description:
      'Best-selling midsize jet combining performance, comfort, and efficiency.',
  },
  {
    model: 'Phenom 300E',
    category: 'Light Jet',
    imageUrl: '/images/aircraft/light-jet.png',
    passengerCapacity: 8,
    range: '2,010 nmi',
    description:
      'Top-selling light jet with best-in-class speed and range.',
  },
  {
    model: 'King Air 350',
    category: 'Turboprop',
    imageUrl: '/images/aircraft/turboprop.png',
    passengerCapacity: 11,
    range: '1,806 nmi',
    description:
      'Versatile turboprop ideal for shorter routes and smaller airports.',
  },
];

/**
 * Filters gallery aircraft by category.
 *
 * @param category - The category to filter by (e.g. "Heavy Jet"). When omitted
 *                   or undefined, returns all aircraft.
 * @returns Array of matching GalleryAircraft entries.
 */
export function getAircraftByCategory(
  category?: string,
): GalleryAircraft[] {
  if (!category) return GALLERY_AIRCRAFT;
  return GALLERY_AIRCRAFT.filter((a) => a.category === category);
}
