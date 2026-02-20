'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Plane,
  Search,
  Bell,
  Settings,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Copy,
  Check,
  Sun,
  Moon,
  Menu,
  X,
  Mail,
  User,
  Calendar,
  MapPin,
  CreditCard,
  FileText,
  Send,
  Eye,
  Download,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FlightRequestStageBadge, FLIGHT_REQUEST_STAGES } from '@/components/flight-request-stage-badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({ code, lang = 'tsx' }: { code: string; lang?: string }) {
  return (
    <div className="relative rounded-lg border bg-neutral-950 text-neutral-100 text-xs overflow-x-auto">
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
          {lang}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="p-3 font-mono leading-relaxed whitespace-pre-wrap break-words">
        {code}
      </pre>
    </div>
  );
}

function SectionAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-20 text-xl font-bold tracking-tight flex items-center gap-2 group"
    >
      <a
        href={`#${id}`}
        className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Link to ${id}`}
      >
        #
      </a>
      {children}
    </h2>
  );
}

function SectionCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <SectionAnchor id={id}>{title}</SectionAnchor>
      {description && (
        <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
      )}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Color swatch
// ---------------------------------------------------------------------------

function ColorSwatch({
  name,
  hex,
  cssVar,
  className,
}: {
  name: string;
  hex: string;
  cssVar?: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`h-14 w-full rounded-lg border shadow-inner ${className ?? ''}`}
        style={!className ? { backgroundColor: hex } : undefined}
      />
      <div className="space-y-0.5">
        <p className="text-xs font-medium truncate">{name}</p>
        <p className="text-[10px] font-mono text-muted-foreground">{hex}</p>
        {cssVar && (
          <p className="text-[10px] font-mono text-muted-foreground truncate">
            {cssVar}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table of contents data
// ---------------------------------------------------------------------------

const TOC = [
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'spacing', label: 'Spacing' },
  { id: 'radius', label: 'Border Radius' },
  { id: 'shadows', label: 'Shadows' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'badges', label: 'Badges' },
  { id: 'avatars', label: 'Avatars' },
  { id: 'icons', label: 'Icons' },
  { id: 'cards', label: 'Cards' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'progress', label: 'Progress' },
  { id: 'tabs', label: 'Tabs' },
  { id: 'form-fields', label: 'Form Fields' },
  { id: 'dialogs', label: 'Dialogs' },
  { id: 'switches', label: 'Switches & Checks' },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function DesignSystemPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeSection, setActiveSection] = useState('colors');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track desktop breakpoint (lg = 1024px)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (e.matches) setMobileNav(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Observe sections for active highlighting
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { root: container, rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );
    for (const { id } of TOC) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
        {/* ---------------------------------------------------------------- */}
        {/* Top bar                                                         */}
        {/* ---------------------------------------------------------------- */}
        <header className="flex-none flex items-center justify-between border-b px-4 md:px-6 h-14 bg-card/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            {!isDesktop && (
              <button
                className="p-2 -ml-2 hover:bg-muted rounded-lg"
                onClick={() => setMobileNav(!mobileNav)}
                aria-label="Toggle navigation"
              >
                {mobileNav ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <Plane className="size-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-none">Jetvision</h1>
                <span className="text-[10px] text-muted-foreground tracking-wide uppercase">
                  Design System
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Label htmlFor="dark-toggle" className="text-xs hidden sm:flex">
              {darkMode ? (
                <Moon className="size-3.5 mr-1" />
              ) : (
                <Sun className="size-3.5 mr-1" />
              )}
              {darkMode ? 'Dark' : 'Light'}
            </Label>
            <Switch
              id="dark-toggle"
              checked={darkMode}
              onCheckedChange={setDarkMode}
              aria-label="Toggle dark mode"
            />
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile nav overlay */}
          {!isDesktop && mobileNav && (
            <button
              className="fixed inset-0 z-20 bg-black/30"
              onClick={() => setMobileNav(false)}
              aria-label="Close navigation"
            />
          )}

          {/* -------------------------------------------------------------- */}
          {/* Sidebar nav                                                    */}
          {/* -------------------------------------------------------------- */}
          <nav
            className="w-56 border-r bg-card overflow-y-auto flex-none"
            style={
              isDesktop
                ? { position: 'static' as const }
                : { position: 'fixed' as const, top: '3.5rem', bottom: 0, left: mobileNav ? 0 : '-14rem', zIndex: 30, transition: 'left 200ms ease' }
            }
          >
            <div className="p-4 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Contents
              </p>
              {TOC.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={() => setMobileNav(false)}
                  className={`block text-sm px-2.5 py-1.5 rounded-md transition-colors ${
                    activeSection === id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>

          {/* -------------------------------------------------------------- */}
          {/* Main content                                                   */}
          {/* -------------------------------------------------------------- */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-16">
              {/* ========================================================== */}
              {/* 1. COLORS                                                  */}
              {/* ========================================================== */}
              <SectionCard
                id="colors"
                title="Color Palette"
                description="Brand, semantic, and neutral colors from tokens.ts. Each scale runs 50-900/950."
              >
                {/* Brand - Sky Blue */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Primary &mdash; Sky Blue</h3>
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))' }}>
                    {[
                      { n: '50', h: '#e6f7fc' },
                      { n: '100', h: '#cceff9' },
                      { n: '200', h: '#99dff3' },
                      { n: '300', h: '#66cfed' },
                      { n: '400', h: '#33bfe7' },
                      { n: '500', h: '#00a8e8' },
                      { n: '600', h: '#0087ba' },
                      { n: '700', h: '#00658b' },
                      { n: '800', h: '#00445d' },
                      { n: '900', h: '#00222e' },
                    ].map((c) => (
                      <ColorSwatch key={c.n} name={c.n} hex={c.h} />
                    ))}
                  </div>
                </div>

                {/* Neutral */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Neutral</h3>
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(11, minmax(0, 1fr))' }}>
                    {[
                      { n: '50', h: '#f9fafb' },
                      { n: '100', h: '#f3f4f6' },
                      { n: '200', h: '#e5e7eb' },
                      { n: '300', h: '#d1d5db' },
                      { n: '400', h: '#9ca3af' },
                      { n: '500', h: '#6b7280' },
                      { n: '600', h: '#4b5563' },
                      { n: '700', h: '#374151' },
                      { n: '800', h: '#1f2937' },
                      { n: '900', h: '#111827' },
                      { n: '950', h: '#030712' },
                    ].map((c) => (
                      <ColorSwatch key={c.n} name={c.n} hex={c.h} />
                    ))}
                  </div>
                </div>

                {/* Semantic */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Semantic Colors</h3>
                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                    <div className="space-y-2">
                      <div className="h-10 rounded-lg bg-[#10b981]" />
                      <p className="text-xs font-medium">Success</p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        #10b981 / #34d399
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-10 rounded-lg bg-[#f59e0b]" />
                      <p className="text-xs font-medium">Warning</p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        #f59e0b / #fbbf24
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-10 rounded-lg bg-[#dc2626]" />
                      <p className="text-xs font-medium">Error</p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        #dc2626 / #f87171
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-10 rounded-lg bg-[#0891b2]" />
                      <p className="text-xs font-medium">Info</p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        #0891b2 / #22d3ee
                      </p>
                    </div>
                  </div>
                </div>

                {/* CSS Variables */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">CSS Variable Tokens</h3>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                    {[
                      { n: 'background', cls: 'bg-background border', hex: '#ffffff' },
                      { n: 'foreground', cls: 'bg-foreground', hex: 'oklch(0.25 0 0)' },
                      { n: 'primary', cls: 'bg-primary', hex: '#00a8e8' },
                      { n: 'secondary', cls: 'bg-secondary border', hex: 'transparent' },
                      { n: 'muted', cls: 'bg-muted border', hex: '#f9fafb' },
                      { n: 'destructive', cls: 'bg-destructive', hex: 'oklch(0.55 0.22 25)' },
                      { n: 'card', cls: 'bg-card border', hex: '#ffffff' },
                    ].map((v) => (
                      <div key={v.n} className="flex flex-col gap-1">
                        <div className={`h-10 rounded-lg ${v.cls}`} />
                        <p className="text-[10px] font-mono text-muted-foreground">
                          --{v.n}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {v.hex}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>

              {/* ========================================================== */}
              {/* 2. TYPOGRAPHY                                              */}
              {/* ========================================================== */}
              <SectionCard
                id="typography"
                title="Typography"
                description="Font families, responsive type scale, weights, and line heights."
              >
                {/* Families */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Font Families</h3>
                  <div className="grid gap-3">
                    <div className="p-4 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1 font-mono">
                        font-sans: Arial, sans-serif
                      </p>
                      <p className="text-lg font-sans">
                        The quick brown fox jumps over the lazy dog
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1 font-mono">
                        font-mono: &quot;Courier New&quot;, monospace
                      </p>
                      <p className="text-lg font-mono">
                        The quick brown fox jumps over the lazy dog
                      </p>
                    </div>
                  </div>
                </div>

                {/* Type scale */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Type Scale</h3>
                  <div className="space-y-4 overflow-x-auto">
                    {[
                      { label: 'Display XL', mobile: '2.5rem / 40px', desktop: '4rem / 64px', cls: 'text-4xl md:text-6xl' },
                      { label: 'Display LG', mobile: '2rem / 32px', desktop: '3rem / 48px', cls: 'text-3xl md:text-5xl' },
                      { label: 'Display MD', mobile: '1.75rem / 28px', desktop: '2.25rem / 36px', cls: 'text-2xl md:text-4xl' },
                      { label: 'H1', mobile: '2rem / 32px', desktop: '2.5rem / 40px', cls: 'text-3xl md:text-4xl' },
                      { label: 'H2', mobile: '1.75rem / 28px', desktop: '2rem / 32px', cls: 'text-2xl md:text-3xl' },
                      { label: 'H3', mobile: '1.5rem / 24px', desktop: '1.75rem / 28px', cls: 'text-xl md:text-2xl' },
                      { label: 'H4', mobile: '1.25rem / 20px', desktop: '1.5rem / 24px', cls: 'text-lg md:text-xl' },
                      { label: 'Body LG', mobile: '1.125rem / 18px', desktop: '—', cls: 'text-lg' },
                      { label: 'Body Base', mobile: '1rem / 16px', desktop: '—', cls: 'text-base' },
                      { label: 'Body SM', mobile: '0.875rem / 14px', desktop: '—', cls: 'text-sm' },
                      { label: 'Body XS', mobile: '0.75rem / 12px', desktop: '—', cls: 'text-xs' },
                    ].map((t) => (
                      <div
                        key={t.label}
                        className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 border-b pb-3"
                      >
                        <div className="flex-none w-28">
                          <span className="text-xs font-mono text-muted-foreground">
                            {t.label}
                          </span>
                        </div>
                        <div className="flex-none w-40 hidden md:block">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {t.mobile} &rarr; {t.desktop}
                          </span>
                        </div>
                        <p className={`${t.cls} font-semibold truncate`}>
                          Jetvision
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weights */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Font Weights</h3>
                  <div className="grid gap-2">
                    {[
                      { label: 'Normal (400)', cls: 'font-normal' },
                      { label: 'Medium (500)', cls: 'font-medium' },
                      { label: 'Semibold (600)', cls: 'font-semibold' },
                      { label: 'Bold (700)', cls: 'font-bold' },
                    ].map((w) => (
                      <div
                        key={w.label}
                        className="flex items-baseline gap-4 border-b pb-2"
                      >
                        <span className="text-xs font-mono text-muted-foreground w-32 flex-none">
                          {w.label}
                        </span>
                        <p className={`text-lg ${w.cls}`}>
                          Charter flight excellence
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Line heights */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Line Heights</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Tight (1.25)', cls: 'leading-tight' },
                      { label: 'Normal (1.5)', cls: 'leading-normal' },
                      { label: 'Relaxed (1.625)', cls: 'leading-relaxed' },
                    ].map((l) => (
                      <div key={l.label} className="p-3 rounded-lg border">
                        <p className="text-[10px] font-mono text-muted-foreground mb-2">
                          {l.label}
                        </p>
                        <p className={`text-sm ${l.cls}`}>
                          Private aviation demands precision. Every detail of the
                          passenger experience must meet the highest standards.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>

              {/* ========================================================== */}
              {/* 3. SPACING                                                 */}
              {/* ========================================================== */}
              <SectionCard
                id="spacing"
                title="Spacing Scale"
                description="Base 4px (0.25rem) spacing system for consistent layout."
              >
                <div className="space-y-1">
                  {[
                    { t: '1', v: '0.25rem / 4px' },
                    { t: '2', v: '0.5rem / 8px' },
                    { t: '3', v: '0.75rem / 12px' },
                    { t: '4', v: '1rem / 16px' },
                    { t: '5', v: '1.25rem / 20px' },
                    { t: '6', v: '1.5rem / 24px' },
                    { t: '8', v: '2rem / 32px' },
                    { t: '10', v: '2.5rem / 40px' },
                    { t: '12', v: '3rem / 48px' },
                    { t: '16', v: '4rem / 64px' },
                    { t: '20', v: '5rem / 80px' },
                    { t: '24', v: '6rem / 96px' },
                  ].map((s) => (
                    <div key={s.t} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-6 text-right flex-none">
                        {s.t}
                      </span>
                      <div
                        className="h-4 bg-primary/30 rounded-sm border border-primary/40"
                        style={{ width: `${parseFloat(s.v) * 16}px` }}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {s.v}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* ========================================================== */}
              {/* 4. BORDER RADIUS                                           */}
              {/* ========================================================== */}
              <SectionCard
                id="radius"
                title="Border Radius"
                description="Rounded corners for the modern aviation aesthetic."
              >
                <div className="flex flex-wrap gap-4">
                  {[
                    { label: 'sm', value: '~2px', cls: 'rounded-sm' },
                    { label: 'md', value: '~6px', cls: 'rounded-md' },
                    { label: 'lg', value: '8px', cls: 'rounded-lg' },
                    { label: 'xl', value: '~12px', cls: 'rounded-xl' },
                    { label: '2xl', value: '16px', cls: 'rounded-2xl' },
                    { label: 'full', value: '9999px', cls: 'rounded-full' },
                  ].map((r) => (
                    <div key={r.label} className="flex flex-col items-center gap-2">
                      <div
                        className={`size-16 bg-primary/20 border-2 border-primary ${r.cls}`}
                      />
                      <span className="text-xs font-mono">{r.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {r.value}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* ========================================================== */}
              {/* 5. SHADOWS                                                 */}
              {/* ========================================================== */}
              <SectionCard
                id="shadows"
                title="Shadows"
                description="Elevation system from xs to 2xl, plus primary brand shadow."
              >
                <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                  {[
                    { label: 'xs', cls: 'shadow-xs' },
                    { label: 'sm', cls: 'shadow-sm' },
                    { label: 'md', cls: 'shadow-md' },
                    { label: 'lg', cls: 'shadow-lg' },
                    { label: 'xl', cls: 'shadow-xl' },
                    { label: '2xl', cls: 'shadow-2xl' },
                  ].map((s) => (
                    <div key={s.label} className="flex flex-col items-center gap-2">
                      <div
                        className={`size-20 bg-card rounded-xl border ${s.cls}`}
                      />
                      <span className="text-xs font-mono">{s.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="size-20 bg-card rounded-xl"
                      style={{
                        boxShadow:
                          '0 10px 15px -3px rgb(0 168 232 / 0.2), 0 4px 6px -4px rgb(0 168 232 / 0.1)',
                      }}
                    />
                    <span className="text-xs font-mono">primary</span>
                  </div>
                </div>
              </SectionCard>

              {/* ========================================================== */}
              {/* 6. BUTTONS                                                 */}
              {/* ========================================================== */}
              <SectionCard
                id="buttons"
                title="Buttons"
                description="All button variants and sizes from the design system."
              >
                {/* Variants */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Variants</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="default">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                    <Button variant="success">Success</Button>
                    <Button variant="warning">Warning</Button>
                  </div>
                  <CodeBlock
                    code={`<Button variant="default">Primary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>`}
                  />
                </div>

                {/* Sizes */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Sizes</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="xl">Extra Large</Button>
                    <Button size="icon">
                      <Plus />
                    </Button>
                    <Button size="icon-sm" variant="outline">
                      <Edit3 />
                    </Button>
                    <Button size="icon-lg" variant="ghost">
                      <Settings />
                    </Button>
                  </div>
                </div>

                {/* With icons */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">With Icons</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button>
                      <Send className="size-4" />
                      Send Proposal
                    </Button>
                    <Button variant="outline">
                      <Download className="size-4" />
                      Download PDF
                    </Button>
                    <Button>
                      <Plane className="size-4" />
                      Book Flight
                    </Button>
                    <Button variant="destructive">
                      <Trash2 className="size-4" />
                      Cancel Trip
                    </Button>
                  </div>
                </div>

                {/* States */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">States</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button disabled>Disabled</Button>
                    <Button variant="outline" disabled>
                      Disabled Outline
                    </Button>
                  </div>
                </div>
              </SectionCard>

              {/* ========================================================== */}
              {/* 7. INPUTS                                                  */}
              {/* ========================================================== */}
              <SectionCard
                id="inputs"
                title="Inputs"
                description="Text inputs and textareas with size variants and states."
              >
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Sizes</h3>
                    <Input size="sm" placeholder="Small input" />
                    <Input placeholder="Default input" />
                    <Input size="lg" placeholder="Large input" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">States</h3>
                    <Input placeholder="Default" />
                    <Input placeholder="Disabled" disabled />
                    <Input
                      placeholder="Error state"
                      aria-invalid="true"
                      className="border-destructive"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Textarea</h3>
                  <Textarea placeholder="Enter your message..." />
                </div>
                <CodeBlock
                  code={`<Input size="sm" placeholder="Small" />
<Input placeholder="Default" />
<Input size="lg" placeholder="Large" />
<Textarea placeholder="Message..." />`}
                />
              </SectionCard>

              {/* ========================================================== */}
              {/* 8. BADGES                                                  */}
              {/* ========================================================== */}
              <SectionCard
                id="badges"
                title="Badges"
                description="Status indicators and labels with semantic color variants."
              >
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Primary</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="destructive">Error</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="info">Info</Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="success">
                    <CheckCircle2 className="size-3" />
                    Confirmed
                  </Badge>
                  <Badge variant="warning">
                    <AlertTriangle className="size-3" />
                    Pending
                  </Badge>
                  <Badge variant="destructive">
                    <XCircle className="size-3" />
                    Cancelled
                  </Badge>
                  <Badge variant="info">
                    <Info className="size-3" />
                    In Review
                  </Badge>
                </div>
                {/* Flight Request Stage Badges */}
                <div className="space-y-3 mt-4">
                  <h3 className="text-sm font-semibold">Flight Request Stages</h3>
                  <p className="text-xs text-muted-foreground">
                    10 lifecycle stages with tinted backgrounds and matching dark text. Uses oklch color space for perceptual uniformity.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FLIGHT_REQUEST_STAGES.map((stage) => (
                      <FlightRequestStageBadge key={stage} stage={stage} />
                    ))}
                  </div>
                </div>

                <CodeBlock
                  code={`{/* Standard variants */}
<Badge variant="success">
  <CheckCircle2 className="size-3" />
  Confirmed
</Badge>

{/* Flight request stage badge */}
import { FlightRequestStageBadge } from '@/components/flight-request-stage-badge';
<FlightRequestStageBadge stage="proposal_ready" />
<FlightRequestStageBadge stage="requesting_quotes" label="Quotes 3/5" />`}
                />
              </SectionCard>

              {/* ========================================================== */}
              {/* 9. AVATARS                                                 */}
              {/* ========================================================== */}
              <SectionCard
                id="avatars"
                title="Avatars"
                description="User avatars with fallback initials."
              >
                <div className="flex items-center gap-4">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">JV</AvatarFallback>
                  </Avatar>
                  <Avatar className="size-10">
                    <AvatarFallback className="text-sm">KB</AvatarFallback>
                  </Avatar>
                  <Avatar className="size-12">
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                  <Avatar className="size-14">
                    <AvatarFallback className="text-lg">KH</AvatarFallback>
                  </Avatar>
                  <Avatar className="size-16">
                    <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                      JG
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CodeBlock
                  code={`<Avatar className="size-12">
  <AvatarFallback>AB</AvatarFallback>
</Avatar>`}
                />
              </SectionCard>

              {/* ========================================================== */}
              {/* 10. ICONS                                                  */}
              {/* ========================================================== */}
              <SectionCard
                id="icons"
                title="Icons"
                description="Commonly used Lucide icons across the application."
              >
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                  {[
                    { Icon: Plane, name: 'Plane' },
                    { Icon: Search, name: 'Search' },
                    { Icon: Bell, name: 'Bell' },
                    { Icon: Settings, name: 'Settings' },
                    { Icon: Mail, name: 'Mail' },
                    { Icon: User, name: 'User' },
                    { Icon: Calendar, name: 'Calendar' },
                    { Icon: MapPin, name: 'MapPin' },
                    { Icon: CreditCard, name: 'CreditCard' },
                    { Icon: FileText, name: 'FileText' },
                    { Icon: Send, name: 'Send' },
                    { Icon: Eye, name: 'Eye' },
                    { Icon: Download, name: 'Download' },
                    { Icon: Plus, name: 'Plus' },
                    { Icon: Trash2, name: 'Trash2' },
                    { Icon: Edit3, name: 'Edit3' },
                    { Icon: ExternalLink, name: 'ExternalLink' },
                    { Icon: ArrowRight, name: 'ArrowRight' },
                    { Icon: CheckCircle2, name: 'CheckCircle2' },
                    { Icon: AlertTriangle, name: 'AlertTriangle' },
                    { Icon: XCircle, name: 'XCircle' },
                    { Icon: Info, name: 'Info' },
                    { Icon: ChevronRight, name: 'ChevronRight' },
                    { Icon: Copy, name: 'Copy' },
                  ].map(({ Icon, name }) => (
                    <div
                      key={name}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Icon className="size-5 text-muted-foreground" />
                      <span className="text-[10px] font-mono text-muted-foreground truncate">
                        {name}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* ========================================================== */}
              {/* 11. CARDS                                                  */}
              {/* ========================================================== */}
              <SectionCard
                id="cards"
                title="Cards"
                description="Card layouts with header, content, and footer slots."
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Flight Quote</CardTitle>
                      <CardDescription>
                        KTEB &rarr; KLAX &middot; Citation X
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Operator Cost
                          </span>
                          <span className="font-medium">$24,500</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Service Fee
                          </span>
                          <span className="font-medium">$2,450</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>$26,950</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="gap-2">
                      <Button size="sm" className="flex-1">
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        Decline
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Trip Summary</CardTitle>
                      <CardDescription>Round-trip &middot; 2 legs</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Plane className="size-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">KTEB &rarr; KLAX</p>
                            <p className="text-xs text-muted-foreground">
                              Feb 15 &middot; 08:00
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="size-8 rounded-full bg-accent/10 flex items-center justify-center">
                            <Plane className="size-4 text-accent rotate-180" />
                          </div>
                          <div>
                            <p className="font-medium">KLAX &rarr; KTEB</p>
                            <p className="text-xs text-muted-foreground">
                              Feb 20 &middot; 14:00
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Badge variant="success">
                        <CheckCircle2 className="size-3" />
                        Confirmed
                      </Badge>
                    </CardFooter>
                  </Card>
                </div>
                <CodeBlock
                  code={`<Card>
  <CardHeader>
    <CardTitle>Flight Quote</CardTitle>
    <CardDescription>KTEB → KLAX</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>
    <Button size="sm">Accept</Button>
  </CardFooter>
</Card>`}
                />
              </SectionCard>

              {/* ========================================================== */}
              {/* 12. ALERTS                                                 */}
              {/* ========================================================== */}
              <SectionCard
                id="alerts"
                title="Alerts"
                description="Contextual feedback messages with icon support."
              >
                <div className="space-y-3">
                  <Alert>
                    <Info className="size-4" />
                    <AlertTitle>Information</AlertTitle>
                    <AlertDescription>
                      Your flight request has been submitted for review.
                    </AlertDescription>
                  </Alert>
                  <Alert variant="destructive">
                    <XCircle className="size-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      Unable to connect to Avinode. Please try again.
                    </AlertDescription>
                  </Alert>
                </div>
                <CodeBlock
                  code={`<Alert>
  <Info className="size-4" />
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>Message here.</AlertDescription>
</Alert>`}
                />
              </SectionCard>

              {/* ========================================================== */}
              {/* 13. PROGRESS                                               */}
              {/* ========================================================== */}
              <SectionCard
                id="progress"
                title="Progress"
                description="Progress bars with semantic color variants."
              >
                <div className="space-y-4">
                  {[
                    { label: 'Default', variant: 'default' as const, value: 60 },
                    { label: 'Success', variant: 'success' as const, value: 100 },
                    { label: 'Warning', variant: 'warning' as const, value: 45 },
                    { label: 'Destructive', variant: 'destructive' as const, value: 20 },
                  ].map((p) => (
                    <div key={p.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{p.label}</span>
                        <span className="text-muted-foreground">{p.value}%</span>
                      </div>
                      <Progress variant={p.variant} value={p.value} />
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* ========================================================== */}
              {/* 14. TABS                                                   */}
              {/* ========================================================== */}
              <SectionCard
                id="tabs"
                title="Tabs"
                description="Navigation tabs for organizing content sections."
              >
                <Tabs defaultValue="flights">
                  <TabsList>
                    <TabsTrigger value="flights">Flights</TabsTrigger>
                    <TabsTrigger value="quotes">Quotes</TabsTrigger>
                    <TabsTrigger value="contracts">Contracts</TabsTrigger>
                  </TabsList>
                  <TabsContent value="flights" className="mt-3">
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">
                          Active flight requests and trip management.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="quotes" className="mt-3">
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">
                          Received quotes from operators awaiting review.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="contracts" className="mt-3">
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">
                          Signed contracts and payment tracking.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
                <CodeBlock
                  code={`<Tabs defaultValue="flights">
  <TabsList>
    <TabsTrigger value="flights">Flights</TabsTrigger>
    <TabsTrigger value="quotes">Quotes</TabsTrigger>
  </TabsList>
  <TabsContent value="flights">...</TabsContent>
</Tabs>`}
                />
              </SectionCard>

              {/* ========================================================== */}
              {/* 15. FORM FIELDS                                            */}
              {/* ========================================================== */}
              <SectionCard
                id="form-fields"
                title="Form Fields"
                description="Label + Input compositions with validation states."
              >
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="demo-name">Full Name</Label>
                      <Input
                        id="demo-name"
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-email">Email Address</Label>
                      <Input
                        id="demo-email"
                        type="email"
                        placeholder="john@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-airport">Departure Airport</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="demo-airport"
                          placeholder="KTEB"
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="demo-error" className="text-destructive">
                        Phone (required)
                      </Label>
                      <Input
                        id="demo-error"
                        placeholder="+1 (555) 000-0000"
                        aria-invalid="true"
                        className="border-destructive"
                      />
                      <p className="text-xs text-destructive">
                        Phone number is required.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-disabled">Company (disabled)</Label>
                      <Input
                        id="demo-disabled"
                        value="Jetvision Group"
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-notes">Notes</Label>
                      <Textarea
                        id="demo-notes"
                        placeholder="Special requirements..."
                        className="min-h-[72px]"
                      />
                    </div>
                  </div>
                </div>
                <CodeBlock
                  code={`<div className="space-y-2">
  <Label htmlFor="name">Full Name</Label>
  <Input id="name" placeholder="John Smith" />
</div>

{/* With icon */}
<div className="relative">
  <MapPin className="absolute left-3 top-1/2 ..." />
  <Input placeholder="KTEB" className="pl-9" />
</div>`}
                />
              </SectionCard>

              {/* ========================================================== */}
              {/* 16. DIALOGS                                                */}
              {/* ========================================================== */}
              <SectionCard
                id="dialogs"
                title="Dialogs"
                description="Modal dialogs for confirmations and forms."
              >
                <div className="flex flex-wrap gap-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Open Dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Booking</DialogTitle>
                        <DialogDescription>
                          You are about to confirm the flight KTEB &rarr; KLAX on
                          Feb 15, 2026. This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Confirm</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive">Delete Trip</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Trip?</DialogTitle>
                        <DialogDescription>
                          This will permanently delete the trip and all associated
                          quotes. This action is irreversible.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline">Keep Trip</Button>
                        <Button variant="destructive">
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <CodeBlock
                  code={`<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`}
                />
              </SectionCard>

              {/* ========================================================== */}
              {/* 17. SWITCHES & CHECKBOXES                                  */}
              {/* ========================================================== */}
              <SectionCard
                id="switches"
                title="Switches & Checkboxes"
                description="Toggle controls for binary options."
              >
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Switches</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Switch id="sw-1" defaultChecked />
                        <Label htmlFor="sw-1">Email notifications</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch id="sw-2" />
                        <Label htmlFor="sw-2">SMS alerts</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch id="sw-3" disabled />
                        <Label htmlFor="sw-3" className="opacity-50">
                          Disabled
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Checkboxes</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Checkbox id="cb-1" defaultChecked />
                        <Label htmlFor="cb-1">Accept terms</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox id="cb-2" />
                        <Label htmlFor="cb-2">Subscribe to updates</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox id="cb-3" disabled />
                        <Label htmlFor="cb-3" className="opacity-50">
                          Disabled
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
                <CodeBlock
                  code={`<div className="flex items-center gap-3">
  <Switch id="notif" defaultChecked />
  <Label htmlFor="notif">Notifications</Label>
</div>

<div className="flex items-center gap-3">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms</Label>
</div>`}
                />
              </SectionCard>

              {/* Footer */}
              <footer className="border-t pt-8 pb-16 text-center">
                <p className="text-xs text-muted-foreground">
                  Jetvision Design System &middot; Built with Next.js, Tailwind
                  CSS, Radix UI &middot; Tokens from{' '}
                  <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                    lib/design-system/tokens.ts
                  </code>
                </p>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
