'use client';

/**
 * Quote Comparison Component
 * Side-by-side comparison of up to 3 quotes with feature matrix and visualizations
 * @module components/quotes/quote-comparison
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  CheckCircle2,
  XCircle,
  MinusCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Star,
  Shield,
  Plane,
  Users,
  Clock,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Quote } from './types';

interface QuoteComparisonProps {
  quotes: Quote[];
  maxQuotes?: number;
  onRemoveQuote?: (quoteId: string) => void;
  onSelectQuote?: (quoteId: string) => void;
  className?: string;
}

/**
 * Format currency
 */
const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format time
 */
const formatTime = (isoString: string): string => {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format duration
 */
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

/**
 * Get price difference indicator
 */
const getPriceDifference = (quote: Quote, baselinePrice: number): React.ReactNode => {
  const diff = quote.pricing.total - baselinePrice;
  const percentDiff = ((diff / baselinePrice) * 100).toFixed(1);

  if (diff === 0) {
    return <Badge variant="outline">Baseline</Badge>;
  }

  if (diff > 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <TrendingUp className="h-3 w-3" />
        +{percentDiff}%
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="gap-1 bg-green-500">
      <TrendingDown className="h-3 w-3" />
      {percentDiff}%
    </Badge>
  );
};

/**
 * Value indicator component
 */
const ValueIndicator: React.FC<{ quote: Quote; quotes: Quote[] }> = ({ quote, quotes }) => {
  // Calculate value score based on price vs quality
  const avgPrice = quotes.reduce((sum, q) => sum + q.pricing.total, 0) / quotes.length;
  const avgQuality = quotes.reduce((sum, q) => sum + q.scores.overall, 0) / quotes.length;

  const priceScore = (avgPrice / quote.pricing.total) * 100;
  const qualityScore = (quote.scores.overall / avgQuality) * 100;
  const valueScore = (priceScore + qualityScore) / 2;

  let label = 'Fair Value';
  let variant: 'default' | 'secondary' | 'outline' = 'outline';

  if (valueScore >= 110) {
    label = 'Best Value';
    variant = 'default';
  } else if (valueScore >= 90) {
    label = 'Good Value';
    variant = 'secondary';
  }

  return (
    <Badge variant={variant} className="gap-1">
      <DollarSign className="h-3 w-3" />
      {label}
    </Badge>
  );
};

/**
 * Quote Comparison Component
 */
export const QuoteComparison: React.FC<QuoteComparisonProps> = ({
  quotes,
  maxQuotes = 3,
  onRemoveQuote,
  onSelectQuote,
  className = '',
}) => {
  // Limit to max quotes
  const displayQuotes = quotes.slice(0, maxQuotes);

  // Baseline (cheapest) for price comparison
  const baselinePrice = useMemo(() => {
    return Math.min(...displayQuotes.map((q) => q.pricing.total));
  }, [displayQuotes]);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    const categories = ['Price', 'Safety', 'Quality', 'Rating', 'Availability'];
    return categories.map((category) => {
      const dataPoint: Record<string, string | number> = { category };
      displayQuotes.forEach((quote) => {
        switch (category) {
          case 'Price':
            dataPoint[quote.operator.name] = quote.scores.price;
            break;
          case 'Safety':
            dataPoint[quote.operator.name] = quote.scores.safety;
            break;
          case 'Quality':
            dataPoint[quote.operator.name] = quote.scores.aircraftQuality;
            break;
          case 'Rating':
            dataPoint[quote.operator.name] = quote.scores.operatorRating;
            break;
          case 'Availability':
            dataPoint[quote.operator.name] = quote.scores.availability;
            break;
        }
      });
      return dataPoint;
    });
  }, [displayQuotes]);

  // Prepare price comparison data
  const priceData = useMemo(() => {
    return displayQuotes.map((quote) => ({
      name: quote.operator.name,
      base: quote.pricing.basePrice,
      taxes: quote.pricing.taxes + quote.pricing.fees,
      total: quote.pricing.total,
    }));
  }, [displayQuotes]);

  // Get all unique features
  const allFeatures = useMemo(() => {
    const features = new Set<string>();
    displayQuotes.forEach((quote) => {
      quote.features.forEach((f) => features.add(f));
      quote.aircraft.amenities.forEach((a) => features.add(a));
    });
    return Array.from(features).sort();
  }, [displayQuotes]);

  if (displayQuotes.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-lg text-muted-foreground">
          Select quotes to compare (up to {maxQuotes})
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Quote Comparison</h2>
        <p className="text-sm text-muted-foreground">
          Comparing {displayQuotes.length} of {quotes.length} quotes
        </p>
      </div>

      {/* Quick Overview Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-${displayQuotes.length} gap-4`}>
        {displayQuotes.map((quote) => (
          <Card key={quote.id} className="relative">
            {onRemoveQuote && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => onRemoveQuote(quote.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={quote.operator.logo} alt={quote.operator.name} />
                  <AvatarFallback>{quote.operator.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{quote.operator.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{quote.aircraft.type}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {quote.rank && (
                <Badge variant={quote.rank === 1 ? 'default' : 'secondary'}>
                  Rank #{quote.rank}
                </Badge>
              )}
              {quote.recommended && (
                <Badge variant="default" className="gap-1">
                  <Award className="h-3 w-3" />
                  Recommended
                </Badge>
              )}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Price</span>
                  <span className="font-bold">
                    {formatCurrency(quote.pricing.total, quote.pricing.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">vs Cheapest</span>
                  {getPriceDifference(quote, baselinePrice)}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Score</span>
                <span className="font-semibold">{quote.scores.overall}/100</span>
              </div>
              <ValueIndicator quote={quote} quotes={displayQuotes} />
              {onSelectQuote && (
                <Button className="w-full mt-2" onClick={() => onSelectQuote(quote.id)}>
                  Select This Quote
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Score Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              {displayQuotes.map((quote, index) => (
                <Radar
                  key={quote.id}
                  name={quote.operator.name}
                  dataKey={quote.operator.name}
                  stroke={`hsl(${(index * 360) / displayQuotes.length}, 70%, 50%)`}
                  fill={`hsl(${(index * 360) / displayQuotes.length}, 70%, 50%)`}
                  fillOpacity={0.3}
                />
              ))}
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Price Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Price Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="base" stackId="a" fill="hsl(var(--primary))" name="Base Price" />
              <Bar dataKey="taxes" stackId="a" fill="hsl(var(--muted))" name="Taxes & Fees" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Feature Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Feature</TableHead>
                  {displayQuotes.map((quote) => (
                    <TableHead key={quote.id} className="text-center">
                      {quote.operator.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Basic Info */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold" colSpan={displayQuotes.length + 1}>
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      Aircraft Details
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Aircraft Model</TableCell>
                  {displayQuotes.map((quote) => (
                    <TableCell key={quote.id} className="text-center">
                      {quote.aircraft.model}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Year</TableCell>
                  {displayQuotes.map((quote) => (
                    <TableCell key={quote.id} className="text-center">
                      {quote.aircraft.year}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Capacity</TableCell>
                  {displayQuotes.map((quote) => (
                    <TableCell key={quote.id} className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3 w-3" />
                        {quote.aircraft.capacity}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Range</TableCell>
                  {displayQuotes.map((quote) => (
                    <TableCell key={quote.id} className="text-center">
                      {quote.aircraft.range.toLocaleString()} nm
                    </TableCell>
                  ))}
                </TableRow>

                {/* Flight Details */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold" colSpan={displayQuotes.length + 1}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Flight Information
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Departure Time</TableCell>
                  {displayQuotes.map((quote) => (
                    <TableCell key={quote.id} className="text-center">
                      {formatTime(quote.departureTime)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Arrival Time</TableCell>
                  {displayQuotes.map((quote) => (
                    <TableCell key={quote.id} className="text-center">
                      {formatTime(quote.arrivalTime)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Flight Duration</TableCell>
                  {displayQuotes.map((quote) => (
                    <TableCell key={quote.id} className="text-center">
                      {formatDuration(quote.flightDuration)}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Operator Details */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold" colSpan={displayQuotes.length + 1}>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Operator Information
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Operator Rating</TableCell>
                  {displayQuotes.map((quote) => (
                    <TableCell key={quote.id} className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {quote.operator.rating.toFixed(1)}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Total Flights</TableCell>
                  {displayQuotes.map((quote) => (
                    <TableCell key={quote.id} className="text-center">
                      {quote.operator.totalFlights.toLocaleString()}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Location</TableCell>
                  {displayQuotes.map((quote) => (
                    <TableCell key={quote.id} className="text-center">
                      {quote.operator.location}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Features */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold" colSpan={displayQuotes.length + 1}>
                    Features & Amenities
                  </TableCell>
                </TableRow>
                {allFeatures.map((feature) => (
                  <TableRow key={feature}>
                    <TableCell>{feature}</TableCell>
                    {displayQuotes.map((quote) => {
                      const hasFeature =
                        quote.features.includes(feature) ||
                        quote.aircraft.amenities.includes(feature);
                      return (
                        <TableCell key={quote.id} className="text-center">
                          {hasFeature ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pros & Cons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayQuotes.map((quote) => (
          <Card key={quote.id}>
            <CardHeader>
              <CardTitle className="text-base">{quote.operator.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.prosCons.pros.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-green-600">Pros</h4>
                  <ul className="space-y-1">
                    {quote.prosCons.pros.map((pro, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {quote.prosCons.cons.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-600">Cons</h4>
                  <ul className="space-y-1">
                    {quote.prosCons.cons.map((con, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <MinusCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuoteComparison;
