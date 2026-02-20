'use client';

/**
 * Aircraft Gallery Page
 *
 * Showcases available aircraft categories with specifications.
 * Data sourced from lib/aircraft/gallery-data.ts.
 *
 * @see ONEK-281
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { GALLERY_AIRCRAFT, type GalleryAircraft } from '@/lib/aircraft/gallery-data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Users, MapPin } from 'lucide-react';

const CATEGORIES = ['All', ...Array.from(new Set(GALLERY_AIRCRAFT.map((a) => a.category)))];

function AircraftGalleryCard({ aircraft }: { aircraft: GalleryAircraft }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 bg-muted">
        <Image
          src={aircraft.imageUrl}
          alt={aircraft.model}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <Badge className="absolute top-3 left-3" variant="secondary">
          {aircraft.category}
        </Badge>
      </div>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-lg text-foreground">{aircraft.model}</h3>
        <p className="text-sm text-muted-foreground">{aircraft.description}</p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {aircraft.passengerCapacity} pax
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {aircraft.range}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered =
    activeCategory === 'All'
      ? GALLERY_AIRCRAFT
      : GALLERY_AIRCRAFT.filter((a) => a.category === activeCategory);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Plane className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Aircraft Gallery</h1>
        </div>
        <p className="text-muted-foreground">
          Browse our fleet of private jets and turboprops available for charter.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((aircraft) => (
          <AircraftGalleryCard key={aircraft.model} aircraft={aircraft} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No aircraft found in this category.
        </div>
      )}
    </div>
  );
}
