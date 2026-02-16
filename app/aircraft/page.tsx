'use client';

import React, { useState } from 'react';
import {
  GALLERY_AIRCRAFT,
  getAircraftByCategory,
} from '@/lib/aircraft/gallery-data';

const CATEGORIES = [
  'All',
  'Heavy Jet',
  'Large Jet',
  'Midsize Jet',
  'Light Jet',
  'Turboprop',
];

/**
 * Aircraft Gallery Page
 *
 * Displays charter aircraft organized by category with interactive filtering.
 * Accessible at /aircraft.
 */
export default function AircraftGalleryPage(): React.JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const aircraft =
    selectedCategory === 'All'
      ? GALLERY_AIRCRAFT
      : getAircraftByCategory(selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Aircraft Gallery
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Explore our fleet of premium charter aircraft
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Aircraft Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {aircraft.map((item) => (
            <div
              key={item.model}
              className="overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Image */}
              <div className="aspect-[3/1] w-full bg-muted">
                <img
                  src={item.imageUrl}
                  alt={item.model}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    {item.model}
                  </h3>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {item.category}
                  </span>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">
                  {item.description}
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{item.passengerCapacity} passengers</span>
                  <span>{item.range} range</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {aircraft.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No aircraft found in this category.
          </div>
        )}
      </div>
    </div>
  );
}
