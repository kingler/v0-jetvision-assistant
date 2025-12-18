'use client';

/**
 * Quote Grid Component
 * Displays quotes in grid or list view with filtering and sorting capabilities
 * @module components/quotes/quote-grid
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid3x3,
  List,
  Filter,
  SlidersHorizontal,
  X,
  Search,
  TrendingDown,
  Zap,
  DollarSign,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { QuoteCard } from './quote-card';
import type {
  Quote,
  QuoteAction,
  QuoteFilters,
  QuoteSortOption,
  QuoteViewMode,
  QuickFilterPreset,
  QuoteStats,
} from './types';

interface QuoteGridProps {
  quotes: Quote[];
  onQuoteAction?: (action: QuoteAction, quote: Quote) => void;
  selectedQuotes?: string[];
  showComparison?: boolean;
  className?: string;
}

/**
 * Calculate quote statistics
 */
const calculateStats = (quotes: Quote[]): QuoteStats => {
  if (quotes.length === 0) {
    return {
      total: 0,
      averagePrice: 0,
      priceRange: [0, 0],
      averageRating: 0,
      recommendedCount: 0,
    };
  }

  const prices = quotes.map((q) => q.pricing.total);
  const ratings = quotes.map((q) => q.scores.overall);

  return {
    total: quotes.length,
    averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
    priceRange: [Math.min(...prices), Math.max(...prices)],
    averageRating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
    recommendedCount: quotes.filter((q) => q.recommended).length,
  };
};

/**
 * Apply filters to quotes
 */
const applyFilters = (quotes: Quote[], filters: QuoteFilters): Quote[] => {
  return quotes.filter((quote) => {
    // Price range
    if (
      quote.pricing.total < filters.priceRange[0] ||
      quote.pricing.total > filters.priceRange[1]
    ) {
      return false;
    }

    // Aircraft types
    if (
      filters.aircraftTypes.length > 0 &&
      !filters.aircraftTypes.includes(quote.aircraft.type)
    ) {
      return false;
    }

    // Operator rating
    if (quote.operator.rating < filters.operatorRating) {
      return false;
    }

    // Min capacity
    if (filters.minCapacity && quote.aircraft.capacity < filters.minCapacity) {
      return false;
    }

    return true;
  });
};

/**
 * Apply sorting to quotes
 */
const applySorting = (quotes: Quote[], sortOption: QuoteSortOption): Quote[] => {
  const sorted = [...quotes];

  switch (sortOption) {
    case 'price-asc':
      return sorted.sort((a, b) => a.pricing.total - b.pricing.total);
    case 'price-desc':
      return sorted.sort((a, b) => b.pricing.total - a.pricing.total);
    case 'rating-asc':
      return sorted.sort((a, b) => a.scores.overall - b.scores.overall);
    case 'rating-desc':
      return sorted.sort((a, b) => b.scores.overall - a.scores.overall);
    case 'departure-asc':
      return sorted.sort(
        (a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
      );
    case 'departure-desc':
      return sorted.sort(
        (a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime()
      );
    case 'recommended':
      return sorted.sort((a, b) => {
        if (a.recommended && !b.recommended) return -1;
        if (!a.recommended && b.recommended) return 1;
        return b.scores.overall - a.scores.overall;
      });
    default:
      return sorted;
  }
};

/**
 * Quote Grid Component
 */
export const QuoteGrid: React.FC<QuoteGridProps> = ({
  quotes,
  onQuoteAction,
  selectedQuotes = [],
  showComparison = true,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<QuoteViewMode>('grid');
  const [sortOption, setSortOption] = useState<QuoteSortOption>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Calculate initial price range
  const initialPriceRange = useMemo(() => {
    if (quotes.length === 0) return [0, 100000];
    const prices = quotes.map((q) => q.pricing.total);
    return [Math.min(...prices), Math.max(...prices)];
  }, [quotes]);

  const [filters, setFilters] = useState<QuoteFilters>({
    priceRange: initialPriceRange,
    aircraftTypes: [],
    departureTimeRange: ['', ''],
    operatorRating: 0,
  });

  // Get unique aircraft types
  const aircraftTypes = useMemo(() => {
    return Array.from(new Set(quotes.map((q) => q.aircraft.type)));
  }, [quotes]);

  // Apply search, filters, and sorting
  const filteredAndSortedQuotes = useMemo(() => {
    let result = [...quotes];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (q) =>
          q.operator.name.toLowerCase().includes(query) ||
          q.aircraft.type.toLowerCase().includes(query) ||
          q.aircraft.model.toLowerCase().includes(query)
      );
    }

    // Filters
    result = applyFilters(result, filters);

    // Sorting
    result = applySorting(result, sortOption);

    return result;
  }, [quotes, searchQuery, filters, sortOption]);

  const stats = useMemo(() => calculateStats(filteredAndSortedQuotes), [filteredAndSortedQuotes]);

  // Quick filter handlers
  const applyQuickFilter = (preset: QuickFilterPreset) => {
    switch (preset) {
      case 'best-value':
        setSortOption('recommended');
        break;
      case 'fastest':
        setSortOption('departure-asc');
        break;
      case 'cheapest':
        setSortOption('price-asc');
        break;
      case 'highest-rated':
        setSortOption('rating-desc');
        break;
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      priceRange: initialPriceRange,
      aircraftTypes: [],
      departureTimeRange: ['', ''],
      operatorRating: 0,
    });
    setSearchQuery('');
  };

  // Toggle aircraft type filter
  const toggleAircraftType = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      aircraftTypes: prev.aircraftTypes.includes(type)
        ? prev.aircraftTypes.filter((t) => t !== type)
        : [...prev.aircraftTypes, type],
    }));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Available Quotes</h2>
          <p className="text-sm text-muted-foreground">
            Showing {filteredAndSortedQuotes.length} of {quotes.length} quotes
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Average Price</p>
          <p className="text-2xl font-bold">
            ${Math.round(stats.averagePrice).toLocaleString()}
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Price Range</p>
          <p className="text-2xl font-bold">
            ${Math.round(stats.priceRange[0] / 1000)}k - ${Math.round(stats.priceRange[1] / 1000)}k
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Avg Rating</p>
          <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}/100</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Recommended</p>
          <p className="text-2xl font-bold">{stats.recommendedCount}</p>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyQuickFilter('best-value')}
          className="gap-2"
        >
          <TrendingDown className="h-4 w-4" />
          Best Value
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyQuickFilter('fastest')}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          Fastest
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyQuickFilter('cheapest')}
          className="gap-2"
        >
          <DollarSign className="h-4 w-4" />
          Cheapest
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyQuickFilter('highest-rated')}
          className="gap-2"
        >
          <Star className="h-4 w-4" />
          Highest Rated
        </Button>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by operator, aircraft..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortOption} onValueChange={(value) => setSortOption(value as QuoteSortOption)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recommended">Recommended</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
            <SelectItem value="rating-asc">Rating: Low to High</SelectItem>
            <SelectItem value="rating-desc">Rating: High to Low</SelectItem>
            <SelectItem value="departure-asc">Departure: Earliest</SelectItem>
            <SelectItem value="departure-desc">Departure: Latest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filter Sidebar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </h3>
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              <Separator />

              {/* Price Range */}
              <div className="space-y-3">
                <Label>Price Range</Label>
                <div className="px-2">
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, priceRange: value as [number, number] }))
                    }
                    min={initialPriceRange[0]}
                    max={initialPriceRange[1]}
                    step={1000}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>${filters.priceRange[0].toLocaleString()}</span>
                  <span>${filters.priceRange[1].toLocaleString()}</span>
                </div>
              </div>

              <Separator />

              {/* Aircraft Types */}
              <div className="space-y-3">
                <Label>Aircraft Type</Label>
                <div className="space-y-2">
                  {aircraftTypes.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`aircraft-${type}`}
                        checked={filters.aircraftTypes.includes(type)}
                        onCheckedChange={() => toggleAircraftType(type)}
                      />
                      <label
                        htmlFor={`aircraft-${type}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Operator Rating */}
              <div className="space-y-3">
                <Label>Minimum Operator Rating</Label>
                <div className="px-2">
                  <Slider
                    value={[filters.operatorRating]}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, operatorRating: value[0] }))
                    }
                    min={0}
                    max={5}
                    step={0.5}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Any</span>
                  <span>{filters.operatorRating.toFixed(1)} stars</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quotes Grid/List */}
      {filteredAndSortedQuotes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No quotes found</p>
          <Button variant="outline" className="mt-4" onClick={resetFilters}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'flex flex-col gap-4'
          }
        >
          <AnimatePresence mode="popLayout">
            {filteredAndSortedQuotes.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onAction={onQuoteAction}
                isSelected={selectedQuotes.includes(quote.id)}
                showComparison={showComparison}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default QuoteGrid;
