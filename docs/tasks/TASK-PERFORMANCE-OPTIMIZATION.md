# TASK: Performance Optimization

**Priority**: Medium
**Status**: Backlog
**Team**: One Kaleidoscope
**Project**: Jetvision MAS
**Labels**: `performance`, `optimization`, `build`
**Assignee**: @kingler

---

## Description

Review and optimize Next.js build configuration, bundle size, and runtime performance to ensure optimal application performance.

## Context

The Performance Review check in CI is failing, indicating potential issues with:
- Build configuration
- Bundle size
- Dependency optimization
- Runtime performance

This task aims to identify and resolve performance bottlenecks.

---

## Tasks

### 1. Next.js Build Configuration Review

- [ ] Review `next.config.mjs` configuration
- [ ] Enable production optimizations
- [ ] Configure code splitting strategy
- [ ] Review image optimization settings
- [ ] Configure font optimization
- [ ] Review webpack configuration (if customized)

**Files to review**:
- `next.config.mjs` - Main Next.js configuration
- `tsconfig.json` - TypeScript compiler options
- `tailwind.config.ts` - Tailwind CSS configuration

### 2. Bundle Size Analysis

- [ ] Run bundle analyzer to identify large dependencies
- [ ] Review and remove unused dependencies
- [ ] Identify opportunities for code splitting
- [ ] Review dynamic imports usage
- [ ] Analyze client vs server bundle sizes

**Commands**:
```bash
# Analyze bundle size
pnpm run build
pnpm dlx @next/bundle-analyzer

# Check for unused dependencies
pnpm dlx depcheck
```

### 3. Dependency Optimization

Review and optimize these dependency categories:

#### UI Libraries
- [ ] Review Radix UI usage - ensure tree-shaking
- [ ] Check if all imported Radix components are used
- [ ] Consider lazy loading UI components

#### Agent Dependencies
- [ ] Review OpenAI SDK bundle size
- [ ] Check BullMQ and ioredis usage
- [ ] Optimize agent imports (use barrel exports carefully)

#### MCP Dependencies
- [ ] Review @modelcontextprotocol/sdk size
- [ ] Check googleapis bundle impact
- [ ] Optimize Google Auth library usage

#### Monitoring & Analytics
- [ ] Review @sentry/nextjs configuration
- [ ] Optimize Sentry init and sampling
- [ ] Review Vercel Analytics impact

### 4. Build Performance Improvements

- [ ] Configure incremental builds
- [ ] Optimize TypeScript compilation
- [ ] Review ESLint performance
- [ ] Configure parallel builds where possible
- [ ] Add build caching in CI

**CI Optimization** (`.github/workflows/`):
```yaml
- name: Cache Next.js build
  uses: actions/cache@v3
  with:
    path: |
      .next/cache
      node_modules/.cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}
```

### 5. Runtime Performance

- [ ] Review API route performance
- [ ] Optimize database queries
- [ ] Add request caching where appropriate
- [ ] Review React rendering performance
- [ ] Add performance monitoring

### 6. Fix Performance Review CI Check

Update `.github/workflows/code-review.yml`:

- [ ] Fix build output check (`du -sh .next/`)
- [ ] Configure depcheck to pass
- [ ] Add performance budget checks
- [ ] Configure bundle size limits

**Current failing step**:
```yaml
- name: Analyze Bundle Size
  run: |
    echo "📦 Bundle size analysis..."
    du -sh .next/ 2>/dev/null || echo "Build output not found"
    pnpm dlx depcheck
  continue-on-error: true
```

**Improved version**:
```yaml
- name: Analyze Bundle Size
  run: |
    echo "📦 Bundle size analysis..."
    if [ -d ".next" ]; then
      echo "Build output size:"
      du -sh .next/
      echo "\nStatic pages:"
      du -sh .next/static/
    else
      echo "⚠️ No build output found - build may have failed"
      exit 1
    fi

- name: Check Unused Dependencies
  run: pnpm dlx depcheck --ignores="@types/*,eslint-*,@tailwindcss/*"
  continue-on-error: false
```

---

## Acceptance Criteria

- ✅ Build completes successfully in CI
- ✅ Bundle size within acceptable limits (<500KB initial JS)
- ✅ No unused dependencies
- ✅ Performance Review CI check passes
- ✅ Build time improved by at least 10%
- ✅ Lighthouse score >90 for performance
- ✅ No performance regressions

---

## Performance Budget

**Initial Page Load**:
- Total JS: <500KB
- Total CSS: <100KB
- First Contentful Paint (FCP): <1.5s
- Time to Interactive (TTI): <3s
- Largest Contentful Paint (LCP): <2.5s

**Build Performance**:
- Build time: <3 minutes
- Type check: <30 seconds
- Lint: <20 seconds

---

## Tools & Metrics

**Analysis Tools**:
- Next.js Bundle Analyzer
- Lighthouse
- Chrome DevTools Performance
- depcheck
- bundle-analyzer

**Monitoring**:
- Vercel Analytics (already integrated)
- Sentry Performance Monitoring
- Web Vitals tracking

---

## Current Dependency Sizes

**Top Dependencies** (estimate):
1. `@radix-ui/*` packages - Multiple UI components
2. `@supabase/supabase-js` - Database client
3. `openai` - AI SDK
4. `googleapis` - Google API client
5. `@sentry/nextjs` - Error monitoring

**Review Priority**:
1. Ensure tree-shaking for all libraries
2. Use dynamic imports for heavy dependencies
3. Split MCP server code from client bundles
4. Optimize agent code loading

---

## Configuration Files to Review

### next.config.mjs
```javascript
// Recommended optimizations
const nextConfig = {
  // Enable SWC minification
  swcMinify: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Bundle analyzer (development only)
  webpack: (config, { dev }) => {
    if (!dev) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      )
    }
    return config
  },
}
```

### package.json Scripts
Add performance analysis scripts:
```json
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "build:profile": "next build --profile",
    "perf:check": "pnpm dlx depcheck && pnpm run build"
  }
}
```

---

## Implementation Steps

### Phase 1: Analysis (2 hours)
1. Run bundle analyzer
2. Identify large dependencies
3. Check for unused code
4. Document current metrics

### Phase 2: Quick Wins (3 hours)
1. Remove unused dependencies
2. Add dynamic imports
3. Configure tree-shaking
4. Update build configuration

### Phase 3: Deep Optimization (4 hours)
1. Optimize component loading
2. Implement code splitting
3. Add build caching
4. Optimize CI pipeline

### Phase 4: Validation (1 hour)
1. Run performance tests
2. Verify CI passes
3. Check Lighthouse scores
4. Document improvements

---

## Expected Improvements

**Build Time**:
- Current: ~5-6 minutes (estimated)
- Target: ~3 minutes

**Bundle Size**:
- Current: Unknown (build failing)
- Target: <500KB initial JS

**CI Performance Review**:
- Current: FAILING
- Target: PASSING

---

## Estimated Effort

**Total**: 10 hours (1-2 days)

---

## References

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Bundle Analysis](https://nextjs.org/docs/app/building-your-application/optimizing/bundle-analyzer)
- [Web Vitals](https://web.dev/vitals/)
- [Performance Budget Calculator](https://www.performancebudget.io/)

---

## Related Issues

- Fixes Performance Review CI failures
- Improves developer experience (faster builds)
- Reduces production bundle size
- Enhances user experience (faster page loads)

---

**Created**: 2025-11-08
**Context**: Post-PR #22 merge follow-up
**Impact**: Medium - Affects CI reliability and production performance
